// Shaders del viaje: terreno con sol y nieve, cielo con estrellas, fotos 3D y nieve en el aire.

const NOISE = /* glsl */ `
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
`;

export const TERRAIN_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

export const TERRAIN_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uSunDir, uSunColor, uSky, uGround;
uniform float uSnow, uTime, uDissolve;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
#include <fog_pars_fragment>
${NOISE}
void main() {
  // Final: el relieve se deshace desde la casa hacia fuera, con un borde de luz.
  float dn = fbm(vWorld.xz * 1.4) * 0.6 + smoothstep(0.0, 22.0, length(vWorld.xz)) * 0.4;
  float cut = uDissolve * 1.15;
  if (dn < cut) discard;
  float edge = smoothstep(cut + 0.04, cut, dn) * step(0.001, uDissolve);
  vec3 base = texture2D(uMap, vUv).rgb;
  vec3 n = normalize(vNormal);
  float diff = max(dot(n, normalize(uSunDir)), 0.0);
  vec3 amb = mix(uGround, uSky, n.y * 0.5 + 0.5);
  // Nieve: cubre primero lo alto y lo llano; la cota baja con uSnow.
  float line = mix(3.4, 0.55, uSnow);
  float s = smoothstep(line - 0.25, line + 0.15, vWorld.y + (fbm(vWorld.xz * 3.0) - 0.5) * 0.35) * smoothstep(0.45, 0.8, n.y);
  s = max(s, smoothstep(0.85, 1.0, uSnow) * smoothstep(0.55, 0.9, n.y) * 0.85);
  base = mix(base, vec3(0.92, 0.94, 0.97), s * clamp(uSnow * 1.5, 0.0, 1.0));
  vec3 c = base * (amb * 0.75 + uSunColor * diff * 1.15);
  c += vec3(1.0, 0.75, 0.4) * edge * 3.0;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  gl_Position.z = gl_Position.w; // siempre al fondo
}`;

export const SKY_FRAG = /* glsl */ `
uniform vec3 uZenith, uHorizon, uSunDir, uSunColor;
uniform float uNight, uTime, uSunSize;
varying vec3 vDir;
${NOISE}
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 c = mix(uHorizon, uZenith, pow(smoothstep(-0.05, 0.75, h), 0.7));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  c += uSunColor * (pow(sd, 6.0) * 0.35 + pow(sd, 60.0) * 0.6 + smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.6, sd) * 2.0) * (1.0 - uNight);
  // Estrellas: una rejilla en la esfera, titilando.
  if (uNight > 0.01) {
    vec2 g = vec2(atan(d.z, d.x) * 180.0, d.y * 260.0);
    vec2 id = floor(g);
    float st = step(0.985, hash(id)) * smoothstep(0.45, 0.0, length(fract(g) - 0.5));
    st *= 0.6 + 0.4 * sin(uTime * 2.0 + hash(id + 3.0) * 40.0);
    c += st * uNight * smoothstep(0.0, 0.2, h) * 1.4;
    // Vía láctea tenue
    c += vec3(0.5, 0.55, 0.8) * fbm(g * 0.02) * 0.12 * uNight * smoothstep(0.1, 0.6, h) * smoothstep(0.5, 0.0, abs(d.x - d.y * 0.6));
  }
  // Sin tone mapping: así el horizonte coincide exactamente con el color de la bruma.
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

