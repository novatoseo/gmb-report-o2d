import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Postproceso al estilo Igloo: bloom, un «fluido» que sigue al puntero y deforma la imagen,
// aberración cromática que crece con la velocidad del scroll, viñeta y grano.

const QUAD_VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const TRAIL_FRAG = /* glsl */ `
uniform sampler2D uPrev;
uniform vec2 uMouse, uVel;
uniform float uAspect, uRadius, uDecay;
varying vec2 vUv;
void main() {
  vec2 prev = texture2D(uPrev, vUv).xy;
  // Autoadvección: el remolino se arrastra a sí mismo, como un fluido sencillo.
  vec2 v = texture2D(uPrev, vUv - prev * 0.012).xy * uDecay;
  vec2 d = (vUv - uMouse) * vec2(uAspect, 1.0);
  float splat = exp(-dot(d, d) / uRadius);
  v += uVel * splat;
  gl_FragColor = vec4(clamp(v, -1.0, 1.0), 0.0, 1.0);
}`;

export class Trail {
  private a: THREE.WebGLRenderTarget;
  private b: THREE.WebGLRenderTarget;
  private scene = new THREE.Scene();
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mat: THREE.ShaderMaterial;

  constructor(w: number, h: number) {
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.a = new THREE.WebGLRenderTarget(w, h, opts);
    this.b = new THREE.WebGLRenderTarget(w, h, opts);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: TRAIL_FRAG,
      uniforms: { uPrev: { value: null }, uMouse: { value: new THREE.Vector2(-1, -1) }, uVel: { value: new THREE.Vector2() }, uAspect: { value: w / h }, uRadius: { value: 0.0025 }, uDecay: { value: 0.955 } },
      depthTest: false,
    });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));
  }

  resize(w: number, h: number) {
    this.a.setSize(w, h);
    this.b.setSize(w, h);
    this.mat.uniforms.uAspect.value = w / h;
  }

  get texture() {
    return this.a.texture;
  }

  step(r: THREE.WebGLRenderer, mouse: THREE.Vector2, vel: THREE.Vector2) {
    const u = this.mat.uniforms;
    u.uPrev.value = this.a.texture;
    u.uMouse.value.copy(mouse);
    u.uVel.value.copy(vel);
    const prev = r.getRenderTarget();
    r.setRenderTarget(this.b);
    r.render(this.scene, this.cam);
    r.setRenderTarget(prev);
    [this.a, this.b] = [this.b, this.a];
  }
}

const FINAL = {
  uniforms: {
    tDiffuse: { value: null },
    uTrail: { value: null },
    uTime: { value: 0 },
    uSpeed: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse, uTrail;
uniform float uTime, uSpeed;
uniform vec2 uRes;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
  vec2 t = texture2D(uTrail, vUv).xy;
  vec2 uv = vUv - t * 0.025;
  vec2 dir = uv - 0.5;
  float ca = 0.0012 + uSpeed * 0.018 + length(t) * 0.012;
  vec3 c;
  c.r = texture2D(tDiffuse, uv + dir * ca).r;
  c.g = texture2D(tDiffuse, uv).g;
  c.b = texture2D(tDiffuse, uv - dir * ca).b;
  // Un leve brillo donde pasa el puntero
  c += vec3(0.9, 0.95, 1.0) * length(t) * 0.05;
  float vig = smoothstep(1.15, 0.35, length(dir * vec2(uRes.x / uRes.y, 1.0) * 0.9));
  c *= mix(0.72, 1.0, vig);
  c += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) * 0.045;
  gl_FragColor = vec4(c, 1.0);
}`,
};

export class Post {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  final: ShaderPass;
  trail: Trail;
  private mouse = new THREE.Vector2(-1, -1);
  private last = new THREE.Vector2(-1, -1);
  private vel = new THREE.Vector2();

  constructor(private renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, mobile: boolean) {
    const size = renderer.getSize(new THREE.Vector2());
    // Antialias MSAA en el render target del postproceso (en móvil no, por coste).
    const rt = new THREE.WebGLRenderTarget(size.x * renderer.getPixelRatio(), size.y * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), mobile ? 0.35 : 0.5, 0.65, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.final = new ShaderPass(FINAL);
    this.composer.addPass(this.final);
    this.trail = new Trail(Math.max(2, size.x / 6), Math.max(2, size.y / 6));
    this.final.uniforms.uTrail.value = this.trail.texture;
    addEventListener('pointermove', (e) => this.mouse.set(e.clientX / innerWidth, 1 - e.clientY / innerHeight), { passive: true });
  }

  setBloom(on: boolean) {
    this.bloom.enabled = on;
  }

  resize(w: number, h: number) {
    this.composer.setSize(w, h);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.bloom.resolution.set(w / 2, h / 2);
    this.trail.resize(Math.max(2, Math.round(w / 6)), Math.max(2, Math.round(h / 6)));
    this.final.uniforms.uRes.value.set(w, h);
  }

  render(time: number, speed: number) {
    if (this.last.x < 0) this.last.copy(this.mouse);
    this.vel.subVectors(this.mouse, this.last).multiplyScalar(6).clampLength(0, 0.6);
    this.last.copy(this.mouse);
    this.trail.step(this.renderer, this.mouse, this.vel);
    this.final.uniforms.uTrail.value = this.trail.texture;
    this.final.uniforms.uTime.value = time;
    this.final.uniforms.uSpeed.value = speed;
    this.composer.render();
  }
}
