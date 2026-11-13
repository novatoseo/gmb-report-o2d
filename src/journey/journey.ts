import * as THREE from 'three';
import { asset } from '../asset';
import { FINCA } from '../content';
import { UNITS } from '../live/scenes';
import { EXAG, TerrainData } from '../three/terrainData';
import { TUNE } from '../live/tuning';
import { Post } from './post';
import { TITLE_SPECS, Titles } from './titles';
import { DUST_FRAG, DUST_VERT, PHOTO_FRAG, PHOTO_VERT, SKY_FRAG, SKY_VERT, SNOW_FRAG, SNOW_VERT, TERRAIN_FRAG, TERRAIN_VERT } from './shaders';

// El viaje: una sola escena 3D que el scroll recorre de principio a fin.
// Unidades: kilómetros. Todo lo que cambia con el scroll depende de `p` (0–1).

export interface Chapter { id: string; from: number; to: number }

export const CHAPTERS: Chapter[] = [
  { id: 'valley', from: 0, to: 0.24 },
  { id: 'houses', from: 0.24, to: 0.56 },
  { id: 'trails', from: 0.56, to: 0.78 },
  { id: 'silence', from: 0.78, to: 1 },
];

/** Tiempos de cada foto: [llega y llena la pantalla, se atraviesa]. */
const PANEL_T: Record<string, [number, number]> = { otono: [0.27, 0.37], fachada: [0.37, 0.56], atardecer: [0.86, 0.945] };
/** Gradación de cada foto hacia la hora azul (0 = original, 1 = noche). */
const PANEL_GRADE: Record<string, number> = { otono: 0.45, fachada: 0.32, atardecer: 0.8 };

/** Paletas de luz a lo largo del viaje. */
type Light = { p: number; sun: [number, number, number]; sunC: string; sky: string; ground: string; zenith: string; horizon: string; fog: string; night: number; snow: number; fall: number };
// Una sola identidad: la hora azul. Lo cálido queda para las luces de las casas, la ruta y el final.
const LIGHTS: Light[] = [
  { p: 0.0, sun: [-0.75, 0.12, 0.35], sunC: '#a9b8e6', sky: '#5f70a8', ground: '#2a2f4c', zenith: '#0a1436', horizon: '#6d6a98', fog: '#5c5e8c', night: 0.4, snow: 0, fall: 0 },
  { p: 0.55, sun: [-0.7, 0.16, 0.4], sunC: '#b4c0e8', sky: '#6a7cb4', ground: '#30365a', zenith: '#101c46', horizon: '#7c7aa8', fog: '#666a98', night: 0.35, snow: 0, fall: 0 },
  { p: 0.8, sun: [-0.6, 0.2, 0.5], sunC: '#9aa8d6', sky: '#6676aa', ground: '#3c4262', zenith: '#0d1838', horizon: '#6f77a6', fog: '#5e6894', night: 0.55, snow: 1, fall: 1 },
  { p: 0.92, sun: [-0.5, 0.12, 0.6], sunC: '#6c7cb0', sky: '#46558a', ground: '#232a44', zenith: '#070d26', horizon: '#3a4676', fog: '#283258', night: 0.9, snow: 0.85, fall: 0.5 },
  { p: 1.0, sun: [-0.5, 0.05, 0.6], sunC: '#3a4a7a', sky: '#283463', ground: '#10141f', zenith: '#050918', horizon: '#1f2850', fog: '#141a33', night: 1, snow: 0.7, fall: 0 },
];

// Resultado reutilizable de lightAt (sin crear objetos en cada fotograma).
const LOUT = {
  sun: new THREE.Vector3(), sunC: new THREE.Color(), sky: new THREE.Color(), ground: new THREE.Color(),
  zenith: new THREE.Color(), horizon: new THREE.Color(), fog: new THREE.Color(), night: 0, snow: 0, fall: 0,
};
const PAL = LIGHTS.map((l) => ({
  ...l,
  sunV: new THREE.Vector3(...l.sun).normalize(),
  c: { sunC: new THREE.Color(l.sunC), sky: new THREE.Color(l.sky), ground: new THREE.Color(l.ground), zenith: new THREE.Color(l.zenith), horizon: new THREE.Color(l.horizon), fog: new THREE.Color(l.fog) },
}));
const COLOR_KEYS = ['sunC', 'sky', 'ground', 'zenith', 'horizon', 'fog'] as const;
function lightAt(p: number) {
  let i = 0;
  while (i < PAL.length - 2 && PAL[i + 1].p <= p) i++;
  const a = PAL[i], b = PAL[i + 1];
  const t = THREE.MathUtils.smoothstep(p, a.p, b.p);
  LOUT.sun.copy(a.sunV).lerp(b.sunV, t).normalize();
  for (const k of COLOR_KEYS) LOUT[k].copy(a.c[k]).lerp(b.c[k], t);
  LOUT.night = THREE.MathUtils.lerp(a.night, b.night, t);
  LOUT.snow = THREE.MathUtils.lerp(a.snow, b.snow, t);
  LOUT.fall = THREE.MathUtils.lerp(a.fall, b.fall, t);
  return LOUT;
}