// Foto 3D: la malla se desplaza con el mapa de profundidad y se puede atravesar (quemado).
export const PHOTO_VERT = /* glsl */ `
uniform sampler2D uAux;
uniform float uDepth, uFocus;
varying vec2 vUv;
varying float vDepth;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  float d = texture2D(uAux, uv).r;
  vDepth = d;
  vec2 e = min(uv, 1.0 - uv);
  float edge = smoothstep(0.0, 0.06, min(e.x, e.y));
  vec3 p = position;
  p.z += (d - uFocus) * uDepth * edge;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

export const PHOTO_FRAG = /* glsl */ `
uniform sampler2D uMap, uAux;
uniform float uOpacity, uPass, uNight, uGlow, uTime, uSnow, uHiOn;
uniform vec4 uHi;
varying vec2 vUv;
varying float vDepth;
#include <fog_pars_fragment>
${NOISE}
void main() {
  vec2 e = min(vUv, 1.0 - vUv);
  float frame = smoothstep(0.0, 0.012, min(e.x, e.y));
  // Al atravesarla, la foto se quema desde un frente de ruido, con borde incandescente.
  float n = fbm(vUv * vec2(9.0, 6.0) + 3.0) * 0.75 + (1.0 - vDepth) * 0.25;
  float burn = uPass * 1.25 - 0.1;
  if (n < burn) discard;
  float rim = smoothstep(burn + 0.025, burn, n) * step(0.001, uPass);
  vec3 c = texture2D(uMap, vUv).rgb;
  vec3 orig = c;
  vec3 a = texture2D(uAux, vUv).rgb;
  float lights = smoothstep(0.12, 0.55, a.b);
  float room = smoothstep(0.05, 0.32, texture2D(uAux, vUv, 2.0).b);
  float tw = 0.88 + 0.12 * sin(uTime * 2.6 + hash(floor(vUv * 240.0)) * 6.283);
  if (uNight > 0.0) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    vec3 moon = vec3(0.30, 0.40, 0.66) * l * 0.78 + vec3(0.012, 0.018, 0.04);
    moon = mix(moon, c * vec3(0.18, 0.24, 0.42), 0.35);
    c = mix(c, moon, uNight);
    c = mix(c, orig * mix(0.75, 1.2, lights) * tw, max(lights, room * 0.85) * clamp(uNight * 1.2, 0.0, 1.0));
  }
  c += vec3(1.0, 0.72, 0.38) * (texture2D(uAux, vUv, 3.0).b * 0.3 * uGlow + lights * 0.06 * tw);
  if (uHiOn > 0.0) {
    vec2 q = smoothstep(uHi.xy - 0.012, uHi.xy + 0.012, vUv) * (1.0 - smoothstep(uHi.zw - 0.012, uHi.zw + 0.012, vUv));
    float inside = q.x * q.y;
    c = mix(c, c * mix(0.4, 1.15, inside) + vec3(1.0, 0.72, 0.38) * inside * 0.06, uHiOn);
  }
  c = mix(c, vec3(1.0, 0.62, 0.3) * 1.4, rim * 0.85);
  gl_FragColor = vec4(c, uOpacity * frame);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export const SNOW_VERT = /* glsl */ `
uniform float uTime, uSize;
uniform vec3 uCam;
attribute float aSeed;
varying float vA;
void main() {
  vec3 box = vec3(5.0, 3.0, 5.0);
  vec3 p = position;
  p.y -= uTime * (0.18 + aSeed * 0.14);
  p.x += sin(uTime * 0.6 + aSeed * 30.0) * 0.08;
  p = mod(p - uCam + box * 0.5, box) - box * 0.5 + uCam;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.6 + aSeed) / -mv.z;
  vA = smoothstep(4.5, 0.4, -mv.z);
}`;

export const SNOW_FRAG = /* glsl */ `
uniform float uOpacity;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d) * vA * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(1.0), a);
}`;

// El valle hecho de luz: un punto por cada trozo de relieve, más cálido abajo y frío en las cumbres.
export const DUST_VERT = /* glsl */ `
uniform float uTime, uSize, uAlpha, uLow, uHigh;
uniform vec3 uHome;
attribute float aSeed;
varying float vH;
varying float vA;
void main() {
  vec3 p = position;
  float rise = (1.0 - uAlpha) * 0.0 + sin(uTime * 0.6 + aSeed * 40.0) * 0.012;
  p.y += rise + uAlpha * aSeed * 0.05;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float near = smoothstep(9.0, 0.0, distance(p.xz, uHome.xz));
  gl_PointSize = uSize * (0.5 + aSeed * 0.8 + near * 0.8) / -mv.z;
  vH = clamp((p.y - uLow) / (uHigh - uLow), 0.0, 1.0);
  vA = uAlpha * (0.6 + 0.4 * sin(uTime * 1.7 + aSeed * 60.0)) * (0.6 + near);
}`;

export const DUST_FRAG = /* glsl */ `
varying float vH;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vA;
  if (a < 0.01) discard;
  vec3 warm = vec3(1.0, 0.78, 0.45), cold = vec3(0.6, 0.78, 1.0);
  gl_FragColor = vec4(mix(warm, cold, smoothstep(0.3, 0.85, vH)) * a * 1.6, a);
}`;
