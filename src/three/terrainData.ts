import * as THREE from 'three';
import { asset } from '../asset';

// Datos del relieve real (preparados con tools/terrain.py), compartidos por el mapa y el viaje.
// Unidades del mundo: kilómetros; la altura va exagerada para que se lea el relieve.

export interface TerrainMeta {
  bbox: { west: number; east: number; north: number; south: number };
  elevMin: number;
  elevMax: number;
  sizeKm: [number, number];
  height: [number, number];
  mercator: { z: number; x0: number; y0: number; px0: number; py0: number; px1: number; py1: number };
  trails: Record<string, [number, number][]>;
}

export const EXAG = 1.35;

export class TerrainData {
  W: number;
  H: number;
  private heights: Float32Array;
  private hw: number;
  private hh: number;

  private constructor(readonly meta: TerrainMeta, img: HTMLImageElement, readonly color: THREE.Texture) {
    this.W = meta.sizeKm[0];
    this.H = this.W * (meta.height[1] / meta.height[0]);
    const cv = document.createElement('canvas');
    cv.width = this.hw = img.width;
    cv.height = this.hh = img.height;
    const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const { elevMin: lo, elevMax: hi } = meta;
    this.heights = new Float32Array(cv.width * cv.height);
    for (let i = 0; i < this.heights.length; i++) this.heights[i] = lo + ((d[i * 4] * 256 + d[i * 4 + 1]) / 65535) * (hi - lo);
  }

  static async load(): Promise<TerrainData> {
    const [meta, img, color] = await Promise.all([
      fetch(asset('terrain/meta.json')).then((r) => r.json() as Promise<TerrainMeta>),
      new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = asset('terrain/height.png');
      }),
      new THREE.TextureLoader().loadAsync(asset('terrain/color.webp')),
    ]);
    color.colorSpace = THREE.SRGBColorSpace;
    return new TerrainData(meta, img, color);
  }

  /** Altura real en metros en (u, v). */
  metersAt(u: number, v: number) {
    const x = THREE.MathUtils.clamp(u, 0, 1) * (this.hw - 1);
    const y = THREE.MathUtils.clamp(v, 0, 1) * (this.hh - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, this.hw - 1), y1 = Math.min(y0 + 1, this.hh - 1);
    const fx = x - x0, fy = y - y0;
    const h = this.heights;
    const a = h[y0 * this.hw + x0] * (1 - fx) + h[y0 * this.hw + x1] * fx;
    const b = h[y1 * this.hw + x0] * (1 - fx) + h[y1 * this.hw + x1] * fx;
    return a * (1 - fy) + b * fy;
  }

  /** Altura del mundo (km, exagerada). */
  heightAt(u: number, v: number) {
    return (this.metersAt(u, v) / 1000) * EXAG;
  }

  uv(lat: number, lon: number): [number, number] {
    const m = this.meta.mercator;
    const n = 2 ** m.z;
    const x = ((lon + 180) / 360 * n - m.x0) * 256;
    const y = ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2 * n - m.y0) * 256;
    return [(x - m.px0) / (m.px1 - m.px0), (y - m.py0) / (m.py1 - m.py0)];
  }

  /** Coordenadas de imagen → latitud/longitud (para el HUD). */
  lonLat(u: number, v: number): [number, number] {
    const m = this.meta.mercator;
    const n = 2 ** m.z;
    const x = (m.px0 + u * (m.px1 - m.px0)) / 256 + m.x0;
    const y = (m.py0 + v * (m.py1 - m.py0)) / 256 + m.y0;
    const lon = (x / n) * 360 - 180;
    const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
    return [lat, lon];
  }

  world(u: number, v: number, lift = 0) {
    return new THREE.Vector3((u - 0.5) * this.W, this.heightAt(u, v) + lift, (v - 0.5) * this.H);
  }

  worldLL(lat: number, lon: number, lift = 0) {
    return this.world(...this.uv(lat, lon), lift);
  }

  /** Posición del mundo → (u, v). */
  toUv(p: THREE.Vector3): [number, number] {
    return [p.x / this.W + 0.5, p.z / this.H + 0.5];
  }

  geometry(segments = 511) {
    const seg = [segments, Math.round((segments * this.H) / this.W)];
    const geo = new THREE.PlaneGeometry(this.W, this.H, seg[0], seg[1]);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, this.heightAt(pos.getX(i) / this.W + 0.5, pos.getZ(i) / this.H + 0.5));
    geo.computeVertexNormals();
    return geo;
  }
}
