import { FRAG, VERT } from './shader';

/** Una foto real animada. Los archivos están en /live/<name>-{1200,1920}.webp y /live/<name>-aux.png */
export interface Scene {
  name: string;
  aspect: number;
  focus?: number;      // plano que no se mueve (0 lejos, 1 cerca)
  strength?: number;   // cuánto se mueve con el puntero
  night?: number;
  fog?: number;
  snow?: number;
  clouds?: number;
  twinkle?: number;
  glow?: number;       // halo de las luces
  sun?: [number, number, number];
  dolly?: number;      // acercamiento de cámara por profundidad
  zoom?: number;       // zoom base (oculta bordes)
  pan?: [number, number];
}

interface Loaded { col: WebGLTexture; aux: WebGLTexture }

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function softwareGL(gl: WebGL2RenderingContext) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const r = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  return /swiftshader|llvmpipe|softpipe|software/i.test(r);
}

/** Espera a que la página haya cargado y el hilo principal esté libre. */
const whenIdle = () => new Promise<void>((res) => {
  const go = () => ('requestIdleCallback' in window ? requestIdleCallback(() => res(), { timeout: 1500 }) : setTimeout(res, 300));
  if (document.readyState === 'complete') go();
  else addEventListener('load', go, { once: true });
});

export class LivePhoto {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private tex = new Map<string, Loaded | Promise<Loaded>>();
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private visible = false;
  private raf = 0;
  private t0 = performance.now();
  private motion = reduced() ? 0 : 1;
  private quality = 1;
  private frames = 0;
  private slow = 0;
  private lastT = 0;
  private fallbackName = '';

  /** Estado que se puede animar desde fuera. */
  a: Scene;
  b: Scene;
  mix = 0;
  hi: [number, number, number, number] = [0, 0, 0, 0];
  hiOn = 0;
  onReady?: () => void;

