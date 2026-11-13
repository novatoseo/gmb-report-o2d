import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { asset } from '../asset';
import { HOUSES, JOURNEY } from '../content';
import { t, tr } from '../i18n';
import { UNITS } from '../live/scenes';

// Titulares dentro de la escena: texto SDF (troika) anclado en el mundo 3D.
// Las letras entran de izquierda a derecha y, cuando la cámara pasa, se dispersan y se queman.

const FONT = asset('fonts/fraunces-600.woff');

const VERT = /* glsl */ `
uniform float uReveal, uPass;
varying vec2 vTU;
varying float vK;
void main() {
  vec3 p = position;
  float span = max(uTroikaTotalBounds.z - uTroikaTotalBounds.x, 1e-4);
  float h = max(uTroikaTotalBounds.w - uTroikaTotalBounds.y, 1e-4);
  float cx = ((aTroikaGlyphBounds.x + aTroikaGlyphBounds.z) * 0.5 - uTroikaTotalBounds.x) / span;
  float cy = ((aTroikaGlyphBounds.y + aTroikaGlyphBounds.w) * 0.5 - uTroikaTotalBounds.y) / h;
  float k = clamp(uReveal * 1.8 - cx * 0.6 - (1.0 - cy) * 0.2, 0.0, 1.0);
  k = k * k * (3.0 - 2.0 * k);
  float em = (aTroikaGlyphBounds.w - aTroikaGlyphBounds.y);
  p.y -= (1.0 - k) * em * 0.9;
  p.z -= (1.0 - k) * em * 1.5;
  float r1 = fract(sin(cx * 91.3 + cy * 17.1) * 437.5);
  float r2 = fract(sin(cx * 47.1 + cy * 3.7) * 913.7);
  p.x += (r1 - 0.5) * uPass * em * 6.0;
  p.y += (r2 - 0.5) * uPass * em * 4.0;
  p.z += uPass * em * (3.0 + r1 * 6.0);
  vTU = uv;
  vK = k;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity, uPass;
varying vec2 vTU;
varying float vK;
void main() {
  float n = fract(sin(dot(floor(vTU * vec2(60.0, 10.0)), vec2(12.9898, 78.233))) * 43758.5453);
  if (n < uPass * 1.25 - 0.15) discard;
  float rim = smoothstep(uPass * 1.25 - 0.05, uPass * 1.25 - 0.15, n) * step(0.001, uPass);
  vec3 c = mix(uColor, vec3(1.0, 0.62, 0.3) * 1.5, rim);
  gl_FragColor = vec4(c, uOpacity * vK);
}`;

function material(color: string) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uReveal: { value: 0 }, uPass: { value: 0 }, uOpacity: { value: 1 }, uColor: { value: new THREE.Color(color) } },
  });
}

interface Spec {
  id: string;           // clave de JOURNEY
  anchorP: number;      // momento del recorrido en que el titular queda bien encuadrado
  dist: number;         // distancia a la cámara en ese momento (km)
  width: number;        // fracción del ancho visible
  lift: number;         // fracción del alto visible hacia arriba (+) o abajo (−)
  reveal: [number, number];
  pass: [number, number];
}

interface Item {
  spec: Spec;
  text: Text;
  mat: THREE.ShaderMaterial;
  w0: number;
  h0: number;
}

export interface Pose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

export class Titles {
  private items: Item[] = [];
  private labels: { text: Text; sub: Text; mat: THREE.ShaderMaterial; subMat: THREE.ShaderMaterial; on: number }[] = [];
  private kick = -1;
  group = new THREE.Group();

  constructor(specs: Spec[]) {
    for (const spec of specs) {
      const mat = material('#fff7ea');
      const text = new Text();
      text.font = FONT;
      text.fontSize = 1;
      text.letterSpacing = -0.02;
      text.lineHeight = 0.95;
      text.anchorX = 'center';
      text.anchorY = 'middle';
      text.textAlign = 'center';
      text.material = mat;
      text.renderOrder = 10;
      text.frustumCulled = false;
      text.visible = false;
      this.items.push({ spec, text, mat, w0: 1, h0: 1 });
      this.group.add(text);
    }
    for (let i = 0; i < 3; i++) {
      const mat = material('#fff7ea');
      const subMat = material('#f2b544');
      const text = new Text();
      const sub = new Text();
      for (const [x, m, size] of [[text, mat, 1], [sub, subMat, 0.32]] as const) {
        x.font = FONT;
        x.fontSize = size;
        x.anchorX = 'center';
        x.anchorY = 'bottom';
        x.material = m;
        x.renderOrder = 11;
        x.frustumCulled = false;
        x.visible = false;
        this.group.add(x);
      }
      sub.anchorY = 'top';
      this.labels.push({ text, sub, mat, subMat, on: 0 });
    }
  }

