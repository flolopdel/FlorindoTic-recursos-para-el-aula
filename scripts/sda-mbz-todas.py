#!/usr/bin/env python3
"""Genera la copia de Moodle (.mbz) de varias SdA de una vez (lo usa la Action de GitHub).

Uso:
  python scripts/sda-mbz-todas.py --out=copias [--base=origin/main] [--md=copias.md] [--huellas=huellas.json]
  python scripts/sda-mbz-todas.py --simular --base=origin/main --md=copias.md

Sin --base, genera la de todas las SdA de content/ que tienen sda<N>.json y moodle.html, y la de las recuperaciones
(recuperacion/sda-r<K>/sdar<K>.json).
Con --base, solo las de las SdA con cambios respecto a esa rama (o todas, si cambia scripts/sda-mbz.py).
Cada copia se llama <asignatura>-<curso>-sda<N>-moodle.mbz (con el curso académico delante si hay varios).
--md escribe una tabla en Markdown con lo que se ha generado.
--simular comprueba que cada copia se puede generar y no conserva ninguna (lo usa la PR para decir cuáles se crearán).
--huellas escribe un JSON con la huella de cada copia, calculada de lo que la origina y no del .mbz, que cambia en cada
generación porque lleva la hora dentro. Así se sabe qué copias han cambiado de verdad.
"""
import glob, hashlib, importlib.util, io, json, os, re, subprocess, sys, tempfile
from contextlib import redirect_stdout

sys.dont_write_bytecode = True

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('sda_mbz', os.path.join(RAIZ, 'scripts', 'sda-mbz.py'))
sda_mbz = importlib.util.module_from_spec(spec); spec.loader.exec_module(sda_mbz)

opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
OUT, BASE, MD, HUELLAS = opts.get('out', 'copias-moodle'), opts.get('base'), opts.get('md'), opts.get('huellas')
SIMULAR = '--simular' in sys.argv
temporal = tempfile.TemporaryDirectory() if SIMULAR else None
if SIMULAR:
    OUT = temporal.name
os.makedirs(OUT, exist_ok=True)


def huella(*rutas):
    h = hashlib.sha256()
    for ruta in rutas:
        with open(ruta, 'rb') as f:
            h.update(f.read())
    return h.hexdigest()


def es_sda(j):
    # sda<N>/sda<N>.json (SdA ordinaria) o recuperacion/sda-r<K>/sdar<K>.json (recuperación)
    carpeta, nombre = os.path.basename(os.path.dirname(j)), os.path.basename(j)[:-5]
    return (re.fullmatch(r'sda\d+', nombre) and nombre == carpeta) or (re.fullmatch(r'sdar\d+', nombre) and carpeta == 'sda-r' + nombre[4:])


carpetas = sorted(os.path.dirname(j) for patron in (('*', '*', '*', 'sda*', 'sda*.json'), ('*', '*', '*', 'recuperacion', 'sda-r*', 'sdar*.json'))
                  for j in glob.glob(os.path.join(RAIZ, 'content', *patron)) if es_sda(j))
carpetas = [c for c in carpetas if os.path.isfile(os.path.join(c, 'moodle.html'))]

if BASE:
    cambios = subprocess.run(['git', 'diff', '--name-only', f'{BASE}...HEAD'], cwd=RAIZ, capture_output=True, text=True, check=True).stdout.split()
    if not any(c.startswith('scripts/sda-mbz') for c in cambios):
        tocadas = {os.path.join(RAIZ, *c.split('/')[:5]) for c in cambios if re.match(r'content/[^/]+/[^/]+/[^/]+/sda\d+/', c)}
        tocadas |= {os.path.join(RAIZ, *c.split('/')[:6]) for c in cambios if re.match(r'content/[^/]+/[^/]+/[^/]+/recuperacion/sda-r\d+/', c)}
        carpetas = [c for c in carpetas if c in tocadas]

cursos_acad = {os.path.relpath(c, RAIZ).split(os.sep)[1] for c in carpetas}
filas, errores, huellas = [], 0, {}
for c in carpetas:
    partes = os.path.relpath(c, RAIZ).split(os.sep)
    acad, asig, curso, sda = partes[1], partes[2], partes[3], partes[-1]
    json_sda = f'{sda}.json' if len(partes) == 5 else f'sdar{sda[5:]}.json'  # recuperacion/sda-r1/sdar1.json
    nombre = (f'{acad.replace("curso", "")}-' if len(cursos_acad) > 1 else '') + f'{asig}-{curso}-' + ('recuperacion-' if len(partes) == 6 else '') + f'{sda}-moodle.mbz'
    buf = io.StringIO()
    try:
        with redirect_stdout(buf):
            sda_mbz.main(os.path.join(c, json_sda), os.path.join(c, 'moodle.html'), os.path.join(OUT, nombre))
        linea = next(l for l in buf.getvalue().splitlines() if l.startswith('MBZ:'))
        m = re.search(r'tema (\d+) «(.*)» con el bloque HTML · (.*)$', linea)
        filas.append((nombre, m.group(1), m.group(2), m.group(3)) if m else (nombre, '?', '', linea))
        huellas[nombre] = huella(os.path.join(c, json_sda), os.path.join(c, 'moodle.html'), os.path.join(RAIZ, 'scripts', 'sda-mbz.py'))
        print('✔', nombre, '·', linea.split(' · ', 1)[-1])
    except Exception as e:  # una SdA mal formada no impide generar las demás
        errores += 1
        filas.append((nombre, '—', '', f'❌ No se pudo generar: {e}'))
        print('✖', nombre, e, file=sys.stderr)

if MD:
    with open(MD, 'w', encoding='utf-8') as f:
        if not filas:
            f.write('Ninguna SdA con cambios: esta PR no cambia ninguna copia de Moodle.\n')
        else:
            f.write('| Copia | Tema | Sección | Tareas |\n|---|---|---|---|\n')
            for n, t, s, r in filas:
                f.write(f'| `{n}` | {t} | {s} | {r} |\n')
if HUELLAS:
    with open(HUELLAS, 'w', encoding='utf-8') as f:
        json.dump(huellas, f, indent=2)
print(f'{len(filas) - errores} copias ' + ('comprobadas' if SIMULAR else f'generadas en {OUT}/') + (f' · {errores} con error' if errores else ''))
if temporal:
    temporal.cleanup()
sys.exit(1 if errores else 0)