  constructor(readonly host: HTMLElement, first: Scene, opts: { pointer?: boolean; label: string }) {
    this.a = first;
    this.b = first;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'live-canvas';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', opts.label);
    host.prepend(this.canvas);
    this.gl = this.canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    // Sin GPU real (render por software) la animación costaría demasiado: se muestra la foto fija.
    if (this.gl && softwareGL(this.gl) && !location.search.includes('gl=force')) {
      this.gl.getExtension('WEBGL_lose_context')?.loseContext();
      this.gl = null;
    }
    if (!this.gl) {
      this.canvas.remove();
      // Sin WebGL2: foto fija.
      host.classList.add('live-fallback');
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        host.classList.add('is-near');
        this.frame();
      }, { rootMargin: '120% 0px' });
      io.observe(host);
      return;
    }
    this.setup();

    // Se prepara al acercarse y solo pinta mientras se ve.
    const near = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      near.disconnect();
      host.classList.add('is-near');
      whenIdle().then(() => this.load(this.a)).then(() => {
        host.classList.add('live-ready');
        this.onReady?.();
        this.frame();
      });
    }, { rootMargin: '120% 0px' });
    near.observe(host);
    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.start();
    }).observe(host);

    new ResizeObserver(() => this.resize()).observe(host);

    if (opts.pointer && this.motion) {
      addEventListener('pointermove', (e) => {
        this.pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
        this.pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
      }, { passive: true });
      addEventListener('deviceorientation', (e) => {
        if (e.gamma == null || e.beta == null) return;
        this.pointer.tx = Math.max(-1, Math.min(1, e.gamma / 20));
        this.pointer.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 20));
      }, { passive: true });
    }
  }

  /** Precarga las texturas de una escena. */
  load(s: Scene): Promise<Loaded> {
    const have = this.tex.get(s.name);
    if (have) return Promise.resolve(have);
    const gl = this.gl!;
    const big = Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio, 2) > 1500;
    const img = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.decoding = 'async';
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    const p = Promise.all([img(`/live/${s.name}-${big ? 1920 : 1200}.webp`), img(`/live/${s.name}-aux.png`)]).then(([c, x]) => {
      const mk = (im: HTMLImageElement, mip: boolean) => {
        const t = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (mip) {
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        } else {
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        return t;
      };
      const done = { col: mk(c, false), aux: mk(x, true) };
      this.tex.set(s.name, done);
      return done;
    });
    this.tex.set(s.name, p);
    return p;
  }

  private setup() {
    const gl = this.gl!;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    gl.useProgram(p);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['uColA', 'uAuxA', 'uColB', 'uAuxB', 'uPA', 'uFA', 'uSunA', 'uCamA', 'uPB', 'uFB', 'uSunB', 'uCamB', 'uAspA', 'uAspB', 'uMix', 'uTime', 'uView', 'uPointer', 'uHi', 'uHiOn', 'uMotion']) {
      this.u[n] = gl.getUniformLocation(p, n);
    }
    gl.uniform1i(this.u.uColA, 0);
    gl.uniform1i(this.u.uAuxA, 1);
    gl.uniform1i(this.u.uColB, 2);
    gl.uniform1i(this.u.uAuxB, 3);
    this.resize();
  }

  private resize() {
    if (!this.gl) return;
    const r = this.host.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, innerWidth < 800 ? 1.5 : 1.75) * this.quality;
    this.canvas.width = Math.max(2, Math.round(r.width * dpr));
    this.canvas.height = Math.max(2, Math.round(r.height * dpr));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if (!this.raf) this.frame();
  }

  private start() {
    if (!this.raf && this.gl) this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.raf = 0;
    if (!this.visible) return;
    // Si el dispositivo no llega, se baja la resolución del lienzo (hasta dos veces).
    if (this.lastT && this.quality > 0.55) {
      const dt = now - this.lastT;
      this.frames++;
      if (dt > 26) this.slow++;
      if (this.frames >= 45) {
        if (this.slow > 20) {
          this.quality *= 0.72;
          this.resize();
        }
        this.frames = this.slow = 0;
      }
    }
    this.lastT = now;
    this.frame();
    if (this.motion) this.raf = requestAnimationFrame(this.tick);
  };

  private bind(s: Scene, unit: number, suffix: 'A' | 'B') {
    const gl = this.gl!;
    const t = this.tex.get(s.name);
    if (!t || t instanceof Promise) return false;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t.col);
    gl.activeTexture(gl.TEXTURE0 + unit + 1);
    gl.bindTexture(gl.TEXTURE_2D, t.aux);
    gl.uniform4f(this.u['uP' + suffix], s.focus ?? 0.5, s.strength ?? 0.03, s.night ?? 0, s.fog ?? 0);
    gl.uniform4f(this.u['uF' + suffix], s.snow ?? 0, s.clouds ?? 0, s.twinkle ?? 0, s.glow ?? 0);
    const sun = s.sun ?? [0, 0, 0];
    gl.uniform4f(this.u['uSun' + suffix], sun[0], 1 - sun[1], sun[2], 0);
    const pan = s.pan ?? [0, 0];
    gl.uniform4f(this.u['uCam' + suffix], (s.dolly ?? 0) * this.motion, pan[0], -pan[1], s.zoom ?? 1.06);
    gl.uniform1f(this.u['uAsp' + suffix], s.aspect);
    return true;
  }

  frame() {
    const gl = this.gl;
    if (!gl) {
      // Sin animación: al menos se cambia la foto de fondo cuando cambia la escena.
      const s = this.mix > 0.5 ? this.b : this.a;
      if (s.name !== this.fallbackName && this.host.classList.contains('is-near')) {
        this.fallbackName = s.name;
        this.host.style.backgroundImage = `url(/live/${s.name}-1200.webp)`;
      }
      return;
    }
    const p = this.pointer;
    p.x += (p.tx - p.x) * 0.05;
    p.y += (p.ty - p.y) * 0.05;
    if (!this.bind(this.a, 0, 'A')) return;
    const useB = this.mix > 0.001 && this.bind(this.b, 2, 'B');
    gl.uniform1f(this.u.uMix, useB ? this.mix : 0);
    gl.uniform1f(this.u.uTime, (performance.now() - this.t0) / 1000);
    gl.uniform2f(this.u.uView, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u.uPointer, p.x, -p.y);
    gl.uniform4f(this.u.uHi, this.hi[0], 1 - this.hi[3], this.hi[2], 1 - this.hi[1]);
    gl.uniform1f(this.u.uHiOn, this.hiOn);
    gl.uniform1f(this.u.uMotion, this.motion);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Repinta una vez (útil con movimiento reducido, donde no hay bucle). */
  redraw() {
    if (!this.motion || !this.gl) this.frame();
  }
}