  /** Textos según el idioma; devuelve cuando todos están maquetados. */
  setLang(narrow: boolean) {
    const jobs: Promise<void>[] = [];
    for (const it of this.items) {
      it.text.text = tr(JOURNEY[it.spec.id].title);
      it.text.maxWidth = narrow ? 6.5 : 13;
      jobs.push(new Promise((res) => it.text.sync(() => {
        const b = it.text.textRenderInfo?.blockBounds;
        if (b) {
          it.w0 = b[2] - b[0];
          it.h0 = b[3] - b[1];
        }
        res();
      })));
    }
    HOUSES.forEach((h, i) => {
      const l = this.labels[i];
      l.text.text = h.name;
      l.sub.text = `${h.area} m² · ${t('from')} ${h.priceFrom} €`.toUpperCase();
      l.text.sync();
      l.sub.sync();
    });
    return Promise.all(jobs);
  }

  /** Coloca cada titular delante de la cámara en su momento, mirándola. */
  layout(poseAt: (p: number) => Pose, camera: THREE.PerspectiveCamera) {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fwd = new THREE.Vector3();
    const up = new THREE.Vector3();
    const right = new THREE.Vector3();
    for (const it of this.items) {
      const { pos, look } = poseAt(it.spec.anchorP);
      fwd.subVectors(look, pos).normalize();
      right.crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
      up.crossVectors(right, fwd).normalize();
      const visH = 2 * it.spec.dist * tan;
      const visW = visH * camera.aspect;
      const scale = Math.min((visW * it.spec.width) / it.w0, (visH * 0.42) / it.h0);
      it.text.scale.setScalar(scale);
      it.text.position.copy(pos).addScaledVector(fwd, it.spec.dist).addScaledVector(up, visH * it.spec.lift);
      it.text.lookAt(pos);
    }
  }

  /** Etiquetas de Maelo, Braña y Teleno pegadas a su cristalera en la foto de la fachada. */
  attachLabels(panel: THREE.Mesh, w: number, h: number) {
    (['maelo', 'brana', 'teleno'] as const).forEach((id, i) => {
      const [x0, y0, x1] = UNITS[id];
      const l = this.labels[i];
      const local = new THREE.Vector3(((x0 + x1) / 2 - 0.5) * w, (0.5 - y0) * h + h * 0.035, 0.06);
      const world = panel.localToWorld(local.clone());
      const scale = h * 0.085;
      for (const x of [l.text, l.sub]) {
        x.position.copy(world);
        x.quaternion.copy(panel.quaternion);
        x.scale.setScalar(scale);
      }
      l.sub.position.copy(panel.localToWorld(local.clone().add(new THREE.Vector3(0, -h * 0.004, 0))));
    });
  }

  /** Arranca la entrada del primer titular (tras la precarga). */
  start(time: number) {
    this.kick = time;
  }

  update(p: number, time: number, dt: number, activeUnit: number) {
    const range = (a: number, b: number) => THREE.MathUtils.clamp((p - a) / (b - a), 0, 1);
    for (const it of this.items) {
      let reveal = range(...it.spec.reveal);
      if (it.spec.reveal[0] < 0) reveal = this.kick < 0 ? 0 : Math.min(1, (time - this.kick) / 1.8);
      const pass = range(...it.spec.pass);
      it.text.visible = reveal > 0.001 && pass < 0.999;
      it.mat.uniforms.uReveal.value = reveal;
      it.mat.uniforms.uPass.value = pass;
    }
    this.labels.forEach((l, i) => {
      const target = i === activeUnit ? 1 : 0;
      l.on += (target - l.on) * (1 - Math.exp(-dt * (target ? 3 : 6)));
      const vis = l.on > 0.01;
      l.text.visible = l.sub.visible = vis;
      l.mat.uniforms.uReveal.value = l.on;
      l.subMat.uniforms.uReveal.value = Math.max(0, l.on * 1.3 - 0.3);
    });
  }
}

export const TITLE_SPECS: Spec[] = [
  { id: 'intro', anchorP: 0, dist: 7, width: 0.8, lift: 0.12, reveal: [-1, 0], pass: [0.05, 0.1] },
  { id: 'house', anchorP: 0.285, dist: 0.75, width: 0.74, lift: 0.14, reveal: [0.255, 0.285], pass: [0.33, 0.355] },
  { id: 'trail', anchorP: 0.665, dist: 2.4, width: 0.72, lift: 0.18, reveal: [0.6, 0.635], pass: [0.715, 0.74] },
  { id: 'night', anchorP: 0.895, dist: 0.8, width: 0.74, lift: 0.22, reveal: [0.872, 0.898], pass: [0.918, 0.935] },
  { id: 'outro', anchorP: 1, dist: 3.2, width: 0.8, lift: 0.14, reveal: [0.96, 0.99], pass: [2, 3] },
];
