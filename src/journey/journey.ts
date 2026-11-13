import * as THREE from 'three';
import { asset } from '../asset';
import { FINCA } from '../content';
import { UNITS } from '../live/scenes';
import { EXAG, TerrainData } from '../three/terrainData';
import { TUNE } from '../live/tuning';
import { PHOTO_FRAG, PHOTO_VERT, SKY_FRAG, SKY_VERT, SNOW_FRAG, SNOW_VERT, TERRAIN_FRAG, TERRAIN_VERT } from './shaders';

// El viaje: una sola escena 3D que el scroll recorre de principio a fin.
// Unidades: kilómetros. Todo lo que cambia con el scroll depende de `p` (0–1).

export interface Chapter { id: string; from: number; to: number }

export const CHAPTERS: Chapter[] = [
  { id: 'intro', from: 0, to: 0.08 },
  { id: 'descent', from: 0.08, to: 0.24 },
  { id: 'house', from: 0.24, to: 0.36 },
  { id: 'units', from: 0.36, to: 0.47 },
  { id: 'sunrise', from: 0.47, to: 0.54 },
  { id: 'golden', from: 0.54, to: 0.61 },
  { id: 'trail', from: 0.61, to: 0.76 },
  { id: 'winter', from: 0.76, to: 0.87 },
  { id: 'night', from: 0.87, to: 1 },
];

/** Paletas de luz a lo largo del viaje. */
type Light = { p: number; sun: [number, number, number]; sunC: string; sky: string; ground: string; zenith: string; horizon: string; fog: string; night: number; snow: number; fall: number };
const LIGHTS: Light[] = [
  { p: 0.0, sun: [0.6, 0.06, -0.8], sunC: '#ffb27a', sky: '#7f86b8', ground: '#3a3036', zenith: '#2b3a78', horizon: '#ffb48a', fog: '#c9a9b8', night: 0, snow: 0, fall: 0 },
  { p: 0.2, sun: [0.5, 0.35, -0.6], sunC: '#ffe6c4', sky: '#a9c6e6', ground: '#4c4a36', zenith: '#4a86cc', horizon: '#f6e3cc', fog: '#dde3e6', night: 0, snow: 0, fall: 0 },
  { p: 0.62, sun: [-0.3, 0.55, 0.5], sunC: '#fff2dc', sky: '#bcd4ee', ground: '#4b4a36', zenith: '#3a7ed0', horizon: '#dbe8f2', fog: '#dde6ea', night: 0, snow: 0, fall: 0 },
  { p: 0.74, sun: [-0.5, 0.3, 0.6], sunC: '#ffd9a8', sky: '#b8c6d8', ground: '#4e4c40', zenith: '#5f86b8', horizon: '#f2d8b8', fog: '#d9dde2', night: 0, snow: 0, fall: 0 },
  { p: 0.84, sun: [-0.4, 0.25, 0.6], sunC: '#c9d3e0', sky: '#c9d2dc', ground: '#6d7078', zenith: '#8494a8', horizon: '#dfe4ea', fog: '#d6dce3', night: 0, snow: 1, fall: 1 },
  { p: 0.9, sun: [-0.5, 0.1, 0.6], sunC: '#8a7aa8', sky: '#5a5f86', ground: '#2a2a3a', zenith: '#1b2152', horizon: '#6a5a86', fog: '#3a3f5e', night: 0.6, snow: 0.8, fall: 0.2 },
  { p: 1.0, sun: [-0.5, -0.1, 0.6], sunC: '#3a4a7a', sky: '#283463', ground: '#10141f', zenith: '#070b1f', horizon: '#26305a', fog: '#141a33', night: 1, snow: 0.6, fall: 0 },
];

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
function lightAt(p: number) {
  let i = 0;
  while (i < LIGHTS.length - 2 && LIGHTS[i + 1].p <= p) i++;
  const a = LIGHTS[i], b = LIGHTS[i + 1];
  const t = THREE.MathUtils.smoothstep(p, a.p, b.p);
  const col = (k: 'sunC' | 'sky' | 'ground' | 'zenith' | 'horizon' | 'fog') => tmpA.set(a[k]).lerp(tmpB.set(b[k]), t).clone();
  return {
    sun: new THREE.Vector3(...a.sun).lerp(new THREE.Vector3(...b.sun), t).normalize(),
    sunC: col('sunC'), sky: col('sky'), ground: col('ground'), zenith: col('zenith'), horizon: col('horizon'), fog: col('fog'),
    night: THREE.MathUtils.lerp(a.night, b.night, t),
    snow: THREE.MathUtils.lerp(a.snow, b.snow, t),
    fall: THREE.MathUtils.lerp(a.fall, b.fall, t),
  };
}

