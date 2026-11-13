import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';

// Mapa 3D con el relieve real (Terrain Tiles de AWS/Mapzen, preparado con tools/terrain.py).
// Unidades del mundo: kilómetros. Altura exagerada para que se lea el relieve.

export interface TerrainMeta {
  bbox: { west: number; east: number; north: number; south: number };
  elevMin: number;
  elevMax: number;
  sizeKm: [number, number];
  height: [number, number];
  mercator: { z: number; x0: number; y0: number; px0: number; py0: number; px1: number; py1: number };
  trails: Record<string, [number, number][]>;
}

const EXAG = 1.35;
const LIFT = 0.018; // km sobre el suelo para rutas

function softwareGL(r: THREE.WebGLRenderer) {
  const gl = r.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  return /swiftshader|llvmpipe|softpipe|software/i.test(name);
}

export class Terrain3D {
  meta!: TerrainMeta;
  renderer!: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.05, 220);
  controls!: OrbitControls;
  private heights!: Float32Array;
  private hw = 0;
  private hh = 0;
  private W = 1;
  private H = 1;
  private needs = true;
  private visible = false;
  private flying: gsap.core.Tween | null = null;
  private trails = new Map<string, THREE.Mesh>();
  private route: THREE.Mesh | null = null;
  onRender?: () => void;

  constructor(readonly host: HTMLElement, private reduced: boolean) {}

  /** Devuelve false si no hay WebGL con GPU real. */
  async init(): Promise<boolean> {
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return false;
    }
    if (softwareGL(this.renderer) && !location.search.includes('gl=force')) {
      this.renderer.dispose();
      return false;
    }
    const [meta, heightImg, colorTex] = await Promise.all([
      fetch('/terrain/meta.json').then((r) => r.json() as Promise<TerrainMeta>),
      new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = '/terrain/height.png';
      }),
      new THREE.TextureLoader().loadAsync('/terrain/color.webp'),
    ]);
    this.meta = meta;
    this.decodeHeights(heightImg);
    this.W = meta.sizeKm[0];
    this.H = this.W * (meta.height[1] / meta.height[0]);

    const r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.domElement.className = 'map3d-canvas';
    this.host.prepend(r.domElement);

    // Terreno
    const seg = [511, Math.round(511 * this.H / this.W)];
    const geo = new THREE.PlaneGeometry(this.W, this.H, seg[0], seg[1]);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / this.W + 0.5;
      const v = pos.getZ(i) / this.H + 0.5;
      pos.setY(i, this.heightAt(u, v));
    }
    geo.computeVertexNormals();
    colorTex.colorSpace = THREE.SRGBColorSpace;
    colorTex.anisotropy = r.capabilities.getMaxAnisotropy();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: colorTex, roughness: 0.95, metalness: 0 }));
    this.scene.add(ground);

    // Suelo lejano para que los bordes se pierdan en la bruma
    const base = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: 0xcfd8d2 }));
    base.rotateX(-Math.PI / 2);
    base.position.y = (meta.elevMin / 1000) * EXAG - 0.1;
    this.scene.add(base);

    // Luz de media tarde desde el suroeste y cielo
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
    sun.position.set(-30, 26, 22);
    this.scene.add(sun, new THREE.HemisphereLight(0xc6daef, 0x4b4a36, 1.0));
    this.scene.fog = new THREE.Fog(0xdde6ea, 14, 58);

    // La casa: punto de luz y haz vertical
    const home = this.world(...this.uv(42.88939, -5.58106));
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc56b, transparent: true, opacity: 0.6, depthWrite: false }));
    beam.position.copy(home).add(new THREE.Vector3(0, 0.35, 0));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffc56b }));
    dot.position.copy(home).add(new THREE.Vector3(0, 0.05, 0));
    this.scene.add(beam, dot);

    // Cámara y controles
    this.controls = new OrbitControls(this.camera, r.domElement);
    const c = this.controls;
    c.enableDamping = !this.reduced;
    c.dampingFactor = 0.08;
    c.minDistance = 1.2;
    c.maxDistance = 42;
    c.minPolarAngle = 0.25;
    c.maxPolarAngle = 1.32;
    c.screenSpacePanning = false;
    c.zoomSpeed = 0.8;
    c.touches.ONE = -1 as unknown as THREE.TOUCH; // un dedo: la página hace scroll
    c.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    r.domElement.style.touchAction = 'pan-y';
    // La rueda solo hace zoom con Ctrl/Cmd: si no, la página sigue bajando.
    r.domElement.addEventListener('wheel', (e) => { c.enableZoom = e.ctrlKey || e.metaKey; }, { capture: true, passive: true });
    c.addEventListener('change', () => {
      // El objetivo no se sale del mapa.
      c.target.x = THREE.MathUtils.clamp(c.target.x, -this.W / 2, this.W / 2);
      c.target.z = THREE.MathUtils.clamp(c.target.z, -this.H / 2, this.H / 2);
      this.needs = true;
    });
    this.overview(true);

    new ResizeObserver(() => this.resize()).observe(this.host);
    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.loop();
    }).observe(this.host);
    this.resize();
    return true;
  }

  private decodeHeights(img: HTMLImageElement) {
    const cv = document.createElement('canvas');
    cv.width = this.hw = img.width;
    cv.height = this.hh = img.height;
    const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const { elevMin: lo, elevMax: hi } = this.meta;
    this.heights = new Float32Array(cv.width * cv.height);
    for (let i = 0; i < this.heights.length; i++) this.heights[i] = lo + ((d[i * 4] * 256 + d[i * 4 + 1]) / 65535) * (hi - lo);
  }

  /** Altura del mundo (km, exagerada) en coordenadas de imagen u, v (0–1). */
  heightAt(u: number, v: number) {
    const x = THREE.MathUtils.clamp(u, 0, 1) * (this.hw - 1);
    const y = THREE.MathUtils.clamp(v, 0, 1) * (this.hh - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, this.hw - 1), y1 = Math.min(y0 + 1, this.hh - 1);
    const fx = x - x0, fy = y - y0;
    const h = this.heights;
    const a = h[y0 * this.hw + x0] * (1 - fx) + h[y0 * this.hw + x1] * fx;
    const b = h[y1 * this.hw + x0] * (1 - fx) + h[y1 * this.hw + x1] * fx;
    return ((a * (1 - fy) + b * fy) / 1000) * EXAG;
  }

  /** Latitud/longitud → coordenadas de imagen (u, v), con la misma proyección que las teselas. */
  uv(lat: number, lon: number): [number, number] {
    const m = this.meta.mercator;
    const n = 2 ** m.z;
    const x = ((lon + 180) / 360 * n - m.x0) * 256;
    const y = ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2 * n - m.y0) * 256;
    return [(x - m.px0) / (m.px1 - m.px0), (y - m.py0) / (m.py1 - m.py0)];
  }

  world(u: number, v: number, lift = 0) {
    return new THREE.Vector3((u - 0.5) * this.W, this.heightAt(u, v) + lift, (v - 0.5) * this.H);
  }

  inside(u: number, v: number) {
    return u >= 0 && u <= 1 && v >= 0 && v <= 1;
  }

  /** Posición en pantalla (px dentro del contenedor) o null si queda detrás de la cámara. */
  project(p: THREE.Vector3) {
    const v = p.clone().project(this.camera);
    if (v.z > 1) return null;
    const r = this.host.getBoundingClientRect();
    return { x: (v.x * 0.5 + 0.5) * r.width, y: (-v.y * 0.5 + 0.5) * r.height };
  }

  private resize() {
    const r = this.host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
    this.needs = true;
    this.loop();
  }

  private loop = () => {
    if (!this.visible) return;
    const moving = this.controls.update() || this.flying;
    if (this.needs || moving) {
      this.renderer.render(this.scene, this.camera);
      this.onRender?.();
      this.needs = false;
    }
    requestAnimationFrame(this.loop);
  };

  redraw() {
    this.needs = true;
  }

  /** Vuelo de cámara con un arco suave hacia un objetivo. */
  flyTo(target: THREE.Vector3, dist: number, opts: { azimuth?: number; polar?: number; duration?: number } = {}) {
    // En pantallas verticales el campo horizontal es menor: la cámara se aleja.
    dist *= Math.max(1, 1.25 / this.camera.aspect);
    const az = opts.azimuth ?? this.controls.getAzimuthalAngle();
    const pol = opts.polar ?? 0.95;
    const end = new THREE.Vector3().setFromSphericalCoords(dist, pol, az).add(target);
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const lift = Math.min(8, startPos.distanceTo(end) * 0.25);
    this.flying?.kill();
    const o = { t: 0 };
    const step = () => {
      const t = o.t;
      this.controls.target.lerpVectors(startTarget, target, t);
      this.camera.position.lerpVectors(startPos, end, t);
      this.camera.position.y += Math.sin(t * Math.PI) * lift;
      this.needs = true;
    };
    if (this.reduced || opts.duration === 0) {
      o.t = 1;
      step();
      return;
    }
    this.flying = gsap.to(o, { t: 1, duration: opts.duration ?? 2.2, ease: 'power2.inOut', onUpdate: step, onComplete: () => { this.flying = null; } });
  }

  overview(instant = false) {
    const home = this.world(...this.uv(42.88939, -5.58106));
    const t = home.clone().add(new THREE.Vector3(0.5, 0, -2.5));
    this.flyTo(t, 19, { azimuth: 0.35, polar: 0.98, duration: instant ? 0 : 2 });
  }

  zoom(f: number) {
    const c = this.controls;
    const off = this.camera.position.clone().sub(c.target).multiplyScalar(f);
    const len = THREE.MathUtils.clamp(off.length(), c.minDistance, c.maxDistance);
    this.flyTo(c.target.clone(), len, { azimuth: c.getAzimuthalAngle(), polar: c.getPolarAngle(), duration: 0.6 });
  }

  private tube(points: THREE.Vector3[], color: number, radius: number) {
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, Math.max(40, points.length * 3), radius, 6, false);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, fog: false }));
    this.scene.add(mesh);
    return mesh;
  }

  private reveal(mesh: THREE.Mesh) {
    const total = mesh.geometry.index!.count;
    if (this.reduced) {
      mesh.geometry.setDrawRange(0, total);
      return;
    }
    const o = { p: 0 };
    mesh.geometry.setDrawRange(0, 0);
    gsap.to(o, {
      p: 1, duration: 2.4, delay: 0.6, ease: 'power1.inOut',
      onUpdate: () => {
        mesh.geometry.setDrawRange(0, Math.floor((total * o.p) / 6) * 6);
        this.needs = true;
      },
    });
  }

  /** Ruta GPX real (clave de meta.trails). Devuelve su centro y tamaño para encuadrarla. */
  showTrail(key: string) {
    this.clearRoute();
    const pts = this.meta.trails[key];
    if (!pts) return null;
    let mesh = this.trails.get(key);
    if (!mesh) {
      mesh = this.tube(pts.map(([u, v]) => this.world(u, v, LIFT)), 0xff7a2f, 0.016);
      this.trails.set(key, mesh);
    }
    this.trails.forEach((m, k) => (m.visible = k === key));
    this.reveal(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    return { center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()).length() };
  }

  /** Línea desde la casa hasta un lugar, pegada al relieve. */
  showRoute(to: [number, number]) {
    this.clearRoute();
    this.trails.forEach((m) => (m.visible = false));
    const from = this.uv(42.88939, -5.58106);
    const [u1, v1] = [THREE.MathUtils.clamp(to[0], 0.005, 0.995), THREE.MathUtils.clamp(to[1], 0.005, 0.995)];
    const n = 160;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(this.world(from[0] + (u1 - from[0]) * t, from[1] + (v1 - from[1]) * t, LIFT * 1.6));
    }
    this.route = this.tube(pts, 0xffffff, 0.012);
    this.reveal(this.route);
    return pts[n];
  }

  clearRoute() {
    if (this.route) {
      this.scene.remove(this.route);
      this.route.geometry.dispose();
      this.route = null;
    }
    this.needs = true;
  }

  hideTrails() {
    this.trails.forEach((m) => (m.visible = false));
    this.clearRoute();
  }
}
