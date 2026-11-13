// Cursor acompañante (solo con ratón y sin movimiento reducido): un anillo que sigue al puntero
// con inercia y crece sobre lo que se puede pulsar. El cursor normal sigue visible.

export function initCursor(reduced: boolean) {
  if (reduced || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(ring);
  let x = -100, y = -100, tx = -100, ty = -100;
  addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    const hot = (e.target as Element).closest?.('a, button, input, label, summary, .pin');
    ring.classList.toggle('is-hot', !!hot);
  }, { passive: true });
  document.addEventListener('pointerleave', () => ring.classList.add('is-out'));
  document.addEventListener('pointerenter', () => ring.classList.remove('is-out'));
  const loop = () => {
    x += (tx - x) * 0.18;
    y += (ty - y) * 0.18;
    ring.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(loop);
  };
  loop();
}
