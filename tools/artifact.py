"""Adapta la build de demostración (dist-artifact/) para publicarla como Artifact privado:
rutas relativas, HTML sin esqueleto propio y sin datos estructurados del negocio real."""
import os, re

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dist-artifact')
DIRS = ('photos', 'live', 'terrain')

for base, _, files in os.walk(ROOT):
    for f in files:
        p = os.path.join(base, f)
        if f.endswith('.js'):
            s = open(p, encoding='utf-8').read()
            s = re.sub(r'([`"\'(])/(%s)/' % '|'.join(DIRS), r'\1\2/', s)
            open(p, 'w', encoding='utf-8').write(s)
        elif f.endswith('.css'):
            s = open(p, encoding='utf-8').read()
            s = re.sub(r'url\(/(%s)/' % '|'.join(DIRS), r'url(../\1/', s)
            open(p, 'w', encoding='utf-8').write(s)

p = os.path.join(ROOT, 'index.html')
s = open(p, encoding='utf-8').read()
s = re.sub(r'<script type="application/ld\+json">.*?</script>\s*', '', s, flags=re.S)
s = re.sub(r'<!doctype html>\s*', '', s, flags=re.I)
s = re.sub(r'</?html[^>]*>\s*', '', s)
s = re.sub(r'</?head>\s*', '', s)
s = re.sub(r'<body>\s*', '', s)
s = re.sub(r'</body>\s*', '', s)
s = re.sub(r'<meta charset="UTF-8" />\s*', '', s)
s = re.sub(r'<meta name="viewport"[^>]*>\s*', '', s)
s = re.sub(r'<title>.*?</title>', '<title>Concepto Finca del Valle</title>', s)
s = re.sub(r'(src|href|content)="/(%s|favicon\.svg)' % '|'.join(DIRS), r'\1="\2', s)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