const range = (p: number, a: number, b: number) => THREE.MathUtils.clamp((p - a) / (b - a), 0, 1);
const ease = (t: number) => t * t * (3 - 2 * t);

interface Panel {
  name: string;
  grade: number;
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
  private raf = 0;
  private lost = false;
  private quality = 2;
  private frames = 0;
  private slowFrames = 0;
  private lastNow = 0;
  /** Se llama si el navegador pierde el contexto WebGL. */
  onLost?: () => void;
  onHud?: (h: { lat: number; lon: number; alt: number; p: number }) => void;
  /** Estado para el sonido ambiente: altitud (km), día, noche y nieve (0–1). */
  onMix?: (m: { alt: number; day: number; night: number; snow: number; speed: number }) => void;
  private post: Post | null = null;
  private dust!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private baseMat!: THREE.ShaderMaterial;
  private prevShown = 0;
  private speed = 0;
  private hudT = 0;
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  private white = new THREE.Color('#ffffff');
  private titles!: Titles;
  private activeUnit = -1;
  private wasNarrow: boolean | null = null;
  private unitIds = ['maelo', 'brana', 'teleno'] as const;

  constructor(readonly host: HTMLElement, private reduced: boolean) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 800 ? 1.5 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.domElement.className = 'journey-canvas';
    host.prepend(this.renderer.domElement);
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
      this.stop();
      this.onLost?.();
    });
  }

  isSoftware() {
    const gl = this.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    return /swiftshader|llvmpipe|softpipe|software/i.test(name);
  }

  async init(onProgress: (f: number) => void) {
    this.data = await TerrainData.load();
    onProgress(0.45);
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
        uDissolve: { value: 0 },
      },
    });
    d.color.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.scene.add(new THREE.Mesh(d.geometry(innerWidth < 800 ? 383 : 511), this.terrainMat));
    this.baseMat = this.terrainMat.clone();
    const base = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), this.baseMat);
    this.baseMat.uniforms.uMap.value = d.color;
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
    this.makeDust();
    this.makePath();
    this.post = new Post(this.renderer, this.scene, this.camera, innerWidth < 800);
    this.titles = new Titles(TITLE_SPECS);
    this.scene.add(this.titles.group);
    const r0 = this.host.getBoundingClientRect();
    this.camera.aspect = r0.width / Math.max(1, r0.height);
    await this.titles.setLang(this.camera.aspect < 0.9);
    this.titles.layout((p) => this.poseAt(p), this.camera);
    this.titles.attachLabels(this.panels[1].mesh, 1.6, 0.9);
    onProgress(0.6);
    // Se cargan primero las fotos que se ven antes.
    let n = 0;
    for (const pnl of this.panels) {
      await this.loadPanel(pnl);
      onProgress(0.7 + (0.3 * ++n) / this.panels.length);
    }

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

  private makeDust() {
    const d = this.data;
    const nx = innerWidth < 800 ? 150 : 230;
    const ny = Math.round((nx * d.H) / d.W);
    const pos = new Float32Array(nx * ny * 3);
    const seed = new Float32Array(nx * ny);
    let i = 0;
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const u = (x + Math.random() * 0.8) / nx, v = (y + Math.random() * 0.8) / ny;
        const w = d.world(u, v, 0.02);
        pos.set([w.x, w.y, w.z], i * 3);
        seed[i++] = Math.random();
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.dust = new THREE.Points(geo, new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uAlpha: { value: 0 }, uSize: { value: 26 * this.renderer.getPixelRatio() },
        uLow: { value: (d.meta.elevMin / 1000) * EXAG }, uHigh: { value: (d.meta.elevMax / 1000) * EXAG },
        uHome: { value: this.home.clone() },
      },
    }));
    this.dust.frustumCulled = false;
    this.dust.visible = false;
    this.scene.add(this.dust);
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
    const names = ['otono', 'fachada', 'atardecer'];
    names.forEach((name, i) => {
      const aspect = 16 / 9;
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
          uOpacity: { value: 0 }, uPass: { value: 0 }, uNight: { value: PANEL_GRADE[name] }, uGlow: { value: name === 'fachada' ? 0.6 : 0.3 },
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
      this.panels.push({ name, grade: PANEL_GRADE[name], mesh, center, loaded: false });
    });
  }

  private async loadPanel(pnl: Panel) {
    if (pnl.loaded) return;
    // En móvil basta la de 1200 px (la foto ocupa una pantalla estrecha); 1920 solo en pantallas grandes.
    const big = Math.min(innerWidth, innerHeight) >= 700 && innerWidth * Math.min(devicePixelRatio, 1.5) > 1500;
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
    const F = this.panels[2].center;
    const keys: { t: number; pos: THREE.Vector3; look: THREE.Vector3 }[] = [
      // I · El valle: sobre las nubes y descenso por la cordillera
      { t: 0.0, pos: H.clone().add(v(1.5, 9.5, 24)), look: H.clone().add(v(0, 3.2, -10)) },
      { t: 0.08, pos: H.clone().add(v(0.8, 7.2, 19)), look: H.clone().add(v(0, 2.2, -8)) },
      { t: 0.15, pos: H.clone().add(v(-3, 4.2, 9)), look: pajares.clone().add(v(0, 0.6, 0)) },
      { t: 0.2, pos: pajares.clone().add(v(3.5, 2.6, 4.5)), look: H.clone().add(v(0, 0.2, 0)) },
      { t: 0.24, pos: valporquero.clone().add(v(-0.2, 1.6, -1.2)), look: H.clone() },
    ];
    // II · Las casas: llegar a cada foto, llenar la pantalla y atravesarla
    this.panels.slice(0, 2).forEach((pnl) => {
      const [a, b] = PANEL_T[pnl.name];
      keys.push({ t: a, pos: pnl.center.clone().addScaledVector(c.dir, -fill * 1.35), look: pnl.center.clone().addScaledVector(c.dir, 4) });
      keys.push({ t: a + (b - a) * 0.72, pos: pnl.center.clone().addScaledVector(c.dir, -fill * 0.92), look: pnl.center.clone().addScaledVector(c.dir, 4) });
    });
    // III · Desde la puerta: la ruta del Faedo de Ciñera, vista desde arriba
    const tp = this.trailPts;
    const mid = tp[Math.floor(tp.length * 0.55)];
    const end = tp[tp.length - 1];
    const [na, nb] = PANEL_T.atardecer;
    keys.push(
      { t: 0.6, pos: H.clone().add(v(1.2, 1.6, 2.4)), look: H.clone().add(v(-1, 0, 0)) },
      { t: 0.67, pos: mid.clone().add(v(1.4, 1.5, 2.6)), look: mid.clone() },
      { t: 0.74, pos: end.clone().add(v(2.2, 1.9, 3.2)), look: end.clone().add(v(0.6, 0, 0)) },
      // IV · El silencio: nieva sobre la sierra, las casas encendidas y el valle hecho de luz
      { t: 0.8, pos: H.clone().add(v(5, 4.2, 9)), look: H.clone().add(v(-1, 0.8, -6)) },
      { t: na, pos: F.clone().addScaledVector(this.finalDir, fill * 2.4), look: F.clone() },
      { t: na + (nb - na) * 0.75, pos: F.clone().addScaledVector(this.finalDir, fill * 0.95), look: F.clone() },
      { t: 0.96, pos: H.clone().add(v(1.6, 1.6, 3.4)), look: H.clone().add(v(0, 0.3, 0)) },
      { t: 0.985, pos: H.clone().add(v(2.0, 2.5, 6.2)), look: H.clone().add(v(-0.6, 0.15, -2.6)) },
      { t: 1.0, pos: H.clone().add(v(2.0, 2.5, 6.2)), look: H.clone().add(v(-0.6, 0.15, -2.6)) },
    );
    keys.sort((x, y) => x.t - y.t);
    this.pathT = keys.map((k) => k.t);
    this.pathPos = new THREE.CatmullRomCurve3(keys.map((k) => k.pos), false, 'centripetal');
    this.pathLook = new THREE.CatmullRomCurve3(keys.map((k) => k.look), false, 'centripetal');
    this.titles?.layout((p) => this.poseAt(p), this.camera);
  }

  /** Posición y mirada de la cámara en un punto del recorrido (sin el balanceo del puntero). */
  poseAt(p: number) {
    const u = this.curveU(p);
    return { pos: this.pathPos.getPoint(u), look: this.pathLook.getPoint(u) };
  }

  /** Arranca la entrada del primer titular. */
  startTitles() {
    this.titles?.start((performance.now() - this.t0) / 1000);
  }

  /** Cambia el idioma de los titulares 3D. */
  async setLang() {
    if (!this.titles) return;
    await this.titles.setLang(this.camera.aspect < 0.9);
    this.titles.layout((p) => this.poseAt(p), this.camera);
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
    this.post?.resize(r.width, r.height);
    const narrow = this.camera.aspect < 0.9;
    if (this.titles && narrow !== this.wasNarrow) {
      this.wasNarrow = narrow;
      void this.setLang();
    }
    // Al cambiar de proporción, las fotos se vuelven a encuadrar.
    if (this.pathPos) this.makePath();
  }

  start() {
    if (this.running || this.lost) return;
    this.running = true;
    const loop = (now: number) => {
      this.raf = 0;
      if (!this.running) return;
      this.adapt(now);
      this.frame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Calidad automática: si el dispositivo no llega, baja la resolución y luego quita el bloom. */
  private adapt(now: number) {
    if (this.lastNow) {
      const dt = now - this.lastNow;
      this.slowFrames += dt > 28 ? 1 : 0;
      if (++this.frames >= 60) {
        if (this.slowFrames > 25 && this.quality > 0) {
          this.quality--;
          const base = Math.min(devicePixelRatio, innerWidth < 800 ? 1.5 : 1.75);
          this.renderer.setPixelRatio(base * [0.55, 0.75, 1][this.quality]);
          if (this.quality === 0) this.post?.setBloom(false);
          this.resize();
        }
        this.frames = this.slowFrames = 0;
      }
    }
    this.lastNow = now;
  }

  dispose() {
    this.stop();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  frame() {
    const time = (performance.now() - this.t0) / 1000;
    const dt = Math.max(0.001, Math.min(0.25, time - this.lastTime));
    this.lastTime = time;
    // Suavizado cinematográfico del progreso (por tiempo, igual a cualquier tasa de fotogramas)
    this.shown += (this.p - this.shown) * (this.reduced ? 1 : 1 - Math.exp(-dt * 4.5));
    const p = this.shown;
    // Velocidad del scroll: deforma la cámara y separa los colores
    const rawSpeed = Math.min(1, (Math.abs(p - this.prevShown) / dt) * 6);
    this.prevShown = p;
    this.speed += (rawSpeed - this.speed) * (1 - Math.exp(-dt * 6));
    const pt = this.pointer;
    const k = 1 - Math.exp(-dt * 3);
    pt.x += (pt.tx - pt.x) * k;
    pt.y += (pt.ty - pt.y) * k;

    // Cámara
    const u = this.curveU(p);
    const pos = this.pathPos.getPoint(u, this.v1);
    const look = this.pathLook.getPoint(u, this.v2);
    const drift = this.reduced ? 0 : TUNE.move;
    this.camera.position.subVectors(look, pos).cross(this.up).normalize();
    pos.addScaledVector(this.camera.position, (pt.x * 0.06 + Math.sin(time * 0.25) * 0.02) * drift);
    pos.y += (-pt.y * 0.04 + Math.sin(time * 0.31) * 0.01) * drift;
    const cu = pos.x / this.data.W + 0.5, cv = pos.z / this.data.H + 0.5;
    pos.y = Math.max(pos.y, this.data.heightAt(cu, cv) + 0.08);
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
    const fov = 45 + this.speed * 9 * (this.reduced ? 0 : 1);
    if (Math.abs(fov - this.camera.fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    // Luz y clima
    const L = lightAt(p);
    const tu = this.terrainMat.uniforms;
    tu.uSunDir.value.copy(L.sun);
    tu.uSunColor.value.copy(L.sunC);
    tu.uSky.value.copy(L.sky);
    tu.uGround.value.copy(L.ground);
    tu.uSnow.value = L.snow;
    const dissolve = range(p, 0.935, 0.975);
    tu.uDissolve.value = dissolve;
    const bu = this.baseMat.uniforms;
    bu.uSunDir.value.copy(L.sun);
    bu.uSunColor.value.copy(L.sunC);
    bu.uSky.value.copy(L.sky);
    bu.uGround.value.copy(L.ground);
    bu.uDissolve.value = dissolve;
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
    const cloudOp = 1 - range(p, 0.2, 0.28);
    const cloudsOn = cloudOp > 0.01;
    for (const s of this.clouds) {
      s.visible = cloudsOn;
      if (!cloudsOn) continue;
      s.position.x += 0.05 * dt;
      const m = s.material as THREE.SpriteMaterial;
      m.opacity = 0.75 * cloudOp;
      m.color.copy(L.horizon).lerp(this.white, 0.3);
    }

    // Fotos 3D
    this.activeUnit = -1;
    for (let i = 0; i < this.panels.length; i++) {
      const pnl = this.panels[i];
      const [a, b] = PANEL_T[pnl.name];
      const m = pnl.mesh.material.uniforms;
      const appear = range(p, a - 0.04, a);
      const pass = range(p, a + (b - a) * 0.75, b);
      pnl.mesh.visible = pnl.loaded && appear > 0 && pass < 1;
      if (!pnl.mesh.visible) continue;
      m.uOpacity.value = ease(appear);
      m.uDepth.value = 0.22 * TUNE.move;
      m.uPass.value = pass;
      m.uTime.value = time;
      m.uNight.value = Math.min(1, pnl.grade * TUNE.night);
      m.uGlow.value = (pnl.name === 'otono' ? 0.3 : 0.8) * TUNE.glow;
      if (pnl.name === 'fachada') {
        // Foco sobre Maelo, Braña y Teleno por turnos, con su etiqueta 3D
        const kk = range(p, a + 0.01, a + (b - a) * 0.7) * 3;
        const unit = Math.min(2, Math.floor(kk));
        const [x0, y0, x1, y1] = UNITS[this.unitIds[unit]];
        (m.uHi.value as THREE.Vector4).set(x0, 1 - y1, x1, 1 - y0);
        const on = Math.min(range(p, a + 0.008, a + 0.02), 1 - range(p, a + (b - a) * 0.68, a + (b - a) * 0.75));
        m.uHiOn.value = on;
        if (on > 0.5) this.activeUnit = unit;
      }
    }

    // Ruta que se dibuja sola
    const tr = range(p, 0.6, 0.74);
    const total = this.trail.geometry.index!.count;
    this.trail.geometry.setDrawRange(0, Math.floor((total * tr) / 6) * 6);
    this.trail.visible = p > 0.585 && p < 0.8;
    this.trailHead.visible = tr > 0 && tr < 1 && this.trail.visible;
    if (this.trailHead.visible) this.trailHead.position.copy(this.trailPts[Math.min(this.trailPts.length - 1, Math.floor(tr * (this.trailPts.length - 1)))]);

    // Nieve cayendo, la casa encendida y el valle hecho de luz al final
    const sm = this.snow.material.uniforms;
    sm.uTime.value = time;
    sm.uCam.value.copy(pos);
    sm.uOpacity.value = Math.min(1, L.fall * TUNE.snow);
    this.snow.visible = L.fall > 0.01;
    this.beam.material.opacity = Math.max(0.35, L.night) * 0.7 * (1 - range(p, 0.86, 0.9));
    const dustA = range(p, 0.93, 0.97);
    this.dust.visible = dustA > 0;
    this.dust.material.uniforms.uAlpha.value = dustA;
    this.dust.material.uniforms.uTime.value = time;

    // Titulares 3D
    this.titles.update(p, time, dt, this.activeUnit);

    if (this.post) this.post.render(time, this.reduced ? 0 : this.speed);
    else this.renderer.render(this.scene, this.camera);

    const alt = pos.y / EXAG;
    this.onMix?.({ alt, day: 1 - L.night, night: L.night, snow: L.fall, speed: this.speed });
    // El HUD se actualiza unas 10 veces por segundo, no en cada fotograma.
    if (this.onHud && time - this.hudT > 0.1) {
      this.hudT = time;
      const [lat, lon] = this.data.lonLat(cu, cv);
      this.onHud({ lat, lon, alt: alt * 1000, p });
    }
  }
}
