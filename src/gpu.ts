// ¿Hay una GPU real? Se comprueba con un lienzo WebGL2 diminuto, sin descargar Three.js.
// Sin GPU (render por software) las escenas 3D irían a tirones: se muestran fotos y listas.

let cached: boolean | null = null;

export function hasRealGPU(): boolean {
  if (location.search.includes('gl=force') || location.hash === '#gl') return true;
  if (cached !== null) return cached;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return (cached = false);
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    cached = !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

/** Rechaza una promesa que tarda más de `ms` (para que nada se quede colgado). */
export function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((res, rej) => {
    const id = setTimeout(() => rej(new Error(`${what}: más de ${ms} ms`)), ms);
    p.then((v) => { clearTimeout(id); res(v); }, (e) => { clearTimeout(id); rej(e); });
  });
}
