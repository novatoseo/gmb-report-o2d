// Shader de «foto viva»: parallax 3D con el mapa de profundidad, nubes que fluyen,
// niebla, nieve, luces que titilan, paso a la noche con estrellas, destello del sol y grano.
// Textura aux: R = profundidad (1 = cerca), G = cielo, B = luces.

export const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uColA, uAuxA, uColB, uAuxB;
uniform vec4 uPA, uFA, uSunA, uCamA;   // escena A
uniform vec4 uPB, uFB, uSunB, uCamB;   // escena B
uniform float uAspA, uAspB;
uniform float uMix;                    // 0 = A, 1 = B
uniform float uTime;
uniform vec2 uView;                    // tamaño del lienzo (px)
uniform vec2 uPointer;                 // -1..1
uniform vec4 uHi;                      // rectángulo resaltado (uv imagen)
uniform float uHiOn;
uniform float uMotion;                 // 0 = movimiento reducido

// uP:   x foco, y fuerza parallax, z noche, w niebla
// uF:   x nieve, y nubes, z titileo, w brillo de luces
// uSun: xy posición, z intensidad
// uCam: x dolly, yz encuadre, w zoom base

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}

vec2 cover(vec2 uv, float asp, vec4 cam) {
  float va = uView.x / uView.y;
  vec2 s = va > asp ? vec2(1.0, asp / va) : vec2(va / asp, 1.0);
  return (uv - 0.5) * s / cam.w + 0.5 + cam.yz;
}

// Desplazamiento por profundidad (iterado para que el borde siga al objeto correcto).
vec2 parallax(sampler2D aux, vec2 uv, vec4 P, vec4 cam) {
  vec2 off = uPointer * P.y * uMotion;
  vec2 p = uv;
  for (int i = 0; i < 4; i++) {
    float d = texture(aux, p).r - P.x;
    p = 0.5 + (uv - 0.5) / (1.0 + cam.x * d) + off * d;
  }
  return clamp(p, vec2(0.001), vec2(0.999));
}

float snowLayer(vec2 uv, float scale, float speed, float t, float size) {
  uv *= scale;
  uv.y += t * speed;
  uv.x += sin(uv.y * 0.35 + t * 0.6) * 0.35;
  vec2 id = floor(uv);
  vec2 f = fract(uv) - 0.5;
  float h = hash(id);
  if (h < 0.45) return 0.0;
  vec2 c = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
  float r = size * mix(0.5, 1.0, hash(id + 1.9));
  return smoothstep(r, r * 0.25, length(f - c * 0.7));
}

