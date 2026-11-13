// Tipos mínimos de troika-three-text (el paquete no trae declaraciones).
declare module 'troika-three-text' {
  import { Material, Mesh } from 'three';
  export class Text extends Mesh {
    text: string;
    font: string;
    fontSize: number;
    letterSpacing: number;
    lineHeight: number | 'normal';
    maxWidth: number;
    anchorX: number | 'left' | 'center' | 'right';
    anchorY: number | 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom';
    textAlign: 'left' | 'right' | 'center' | 'justify';
    material: Material;
    textRenderInfo: { blockBounds: [number, number, number, number] } | null;
    sync(callback?: () => void): void;
    dispose(): void;
  }
}
