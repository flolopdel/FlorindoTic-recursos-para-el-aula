#!/usr/bin/env python3
"""Genera la copia de Moodle (.mbz) de varias SdA de una vez (lo usa la Action de GitHub).

Uso:
  python scripts/sda-mbz-todas.py --out=copias [--base=origin/main] [--md=copias.md]

Sin --base, genera la de todas las SdA de content/ que tienen sda<N>.json y moodle.html.
Con --base, solo las de las SdA con cambios respecto a esa rama (o todas, si cambia scripts/sda-mbz.py).
Cada copia se llama <asignatura>-<curso>-sda<N>-moodle.mbz (con el curso académico delante si hay varios).
--md escribe una tabla en Markdown con lo que se ha generado.
"""
import glob, importlib.util, io, os, re, subprocess, sys
from contextlib import redirect_stdout

sys.dont_write_bytecode = True

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('sda_mbz', os.path.join(RAIZ, 'scripts', 'sda-mbz.py'))
sda_mbz = importlib.util.module_from_spec(spec); spec.loader.exec_module(sda_mbz)

opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
OUT, BASE, MD = opts.get('out', 'copias-moodle'), opts.get('base'), opts.get('md')
os.makedirs(OUT, exist_ok=True)

carpetas = sorted(os.path.dirname(j) for j in glob.glob(os.path.join(RAIZ, 'content', '*', '*', '*', 'sda*', 'sda*.json'))
                  if re.fullmatch(r'sda\d+\.json', os.path.basename(j)) and os.path.basename(j)[:-5] == os.path.basename(os.path.dirname(j)))
carpetas = [c for c in carpetas if os.path.isfile(os.path.join(c, 'moodle.html'))]

if BASE:
    cambios = subprocess.run(['git', 'diff', '--name-only', f'{BASE}...HEAD'], cwd=RAIZ, capture_output=True, text=True, check=True).stdout.split()
    if not any(c.startswith('scripts/sda-mbz') for c in cambios):
        tocadas = {os.path.join(RAIZ, *c.split('/')[:5]) for c in cambios if re.match(r'content/[^/]+/[^/]+/[^/]+/sda\d+/', c)}
        carpetas = [c for c in carpetas if c in tocadas]

cursos_acad = {os.path.relpath(c, RAIZ).split(os.sep)[1] for c in carpetas}
filas, errores = [], 0
for c in carpetas:
    _, acad, asig, curso, sda = os.path.relpath(c, RAIZ).split(os.sep)
    nombre = (f'{acad.replace("curso", "")}-' if len(cursos_acad) > 1 else '') + f'{asig}-{curso}-{sda}-moodle.mbz'
    buf = io.StringIO()
    try:
        with redirect_stdout(buf):
            sda_mbz.main(os.path.join(c, f'{sda}.json'), os.path.join(c, 'moodle.html'), os.path.join(OUT, nombre))
        linea = buf.getvalue().strip().splitlines()[-1]
        m = re.search(r'tema (\d+) «(.*)» con el bloque HTML · (.*)$', linea)
        filas.append((nombre, m.group(1), m.group(2), m.group(3)) if m else (nombre, '?', '', linea))
        print('✔', nombre, '·', linea.split(' · ', 1)[-1])
    except Exception as e:  # una SdA mal formada no impide generar las demás
        errores += 1
        filas.append((nombre, '—', '', f'❌ No se pudo generar: {e}'))
        print('✖', nombre, e, file=sys.stderr)

if MD:
    with open(MD, 'w', encoding='utf-8') as f:
        if not filas:
            f.write('Ninguna SdA con cambios: no hay copias de Moodle que generar.\n')
        else:
            f.write('| Copia | Tema | Sección | Tareas |\n|---|---|---|---|\n')
            for n, t, s, r in filas:
                f.write(f'| `{n}` | {t} | {s} | {r} |\n')
print(f'{len(filas) - errores} copias generadas en {OUT}/' + (f' · {errores} con error' if errores else ''))
sys.exit(1 if errores else 0)
