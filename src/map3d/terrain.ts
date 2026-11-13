import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { TerrainData, EXAG, type TerrainMeta } from '../three/terrainData';
import { hasRealGPU } from '../gpu';

// Mapa 3D con el relieve real (Terrain Tiles de AWS/Mapzen, preparado con tools/terrain.py).
// Unidades del mundo: kilómetros. Altura exagerada para que se lea el relieve.

export type { TerrainMeta };

const LIFT = 0.018; // km sobre el suelo para rutas

export class Terrain3D {
  meta!: TerrainMeta;
  renderer!: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.05, 220);
  controls!: OrbitControls;
  data!: TerrainData;
  private W = 1;
  private H = 1;
  private needs = true;
  private visible = false;
  private raf = 0;
  private flying: gsap.core.Tween | null = null;
  private trails = new Map<string, THREE.Mesh>();
  private route: THREE.Mesh | null = null;
  onRender?: () => void;

  constructor(readonly host: HTMLElement, private reduced: boolean) {}

  /** Devuelve false si no hay WebGL con GPU real. */
  async init(): Promise<boolean> {
    if (!hasRealGPU()) return false;
    // Los datos antes que el contexto: si la red falla no queda un WebGL abierto.
    this.data = await TerrainData.load();
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return false;
    }
    const meta = this.data.meta;
    this.meta = meta;
    const colorTex = this.data.color;
    this.W = this.data.W;
    this.H = this.data.H;

    const r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.domElement.className = 'map3d-canvas';
    this.host.prepend(r.domElement);

    // Terreno
    const geo = this.data.geometry(511);
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
      if (this.visible) this.wake();
    }).observe(this.host);
    this.resize();
    return true;
  }

  heightAt(u: number, v: number) {
    return this.data.heightAt(u, v);
  }

  uv(lat: number, lon: number): [number, number] {
    return this.data.uv(lat, lon);
  }

  world(u: number, v: number, lift = 0) {
    return this.data.world(u, v, lift);
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
    this.wake();
  }

  /** Arranca el bucle si no está ya en marcha (nunca hay dos a la vez). */
  private wake() {
    if (!this.raf && this.visible) this.raf = requestAnimationFrame(this.loop);
  }

  private loop = () => {
    this.raf = 0;
    if (!this.visible) return;
    const moving = this.controls.update() || this.flying;
    if (this.needs || moving) {
      this.renderer.render(this.scene, this.camera);
      this.onRender?.();
      this.needs = false;
    }
    this.raf = requestAnimationFrame(this.loop);
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
      (this.route.material as THREE.Material).dispose();
      this.route = null;
    }
    this.needs = true;
  }

  hideTrails() {
    this.trails.forEach((m) => (m.visible = false));
    this.clearRoute();
  }
}
