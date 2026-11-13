"""Prepara el mapa 3D del valle a partir de datos públicos de elevación.

Entrada:
  - Teselas Terrarium (AWS Open Data «Terrain Tiles», Mapzen) en DEM_DIR/t/{x}_{y}.png y DEM_DIR/range.txt
  - Rutas GPX de la web oficial en GPX_DIR/*.gpx
Salida (public/terrain/):
  - height.png   altura en 16 bits (R = byte alto, G = byte bajo)
  - color.webp   textura pintada a partir del relieve (prado, bosque, roca caliza, ríos)
  - meta.json    límites geográficos, alturas y rutas simplificadas

Uso: DEM_DIR=... GPX_DIR=... python3 tools/terrain.py
"""
import glob, json, math, os, re
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public/terrain/')
DEM = os.environ['DEM_DIR']
GPX = os.environ['GPX_DIR']
os.makedirs(OUT, exist_ok=True)

BBOX = dict(west=-5.84, east=-5.28, north=43.08, south=42.80)

z, X0, X1, Y0, Y1 = map(int, open(os.path.join(DEM, 'range.txt')).read().split())
W, H = (X1 - X0 + 1) * 256, (Y1 - Y0 + 1) * 256
elev = np.zeros((H, W), np.float32)
for x in range(X0, X1 + 1):
    for y in range(Y0, Y1 + 1):
        a = np.asarray(Image.open(os.path.join(DEM, f't/{x}_{y}.png')).convert('RGB'), np.float32)
        elev[(y - Y0) * 256:(y - Y0 + 1) * 256, (x - X0) * 256:(x - X0 + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768

def merc(lat, lon):
    n = 2 ** z
    return ((lon + 180) / 360 * n - X0) * 256, ((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n - Y0) * 256

px0, py0 = merc(BBOX['north'], BBOX['west'])
px1, py1 = merc(BBOX['south'], BBOX['east'])
elev = elev[int(py0):int(py1), int(px0):int(px1)]
H, W = elev.shape
print('DEM', W, H, 'min', elev.min(), 'max', elev.max())

def resize(a, w, h, mode=Image.BILINEAR):
    return np.asarray(Image.fromarray(a.astype(np.float32), 'F').resize((w, h), mode), np.float32)

# —— Altura (16 bits) ——
HW = 512  # la malla usa 511 segmentos: más resolución no se ve
HH = round(HW * H / W)
hmap = resize(elev, HW, HH, Image.LANCZOS)
lo, hi = float(hmap.min()), float(hmap.max())
q = np.round((hmap - lo) / (hi - lo) * 65535).astype(np.uint32)
Image.fromarray(np.stack([(q >> 8).astype(np.uint8), (q & 255).astype(np.uint8), np.zeros_like(q, np.uint8)], -1)).save(OUT + 'height.png', optimize=True)

# —— Textura ——
TW = 3072
TH = round(TW * H / W)
e = resize(elev, TW, TH, Image.LANCZOS)
mpp = (BBOX['east'] - BBOX['west']) * 111320 * math.cos(math.radians(42.94)) / TW  # metros por píxel
gy, gx = np.gradient(e, mpp)
slope = np.degrees(np.arctan(np.hypot(gx, gy)))
aspect_n = -gy / (np.hypot(gx, gy) + 1e-6)  # 1 = ladera orientada al norte

rng = np.random.default_rng(3)
def fbm(shape, scales=(6, 14, 34, 80, 200), amps=(0.45, 0.25, 0.15, 0.1, 0.05)):
    out = np.zeros(shape, np.float32)
    for s, a in zip(scales, amps):
        r = rng.random((max(2, shape[0] * s // shape[1]), s)).astype(np.float32)
        out += a * resize(r, shape[1], shape[0], Image.BICUBIC)
    return out
n1, n2 = fbm(e.shape), fbm(e.shape)

def col(h):
    return np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
meadow, meadow_dry = col('#76854a'), col('#8f8a5c')
forest, forest_autumn = col('#2c3d22'), col('#5b4a2a')
scrub = col('#6e6247')  # brezo y matorral de altura
rock, rock_dark = col('#8e8778'), col('#6a655b')
snow = col('#eef1f4')

rel = (e - e.min()) / (e.max() - e.min())
# Bosque: laderas medias, más en umbría, repartido por ruido.
forest_p = np.clip((0.62 + 0.35 * aspect_n - np.abs(e - 1200) / 650 + (n1 - 0.5) * 1.8), 0, 1)
forest_p *= np.clip((38 - slope) / 12, 0, 1)
forest_m = np.clip((forest_p - 0.42) * 3.2, 0, 1)
rock_m = np.clip((slope - 32) / 12, 0, 1) * np.clip((e - 1050) / 250, 0, 1)
rock_m = np.clip(rock_m + np.clip((e - 1850) / 250, 0, 1) * 0.45, 0, 1)
snow_m = np.clip((e - 2060) / 120, 0, 1) * np.clip((40 - slope) / 15, 0, 1) * 0.85

c = meadow[None, None] * (1 - n2[..., None] * 0.5) + meadow_dry[None, None] * (n2[..., None] * 0.5)
c = c * (1 - np.clip((e[..., None] - 1500) / 400, 0, 0.6)) + scrub * np.clip((e[..., None] - 1500) / 400, 0, 0.6)
fcol = forest * (1 - np.clip(n1[..., None] - 0.45, 0, 0.35) * 2) + forest_autumn * np.clip(n1[..., None] - 0.45, 0, 0.35) * 2
c = c * (1 - forest_m[..., None]) + fcol * forest_m[..., None]
rcol = rock * (1 - n2[..., None] * 0.6) + rock_dark * n2[..., None] * 0.6
c = c * (1 - rock_m[..., None]) + rcol * rock_m[..., None]
c = c * (1 - snow_m[..., None]) + snow * snow_m[..., None]

# Ríos: acumulación de flujo (D8) sobre una malla más pequeña.
RW = 768
RH = round(RW * H / W)
r = resize(elev, RW, RH, Image.LANCZOS)
# Relleno de depresiones (priority-flood con épsilon) para que el agua siempre encuentre salida.
import heapq
filled = r.copy().ravel()
seen = np.zeros(r.size, bool)
heap = []
for y in range(RH):
    for x in (0, RW - 1):
        i = y * RW + x; heapq.heappush(heap, (filled[i], i)); seen[i] = True
for x in range(1, RW - 1):
    for y in (0, RH - 1):
        i = y * RW + x; heapq.heappush(heap, (filled[i], i)); seen[i] = True
while heap:
    h, i = heapq.heappop(heap)
    y, x = divmod(i, RW)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            yy, xx = y + dy, x + dx
            if (dy or dx) and 0 <= yy < RH and 0 <= xx < RW:
                j = yy * RW + xx
                if not seen[j]:
                    seen[j] = True
                    if filled[j] <= h:
                        filled[j] = h + 0.01
                    heapq.heappush(heap, (filled[j], j))
r = filled.reshape(RH, RW)
order = np.argsort(r, axis=None)[::-1]
acc = np.ones(r.size, np.float32)
flat = r.ravel()
nbr = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
for idx in order:
    y, x = divmod(int(idx), RW)
    best, bi = 0.0, -1
    for dy, dx in nbr:
        yy, xx = y + dy, x + dx
        if 0 <= yy < RH and 0 <= xx < RW:
            drop = (flat[idx] - flat[yy * RW + xx]) / (1.414 if dy and dx else 1.0)
            if drop > best:
                best, bi = drop, yy * RW + xx
    if bi >= 0:
        acc[bi] += acc[idx]
acc = acc.reshape(RH, RW)
print('acc max', acc.max(), 'p99', np.percentile(acc, 99), 'cells>400', int((acc > 400).sum()))
river = np.clip((np.log10(acc) - 3.0) / 1.4, 0, 1)
river = resize(river, TW, TH, Image.BILINEAR)
river = np.asarray(Image.fromarray((river * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255
water = col('#5f8fa8')
bank = col('#5d7d3c')
c = c * (1 - np.clip(river * 1.6, 0, 1)[..., None] * 0.5) + bank * np.clip(river * 1.6, 0, 1)[..., None] * 0.5
c = c * (1 - river[..., None] ** 1.5) + water * river[..., None] ** 1.5

# Oclusión ambiental aproximada: los fondos de valle, un poco más oscuros.
blur = resize(resize(e, TW // 24, TH // 24, Image.BILINEAR), TW, TH, Image.BICUBIC)
ao = np.clip(1 + (e - blur) / 520, 0.9, 1.04)
c *= ao[..., None]
c = np.clip(c, 0, 1)
Image.fromarray((c * 255).astype(np.uint8)).save(OUT + 'color.webp', quality=86, method=6)

# —— Rutas GPX ——
def lonlat_to_uv(lat, lon):
    x, y = merc(lat, lon)
    return (x - px0) / (px1 - px0), (y - py0) / (py1 - py0)

MPP_DEM = (BBOX['east'] - BBOX['west']) * 111320 * math.cos(math.radians(42.94)) / W
trails = {}
for f in sorted(glob.glob(os.path.join(GPX, '*.gpx'))):
    s = open(f).read()
    pts = re.findall(r'lat="([-0-9.]+)"\s+lon="([-0-9.]+)"', s) or [(b, a) for a, b in re.findall(r'lon="([-0-9.]+)"\s+lat="([-0-9.]+)"', s)]
    uv = [lonlat_to_uv(float(a), float(b)) for a, b in pts]
    # Simplificación: un punto cada ~60 m
    out, last = [], None
    for u, v in uv:
        if last is None or math.hypot(u - last[0], v - last[1]) * W * MPP_DEM > 40:
            out.append([round(u, 5), round(v, 5)])
            last = (u, v)
    trails[os.path.basename(f)[:-4]] = out

meta = dict(bbox=BBOX, elevMin=round(lo, 1), elevMax=round(hi, 1), sizeKm=[round((BBOX['east'] - BBOX['west']) * 111.32 * math.cos(math.radians(42.94)), 2), round((BBOX['north'] - BBOX['south']) * 111.32, 2)],
            height=[HW, HH], color=[TW, TH], mercator=dict(z=z, x0=X0, y0=Y0, px0=px0, py0=py0, px1=px1, py1=py1), trails=trails)
json.dump(meta, open(OUT + 'meta.json', 'w'), separators=(',', ':'))
print('ok', HW, HH, TW, TH, 'trails', {k: len(v) for k, v in trails.items()})
