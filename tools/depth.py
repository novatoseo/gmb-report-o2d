"""Genera los mapas de profundidad/cielo/luces de public/live/ con Depth Anything V2 (ONNX).

Uso: DEPTH_MODEL=ruta/model.onnx python3 tools/depth.py [nombre ...]
Modelo: https://huggingface.co/onnx-community/depth-anything-v2-small (onnx/model.onnx)
"""
import os, sys, numpy as np, onnxruntime as ort
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'public/photos/')
OUT = os.path.join(ROOT, 'public/live/')
os.makedirs(OUT, exist_ok=True)
sess = ort.InferenceSession(os.environ.get('DEPTH_MODEL', 'model.onnx'), providers=['CPUExecutionProvider'])
MEAN = np.array([0.485, 0.456, 0.406]); STD = np.array([0.229, 0.224, 0.225])

def depth(img):
    w, h = 1036, int(round(1036 * img.height / img.width / 14)) * 14
    x = np.asarray(img.resize((w, h), Image.BICUBIC), dtype=np.float32) / 255.0
    x = ((x - MEAN) / STD).transpose(2, 0, 1)[None].astype(np.float32)
    d = sess.run(None, {'pixel_values': x})[0][0]
    d = (d - d.min()) / (d.max() - d.min() + 1e-6)
    return d

JOBS = {
  # nombre: (archivo, ¿tiene cielo?, caja de luces (x0, y0, x1, y1) o None)
  'atardecer': ('hero/slide-03.webp', True, (0.336, 0.585, 0.674, 0.72), 0.42, 0.06),
  'fachada':   ('hero/slide-01.webp', True, (0.0, 0.25, 1.0, 0.66), 0.62, 0.12),
  'amanecer':  ('dron/otono-paisaje-sol-1200.webp', True, None, 0, 0),
  'otono':     ('dron/otono-casas-cercano-1920.webp', True, None, 0, 0),
  'aerea':     ('hero/slide-02.webp', False, (0.31, 0.5, 0.6, 0.86), 0.6, 0.25),
  'camino':    ('hero/slide-04.webp', True, (0.3, 0.4, 0.62, 0.62), 0.62, 0.12),
  'invierno':  ('dron/invierno-casas-frontal-1920.webp', False, None, 0, 0),
}
names = sys.argv[1:] or list(JOBS)
for name in names:
    f, has_sky, box, vt, wt = JOBS[name]
    img = Image.open(P + f).convert('RGB')
    d = depth(img)
    W, H = 960, int(960 * img.height / img.width)
    dimg = Image.fromarray((d * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
    # Bordes: el primer plano "crece" un poco para que arrastre su contorno, y se suaviza.
    dimg = dimg.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2.2))
    dn = np.asarray(dimg, dtype=np.float32) / 255.0
    # Cielo: lo que el modelo pone en el infinito (profundidad casi cero) y conectado con el borde superior.
    yy = np.linspace(0, 1, H)[:, None] * np.ones((1, W))
    raw = np.asarray(Image.fromarray((d * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), dtype=np.float32) / 255
    sky = np.clip((0.035 - raw) / 0.025, 0, 1) * np.clip((0.8 - yy) / 0.2, 0, 1)
    if not has_sky: sky *= 0
    sky = np.asarray(Image.fromarray((sky * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), dtype=np.float32) / 255
    # Luces: píxeles cálidos y muy brillantes que no son cielo.
    small = np.asarray(img.resize((W, H), Image.BILINEAR), dtype=np.float32) / 255
    r, g, b = small[..., 0], small[..., 1], small[..., 2]
    v = small.max(-1)
    warm = np.clip((v - vt) / 0.25, 0, 1) * np.clip((r - b - wt) / 0.2, 0, 1) * (1 - sky) * (dn > 0.12)
    if box is None: warm *= 0
    else:
        xx = np.linspace(0, 1, W)[None, :] * np.ones((H, 1))
        x0, y0, x1, y1 = box
        warm *= (xx >= x0) * (xx <= x1) * (yy >= y0) * (yy <= y1)
    wimg = Image.fromarray((warm * 255).astype(np.uint8))
    if name == 'atardecer':
        # Cierre morfológico: une los reflejos sueltos en cristaleras enteras.
        wimg = wimg.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(7))
    warm = np.asarray(wimg.filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32) / 255
    aux = np.stack([dn, sky, warm], -1)
    Image.fromarray((aux * 255).astype(np.uint8)).save(OUT + f'{name}-aux.png', optimize=True)
    # Color en dos tamaños
    for cw in (1920, 1200):
        if img.width >= cw:
            img.resize((cw, int(cw * img.height / img.width)), Image.LANCZOS).save(OUT + f'{name}-{cw}.webp', quality=82, method=6)
    if img.width < 1920:
        img.save(OUT + f'{name}-1920.webp', quality=86, method=6)
    print(name, img.size, 'aux', (W, H), 'sky%', round(float(sky.mean()) * 100, 1), 'lights%', round(float((warm > 0.3).mean()) * 100, 2))