const range = (p: number, a: number, b: number) => THREE.MathUtils.clamp((p - a) / (b - a), 0, 1);
const ease = (t: number) => t * t * (3 - 2 * t);

interface Panel {
  name: string;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  center: THREE.Vector3;
  loaded: boolean;
}

export class Journey {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, 0.01, 260);
  data!: TerrainData;
  home!: THREE.Vector3;
  private terrainMat!: THREE.ShaderMaterial;
  private skyMat!: THREE.ShaderMaterial;
  private sky!: THREE.Mesh;
  private snow!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private clouds: THREE.Sprite[] = [];
  private beam!: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  private trail!: THREE.Mesh;
  private trailPts: THREE.Vector3[] = [];
  private trailHead!: THREE.Sprite;
  private panels: Panel[] = [];
  private corridor = { start: new THREE.Vector3(), dir: new THREE.Vector3(), gap: 2.6 };
  private finalDir = new THREE.Vector3(0.9, 0.3, 1.6).normalize();
  private pathPos!: THREE.CatmullRomCurve3;
  private pathLook!: THREE.CatmullRomCurve3;
  private pathT: number[] = [];
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private t0 = performance.now();
  private lastTime = 0;
  p = 0;
  private shown = 0;
  private running = false;
  onHud?: (h: { lat: number; lon: number; alt: number; p: number }) => void;

  constructor(readonly host: HTMLElement, private reduced: boolean) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 800 ? 1.5 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.domElement.className = 'journey-canvas';
    host.prepend(this.renderer.domElement);
  }

  isSoftware() {
    const gl = this.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    return /swiftshader|llvmpipe|softpipe|software/i.test(name);
  }

  async init(onProgress: (f: number) => void) {
    this.data = await TerrainData.load();
    onProgress(0.4);
    const d = this.data;
    this.home = d.worldLL(FINCA.lat, FINCA.lon);

    // Terreno
    this.terrainMat = new THREE.ShaderMaterial({
      vertexShader: TERRAIN_VERT,
      fragmentShader: TERRAIN_FRAG,
      fog: true,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uMap: { value: d.color },
        uSunDir: { value: new THREE.Vector3(0.5, 0.4, -0.6) },
        uSunColor: { value: new THREE.Color('#fff2dc') },
        uSky: { value: new THREE.Color('#bcd4ee') },
        uGround: { value: new THREE.Color('#4b4a36') },
        uSnow: { value: 0 },
        uTime: { value: 0 },
      },
    });
    d.color.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.scene.add(new THREE.Mesh(d.geometry(innerWidth < 800 ? 383 : 511), this.terrainMat));
    const base = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), this.terrainMat.clone());
    base.material.uniforms.uMap.value = d.color;
    base.rotateX(-Math.PI / 2);
    base.position.y = (d.meta.elevMin / 1000) * EXAG - 0.15;
    this.scene.add(base);
    this.scene.fog = new THREE.Fog(0xdde6ea, 10, 62);

    // Cielo
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3() }, uSunColor: { value: new THREE.Color() },
        uNight: { value: 0 }, uTime: { value: 0 }, uSunSize: { value: 0.0009 },
      },
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), this.skyMat);
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    this.makeClouds();
    this.makeSnow();
    this.makeBeam();
    this.makeTrail();
    this.makePanels();
    this.makePath();
    onProgress(0.7);
    // Se cargan primero las fotos que se ven antes.
    for (const pnl of this.panels) await this.loadPanel(pnl);
    onProgress(1);

    new ResizeObserver(() => this.resize()).observe(this.host);
    this.resize();
    if (!this.reduced) {
      addEventListener('pointermove', (e) => {
        this.pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
        this.pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
      }, { passive: true });
    }
  }

  private makeClouds() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d')!;
    for (let i = 0; i < 14; i++) {
      const x = 30 + Math.random() * 68, y = 40 + Math.random() * 48, r = 18 + Math.random() * 26;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
    }
    const tex = new THREE.CanvasTexture(cv);
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    for (let i = 0; i < 46; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: rnd(0.55, 0.9), fog: true });
      const s = new THREE.Sprite(m);
      const sc = rnd(4, 9);
      s.scale.set(sc, sc * 0.55, 1);
      s.position.set(this.home.x + rnd(-14, 14), rnd(4.6, 6.6), this.home.z + rnd(-6, 26));
      this.clouds.push(s);
      this.scene.add(s);
    }
  }

  private makeSnow() {
    const n = innerWidth < 800 ? 2500 : 5000;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos.set([(Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 5], i * 3);
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.snow = new THREE.Points(geo, new THREE.ShaderMaterial({
      vertexShader: SNOW_VERT,
      fragmentShader: SNOW_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uSize: { value: 26 * this.renderer.getPixelRatio() }, uCam: { value: new THREE.Vector3() }, uOpacity: { value: 0 } },
    }));
    this.snow.frustumCulled = false;
    this.scene.add(this.snow);
  }

  private makeBeam() {
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 1.2, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc56b, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    this.beam.position.copy(this.home).add(new THREE.Vector3(0, 0.6, 0));
    this.scene.add(this.beam);
  }

  private makeTrail() {
    const pts = this.data.meta.trails['valle-faedo-cinera-pozo-ibarra'];
    this.trailPts = pts.map(([u, v]) => this.data.world(u, v, 0.02));
    const curve = new THREE.CatmullRomCurve3(this.trailPts);
    const geo = new THREE.TubeGeometry(curve, 400, 0.014, 6, false);
    this.trail = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffa23d, toneMapped: false }));
    geo.setDrawRange(0, 0);
    this.scene.add(this.trail);
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,230,170,1)');
    gr.addColorStop(0.3, 'rgba(255,170,80,0.6)');
    gr.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    this.trailHead = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.trailHead.scale.setScalar(0.18);
    this.trailHead.visible = false;
    this.scene.add(this.trailHead);
  }

  private makePanels() {
    // Pasillo de fotos sobre el valle, mirando hacia el norte (hacia la cordillera).
    // El pasillo sigue la línea de mirada de Valporquero hacia la casa, así el vuelo enlaza sin giros.
    const c = this.corridor;
    const k24 = this.data.worldLL(42.9042, -5.5542).add(new THREE.Vector3(-0.2, 1.6, -1.2));
    c.dir.subVectors(this.home, k24).setY(0).normalize();
    c.dir.y = -0.03;
    c.dir.normalize();
    c.start.copy(k24).addScaledVector(c.dir, 2.0);
    const names = ['otono', 'fachada', 'amanecer', 'camino', 'atardecer'];
    names.forEach((name, i) => {
      const aspect = name === 'amanecer' ? 1200 / 675 : 16 / 9;
      const w = 1.6, h = w / aspect;
      const geo = new THREE.PlaneGeometry(w, h, 240, Math.round(240 / aspect));
      const mat = new THREE.ShaderMaterial({
        vertexShader: PHOTO_VERT,
        fragmentShader: PHOTO_FRAG,
        transparent: true,
        fog: true,
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uMap: { value: null }, uAux: { value: null },
          uDepth: { value: 0.22 }, uFocus: { value: 0.5 },
          uOpacity: { value: 0 }, uPass: { value: 0 }, uNight: { value: 0 }, uGlow: { value: name === 'fachada' ? 0.6 : 0.3 },
          uTime: { value: 0 }, uSnow: { value: 0 }, uHiOn: { value: 0 }, uHi: { value: new THREE.Vector4() },
        },
      });
      const mesh = new THREE.Mesh(geo, mat);
      // La última foto (las casas de noche) espera junto a la casa, mirando a la cámara final.
      const center = name === 'atardecer' ? this.home.clone().add(new THREE.Vector3(0, 0.42, 0)) : c.start.clone().addScaledVector(c.dir, i * c.gap);
      mesh.position.copy(center);
      mesh.lookAt(name === 'atardecer' ? center.clone().add(this.finalDir) : center.clone().sub(c.dir));
      mesh.visible = false;
      this.scene.add(mesh);
      this.panels.push({ name, mesh, center, loaded: false });
    });
  }

  private async loadPanel(pnl: Panel) {
    if (pnl.loaded) return;
    const big = Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio, 2) > 1500;
    const loader = new THREE.TextureLoader();
    const [map, aux] = await Promise.all([
      loader.loadAsync(asset(`live/${pnl.name}-${big ? 1920 : 1200}.webp`)),
      loader.loadAsync(asset(`live/${pnl.name}-aux.png`)),
    ]);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    aux.colorSpace = THREE.NoColorSpace;
    aux.generateMipmaps = true;
    aux.minFilter = THREE.LinearMipmapLinearFilter;
    pnl.mesh.material.uniforms.uMap.value = map;
    pnl.mesh.material.uniforms.uAux.value = aux;
    pnl.loaded = true;
  }

  /** Distancia a la que una foto llena la pantalla. */
  private fillDist(w: number, h: number) {
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    return Math.min(h / 2 / t, w / 2 / (t * this.camera.aspect));
  }

  private makePath() {
    const H = this.home, d = this.data, c = this.corridor;
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const pajares = d.worldLL(42.995, -5.768);
    const valporquero = d.worldLL(42.9042, -5.5542);
    const fill = this.fillDist(1.6, 0.9) * 0.9;
    const F = this.panels[4].center;
    const keys: { t: number; pos: THREE.Vector3; look: THREE.Vector3 }[] = [
      { t: 0.0, pos: H.clone().add(v(1.5, 9.5, 24)), look: H.clone().add(v(0, 3.2, -10)) },
      { t: 0.06, pos: H.clone().add(v(0.8, 7.2, 19)), look: H.clone().add(v(0, 2.2, -8)) },
      { t: 0.13, pos: H.clone().add(v(-3, 4.2, 9)), look: pajares.clone().add(v(0, 0.6, 0)) },
      { t: 0.19, pos: pajares.clone().add(v(3.5, 2.6, 4.5)), look: H.clone().add(v(0, 0.2, 0)) },
      { t: 0.24, pos: valporquero.clone().add(v(-0.2, 1.6, -1.2)), look: H.clone() },
    ];
    // Pasillo de fotos: llegar, llenar la pantalla y atravesar cada una.
    const seg = [0.30, 0.36, 0.47, 0.54, 0.61];
    this.panels.slice(0, 4).forEach((pnl, i) => {
      const a = seg[i], b = seg[i + 1];
      keys.push({ t: a, pos: pnl.center.clone().addScaledVector(c.dir, -fill * 1.35), look: pnl.center.clone().addScaledVector(c.dir, 4) });
      keys.push({ t: a + (b - a) * 0.72, pos: pnl.center.clone().addScaledVector(c.dir, -fill * 0.92), look: pnl.center.clone().addScaledVector(c.dir, 4) });
    });
    keys.sort((x, y) => x.t - y.t);
    // Ruta del Faedo de Ciñera: se sigue desde arriba.
    const tp = this.trailPts;
    const mid = tp[Math.floor(tp.length * 0.55)];
    const end = tp[tp.length - 1];
    keys.push(
      { t: 0.64, pos: H.clone().add(v(1.2, 1.6, 2.4)), look: H.clone().add(v(-1, 0, 0)) },
      { t: 0.7, pos: mid.clone().add(v(1.4, 1.5, 2.6)), look: mid.clone() },
      { t: 0.76, pos: end.clone().add(v(2.2, 1.9, 3.2)), look: end.clone().add(v(0.6, 0, 0)) },
      // Invierno: se sube para ver la sierra nevada
      { t: 0.82, pos: H.clone().add(v(5, 4.2, 9)), look: H.clone().add(v(-1, 0.8, -6)) },
      { t: 0.87, pos: H.clone().add(v(2.5, 2.4, 5.5)), look: H.clone().add(v(0, 0.4, -2)) },
      // Noche: la foto de las casas encendidas llena la pantalla
      { t: 0.93, pos: F.clone().addScaledVector(this.finalDir, fill * 2.4), look: F.clone() },
      { t: 1.0, pos: F.clone().addScaledVector(this.finalDir, fill * 0.95), look: F.clone() },
    );
    keys.sort((x, y) => x.t - y.t);
    this.pathT = keys.map((k) => k.t);
    this.pathPos = new THREE.CatmullRomCurve3(keys.map((k) => k.pos), false, 'centripetal');
    this.pathLook = new THREE.CatmullRomCurve3(keys.map((k) => k.look), false, 'centripetal');
  }

  /** Progreso del scroll → parámetro de la curva (los puntos clave tienen su propio tiempo). */
  private curveU(p: number) {
    const T = this.pathT;
    const n = T.length - 1;
    if (p <= T[0]) return 0;
    if (p >= T[n]) return 1;
    let i = 0;
    while (i < n - 1 && T[i + 1] <= p) i++;
    const f = (p - T[i]) / (T[i + 1] - T[i] || 1);
    return (i + f) / n;
  }

  private resize() {
    const r = this.host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
    // Al cambiar de proporción, las fotos se vuelven a encuadrar.
    if (this.pathPos) this.makePath();
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.frame();
      requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this.running = false;
  }

  frame() {
    const time = (performance.now() - this.t0) / 1000;
    const dt = Math.min(0.25, time - this.lastTime);
    this.lastTime = time;
    // Suavizado cinematográfico del progreso (por tiempo, igual a cualquier tasa de fotogramas)
    this.shown += (this.p - this.shown) * (this.reduced ? 1 : 1 - Math.exp(-dt * 4.5));
    const p = this.shown;
    const pt = this.pointer;
    const k = 1 - Math.exp(-dt * 3);
    pt.x += (pt.tx - pt.x) * k;
    pt.y += (pt.ty - pt.y) * k;

    // Cámara
    const u = this.curveU(p);
    const pos = this.pathPos.getPoint(u);
    const look = this.pathLook.getPoint(u);
    const drift = this.reduced ? 0 : 1;
    const right = new THREE.Vector3().subVectors(look, pos).cross(new THREE.Vector3(0, 1, 0)).normalize();
    pos.addScaledVector(right, (pt.x * 0.06 + Math.sin(time * 0.25) * 0.02) * drift * TUNE.move);
    pos.y += (-pt.y * 0.04 + Math.sin(time * 0.31) * 0.01) * drift * TUNE.move;
    // No atravesar el suelo
    const [cu, cv] = this.data.toUv(pos);
    pos.y = Math.max(pos.y, this.data.heightAt(cu, cv) + 0.08);
    this.camera.position.copy(pos);
    this.camera.lookAt(look);

    // Luz y clima
    const L = lightAt(p);
    const tu = this.terrainMat.uniforms;
    tu.uSunDir.value.copy(L.sun);
    tu.uSunColor.value.copy(L.sunC);
    tu.uSky.value.copy(L.sky);
    tu.uGround.value.copy(L.ground);
    tu.uSnow.value = L.snow;
    const fog = this.scene.fog as THREE.Fog;
    // La bruma toma el color del horizonte para que no haya costura entre tierra y cielo.
    fog.color.copy(L.fog).lerp(L.horizon, 0.85);
    fog.far = THREE.MathUtils.lerp(62, 26, Math.max(L.snow * 0.5, L.night * 0.4)) / Math.max(0.3, TUNE.fog);
    const su = this.skyMat.uniforms;
    su.uZenith.value.copy(L.zenith);
    su.uHorizon.value.copy(L.horizon);
    su.uSunDir.value.copy(L.sun);
    su.uSunColor.value.copy(L.sunC);
    su.uNight.value = L.night;
    su.uTime.value = time;
    this.sky.position.copy(pos);

    // Nubes: se cruzan en el descenso y luego se apartan
    const cloudOp = 1 - range(p, 0.2, 0.3);
    for (const s of this.clouds) {
      s.position.x += 0.0008;
      (s.material as THREE.SpriteMaterial).opacity = 0.75 * cloudOp;
      (s.material as THREE.SpriteMaterial).color.copy(L.horizon).lerp(new THREE.Color('#ffffff'), 0.55);
      s.visible = cloudOp > 0.01;
    }

    // Fotos 3D
    const segs = [0.30, 0.36, 0.47, 0.54, 0.61];
    this.panels.forEach((pnl, i) => {
      const last = pnl.name === 'atardecer';
      const a = last ? 0.9 : segs[i], b = last ? 2 : segs[i + 1];
      const m = pnl.mesh.material.uniforms;
      const appear = range(p, a - 0.05, a);
      const pass = last ? 0 : range(p, a + (b - a) * 0.75, b);
      if (last) {
        m.uNight.value = Math.min(1, 0.8 * TUNE.night);
        m.uGlow.value = 1 * TUNE.glow;
      }
      pnl.mesh.visible = pnl.loaded && appear > 0 && pass < 1;
      m.uOpacity.value = ease(appear);
      m.uDepth.value = 0.22 * TUNE.move;
      m.uPass.value = pass;
      m.uTime.value = time;
      if (pnl.name === 'fachada') {
        // Foco sobre Maelo, Braña y Teleno por turnos
        const k = range(p, a + 0.01, a + (b - a) * 0.7) * 3;
        const unit = (['maelo', 'brana', 'teleno'] as const)[Math.min(2, Math.floor(k))];
        const [x0, y0, x1, y1] = UNITS[unit];
        (m.uHi.value as THREE.Vector4).set(x0, 1 - y1, x1, 1 - y0);
        m.uHiOn.value = Math.min(range(p, a + 0.008, a + 0.02), 1 - range(p, a + (b - a) * 0.68, a + (b - a) * 0.75));
      }
    });

    // Ruta que se dibuja sola
    const tr = range(p, 0.635, 0.755);
    const total = this.trail.geometry.index!.count;
    this.trail.geometry.setDrawRange(0, Math.floor((total * tr) / 6) * 6);
    this.trail.visible = p > 0.62 && p < 0.78;
    this.trailHead.visible = tr > 0 && tr < 1 && this.trail.visible;
    if (this.trailHead.visible) this.trailHead.position.copy(this.trailPts[Math.min(this.trailPts.length - 1, Math.floor(tr * (this.trailPts.length - 1)))]);

    // Nieve cayendo y la casa encendida
    const sm = this.snow.material.uniforms;
    sm.uTime.value = time;
    sm.uCam.value.copy(pos);
    sm.uOpacity.value = Math.min(1, L.fall * TUNE.snow);
    this.snow.visible = L.fall > 0.01;
    this.beam.material.opacity = L.night * 0.7 * (1 - range(p, 0.9, 0.95));

    this.renderer.render(this.scene, this.camera);

    if (this.onHud) {
      const [lat, lon] = this.data.lonLat(cu, cv);
      this.onHud({ lat, lon, alt: (pos.y / EXAG) * 1000, p });
    }
  }
}