vec3 shade(sampler2D col, sampler2D aux, float asp, vec4 P, vec4 F, vec4 S, vec4 cam, out float depthOut) {
  vec2 uv = cover(vUv, asp, cam);
  vec2 p = parallax(aux, uv, P, cam);
  vec3 a = texture(aux, p).rgb;
  float depth = a.r, sky = a.g, lights = a.b;
  depthOut = depth;
  float t = uTime * uMotion;

  // Nubes: el cielo fluye con un campo de ruido en dos fases (sin saltos).
  vec3 c;
  if (F.y > 0.0 && sky > 0.01) {
    vec2 flow = vec2(1.0, 0.12) * F.y;
    float ph = fract(t * 0.035);
    float ph2 = fract(t * 0.035 + 0.5);
    vec2 n = vec2(fbm(p * 4.0 + t * 0.02), fbm(p * 4.0 + 9.0)) - 0.5;
    float k = sky * sky;
    vec2 o1 = (flow * 0.03 + n * 0.012) * ph * k;
    vec2 o2 = (flow * 0.03 + n * 0.012) * ph2 * k;
    vec3 c1 = texture(col, p - o1).rgb;
    vec3 c2 = texture(col, p - o2).rgb;
    c = mix(c1, c2, abs(ph - 0.5) * 2.0);
  } else {
    c = texture(col, p).rgb;
  }
  vec3 orig = c;

  // Destello del sol.
  if (S.z > 0.0) {
    vec2 d = (p - S.xy) * vec2(asp, 1.0);
    float r = length(d);
    float breathe = 0.92 + 0.08 * sin(t * 0.8);
    c += vec3(1.0, 0.75, 0.45) * S.z * breathe * (exp(-r * 5.0) * 0.35 + exp(-r * 22.0) * 0.5) * (1.0 - P.z);
  }

  // Luces de las casas: titilan y desbordan un poco su contorno (halo).
  float tw = 0.88 + 0.12 * sin(t * 2.6 + hash(floor(p * 240.0)) * 6.283);
  float halo = textureLod(aux, p, 2.5).b;
  float lm = smoothstep(0.12, 0.55, lights);
  float room = smoothstep(0.05, 0.32, textureLod(aux, p, 1.8).b); // la cristalera entera, sin parches
  vec3 warm = vec3(1.0, 0.72, 0.38);

  // Noche: se apaga la escena (luz de luna fría) y quedan las ventanas encendidas.
  float night = P.z;
  if (night > 0.0) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    vec3 moon = vec3(0.30, 0.40, 0.66) * l * 0.78 + vec3(0.012, 0.018, 0.04);
    moon = mix(moon, c * vec3(0.18, 0.24, 0.42), 0.35);
    moon = mix(moon, vec3(0.025, 0.04, 0.11) + moon * 0.4, sky);
    c = mix(c, moon, night);
    // estrellas
    vec2 g = vUv * uView / 2.2;
    float st = step(0.996, hash(floor(g))) * (0.5 + 0.5 * sin(t * 2.0 + hash(floor(g) + 4.0) * 30.0));
    c += st * sky * night * 0.9;
  }
  float glow = F.w * mix(0.25, 1.0, night);
  c = mix(c, orig * mix(0.75, 1.2, lm) * tw, max(lm, room * 0.85) * clamp(night * 1.2, 0.0, 1.0));
  c += warm * (halo * 0.32 * glow * (0.4 + night) + lm * F.z * 0.08 * tw);

  // Niebla que avanza despacio, más densa a lo lejos.
  if (P.w > 0.0) {
    float fg = fbm(vec2(p.x * 3.0 - t * 0.025, p.y * 7.0 + t * 0.006));
    float dens = P.w * pow(1.0 - depth, 1.4) * smoothstep(0.3, 0.75, fg);
    vec3 fogCol = mix(vec3(0.92, 0.93, 0.96), vec3(0.18, 0.22, 0.34), night);
    c = mix(c, fogCol, clamp(dens, 0.0, 0.85));
  }

  // Nieve en tres capas de distinta distancia (las cercanas se mueven más con el puntero).
  if (F.x > 0.0) {
    vec2 s = vUv * vec2(uView.x / uView.y, 1.0);
    float fl = 0.0;
    fl += snowLayer(s + uPointer * 0.010, 16.0, 0.9, t, 0.09) * 0.5;
    fl += snowLayer(s + uPointer * 0.025, 10.0, 1.3, t + 13.0, 0.09) * 0.75;
    fl += snowLayer(s + uPointer * 0.050, 6.0, 1.9, t + 31.0, 0.08);
    c = mix(c, vec3(1.0), clamp(fl, 0.0, 1.0) * F.x * 0.9);
  }

  // Resaltado de una zona (las casas): el resto se atenúa.
  if (uHiOn > 0.0) {
    vec2 q = smoothstep(uHi.xy - 0.012, uHi.xy + 0.012, p) * (1.0 - smoothstep(uHi.zw - 0.012, uHi.zw + 0.012, p));
    float inside = q.x * q.y;
    c = mix(c, c * mix(0.45, 1.12, inside) + warm * halo * inside * 0.5, uHiOn);
  }
  return c;
}

void main() {
  float dA, dB;
  vec3 a = shade(uColA, uAuxA, uAspA, uPA, uFA, uSunA, uCamA, dA);
  vec3 c = a;
  if (uMix > 0.001) {
    vec3 b = shade(uColB, uAuxB, uAspB, uPB, uFB, uSunB, uCamB, dB);
    // Transición con profundidad: lo lejano cambia antes que lo cercano.
    // Revelado orgánico: un frente con ruido que avanza de lejos a cerca, sin doble exposición.
    float w = uMix * 1.9 - 0.45 + (fbm(vUv * 3.0 + 4.0) - 0.5) * 0.5 + (0.5 - dA) * 0.3;
    float m = smoothstep(0.44, 0.56, w);
    float edge = smoothstep(0.38, 0.5, w) * (1.0 - smoothstep(0.5, 0.62, w));
    c = mix(a, b, m) + vec3(1.0, 0.92, 0.8) * edge * 0.08;
  }
  // Viñeta y grano de película.
  vec2 v = vUv - 0.5;
  c *= 1.0 - dot(v, v) * 0.55;
  c += (hash(vUv * uView + fract(uTime) * 100.0) - 0.5) * 0.035;
  outColor = vec4(c, 1.0);
}`;
