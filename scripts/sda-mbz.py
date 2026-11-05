#!/usr/bin/env python3
"""Copia de seguridad de Moodle (.mbz) con la sección de una SdA: su bloque HTML y sus Tareas.

Genera, sin necesidad de un Moodle, una copia de curso en formato Moodle 4.1 (se restaura en Moodle 4.1 o
posterior) que contiene solo una sección (tema), visible, con:
  - el nombre de la SdA («SdA 2: Código en Acción…», de meta.titulo) y, como descripción de la sección,
    el bloque HTML de la SdA (moodle.html);
  - todas las Tareas de la SdA (X.1, X.2…), ocultas, con una descripción completa para el alumnado (sesiones, forma de
    entrega y corrección; los documentos que usa con «Ver» y «Copiar a mi Drive»; la descripción del JSON;
    enlaces a las sesiones de la web de clase donde se trabajó y a sus recursos para repasar) y los PDF del repositorio que usa como archivos adjuntos; tipo de entrega y calificación:
    escala «Apto / No apto» (No apto, Apto) o rúbrica 1-3-5-7-10 (0,75-7,5 en las líneas de presentación pública
    cuando la rúbrica lleva pesos 66/33), sin fechas de apertura, entrega ni límite (no generan avisos).
No lleva foro de avisos, usuarios, grupos, bloques ni filtros. Se restaura con «Restaurar → Fusionar la copia de
seguridad con este curso» y «Sobrescribir configuración del curso: No».

Moodle coloca la sección por su número: por defecto es el tema N (N = número de la SdA). Si ese tema no existe en
el curso, se crea; si existe y está vacío (sin nombre ni descripción), toma el nombre y el bloque de la SdA; si ya
tiene nombre o descripción, los conserva y solo se añaden las Tareas al final. Para ponerla en otro tema (p. ej. el
siguiente libre del curso), usa --tema o pon "tema": T en el bloque "moodle" del JSON.

Recuperaciones (content/<curso>/<asignatura>/<curso>/recuperacion/sda-r<K>/sdar<K>.json, numero «R<K>»): sus Tareas
R<K>.1, R<K>.2… se tratan igual, y por defecto van al tema siguiente a las SdA ordinarias del curso (con sda1 y sda2,
R1 → tema 3, R2 → tema 4…).

Uso:  python scripts/sda-mbz.py sda<N>.json moodle.html sda<N>-moodle.mbz [--tema T]
"""
import html, io, json, os, re, sys, tarfile, time, hashlib

NULL = '$@NULL@$'
X = lambda s: html.escape(str(s), quote=False)
arr = lambda x: x if isinstance(x, list) else ([] if x is None else [x])


def enlaza(t):
    """Texto ya escapado: las direcciones http(s) pasan a enlaces que se abren en otra pestaña."""
    return re.sub(r'https?://[^\s<>"«»]+[^\s<>"«».,;:)]', lambda m: f'<a href="{m.group(0)}" target="_blank" rel="noopener">{m.group(0)}</a>', t)


def intro_html(txt):
    """Texto de la descripción (párrafos, «• » para viñetas) → HTML para Moodle."""
    out, lista = [], []
    def cierra():
        if lista:
            out.append('<ul>' + ''.join(f'<li>{enlaza(X(x))}</li>' for x in lista) + '</ul>'); lista.clear()
    for linea in str(txt or '').split('\n'):
        b = linea.strip()
        if not b: cierra(); continue
        if b.startswith('• '): lista.append(b[2:]); continue
        cierra()
        out.append(f'<p><strong>{X(b)}</strong></p>' if b.endswith(':') and len(b) < 60 else f'<p>{enlaza(X(b))}</p>')
    cierra()
    return '\n'.join(out)


def enlaces_doc(url):
    """Enlaces para el alumnado: los Docs/Hojas/Presentaciones de Google con /preview (ver) y /copy (copia en su
    Drive), nunca /edit; un archivo de Drive (p. ej. un PDF) con /view; cualquier otro enlace, tal cual."""
    url = str(url or '').strip()
    m = re.match(r'(https://docs\.google\.com/(?:document|spreadsheets|presentation|drawings)/d/[\w-]+)', url)
    if m:
        return [('Ver', m.group(1) + '/preview'), ('Copiar a mi Drive', m.group(1) + '/copy')]
    m = re.match(r'(https://drive\.google\.com/file/d/[\w-]+)', url)
    if m:
        return [('Ver', m.group(1) + '/view')]
    return [('Abrir', url)] if url.startswith('http') else []


def documentos_por_tarea(d):
    """Plantillas del anexo (con enlace) que usa cada Tarea: las que nombran la Tarea en su «entrega»
    («las Tareas 2.4, 2.5 y 2.8») y las que la Tarea cita en su texto («plantilla A4», «anexo A4»)."""
    an = d.get('anexos') or {}
    plantillas = [a for a in (an.get('plantillas', []) if isinstance(an, dict) else arr(an)) if isinstance(a, dict) and a.get('enlace')]
    por = {}
    for s in arr(d.get('sesiones')):
        for m in arr(s.get('moodle')):
            if m.get('recurso') != 'Tarea':
                continue
            cod = re.match(r'\s*(R?\d+\.\d+)', m['nombre'], re.I)
            cod = cod.group(1) if cod else None
            texto = json.dumps({k: m.get(k) for k in ('descripcion', 'uso', 'config', 'cotejo')}, ensure_ascii=False)
            docs = []
            for a in plantillas:
                ent = str(a.get('entrega') or '')
                nombrada = cod and re.search(r'\bTareas?\b', ent) and cod.upper() in [c.upper() for c in re.findall(r'\b(?:R)?\d+\.\d+\b', ent.split('Entrega')[0], re.I)]
                citada = re.search(r'\b' + re.escape(str(a.get('id'))) + r'\b', texto)
                if nombrada or citada:
                    docs.append(a)
            por[m['nombre']] = docs
    return por


def bloque_documentos(docs, papel=False):
    """Recuadro con los documentos que necesita la Tarea, al principio de la descripción para que nadie se lo salte."""
    if not docs:
        return ''
    li = []
    for a in docs:
        enl = ' · '.join(f'<a href="{html.escape(u)}" target="_blank" rel="noopener"><strong>{X(t)}</strong></a>'
                         for t, u in enlaces_doc(a['enlace']) if not (papel and t == 'Copiar a mi Drive'))
        li.append(f'<li>{X(a.get("id", ""))} · {X(a.get("titulo", ""))}: {enl}</li>')
    nota = ('Te la damos impresa en clase; aquí puedes verla.' if papel else
            'Pulsa «Copiar a mi Drive» para tener tu copia y trabajar en ella (con «Ver» solo la miras).')
    return ('<div style="border-left:4px solid #1a73e8 !important;background:#eef4fd !important;padding:8px 14px !important;margin:10px 0 !important;border-radius:6px !important">'
            '<p style="margin:4px 0 !important"><strong>📄 Documentos que necesitas para esta Tarea</strong></p>'
            f'<ul style="margin:4px 0 !important">{"".join(li)}</ul><p style="margin:4px 0 !important;font-size:90% !important">{nota}</p></div>')


def md(txt):
    """Texto de diapositiva (**negrita**, `código`) → HTML seguro."""
    t = X(txt)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    return re.sub(r'`([^`]+)`', r'<code>\1</code>', t)


def a_href(url, texto):
    return f'<a href="{html.escape(url)}" target="_blank" rel="noopener">{X(texto)}</a>'


def url_base(d, src):
    """Dirección web de la carpeta de la SdA (para enlazar clase.html, la teoría y la guía del alumnado)."""
    u = ((d.get('moodle') or {}).get('area_texto') or {}).get('url_clase') or ''
    if u.startswith('http'):
        return u.rsplit('/', 1)[0] + '/'
    ruta = os.path.abspath(src).replace(os.sep, '/')
    if '/content/' in ruta:
        return 'https://florindotic.es/content/' + ruta.split('/content/', 1)[1].rsplit('/', 1)[0] + '/'
    return ''


def ventanas(d):
    """Sesiones de cada Tarea: desde la sesión siguiente a la Tarea anterior hasta la suya, más las posteriores que su
    actividad de Séneca incluya (p. ej. las presentaciones). Las sesiones posteriores que otra Tarea reclama en Séneca
    no se repiten. Una Tarea puede fijarlas con "sesiones": [..] en el JSON."""
    ses = arr(d.get('sesiones'))
    pos = {s.get('n'): i for i, s in enumerate(ses)}
    con = [(i, m) for i, s in enumerate(ses) for m in arr(s.get('moodle')) if m.get('recurso') == 'Tarea']
    sen = {}
    for a in arr((d.get('seneca') or {}).get('actividades')):
        if a.get('tarea'):
            sen[str(a['tarea'])] = [pos[n] for n in arr(a.get('sesiones')) if n in pos]
    cod = lambda m: (re.match(r'\s*(R?\d+\.\d+)', m['nombre'], re.I) or [None, None])[1]
    reclamadas = {}  # sesiones posteriores a su Tarea que una actividad de Séneca incluye
    for i, m in con:
        for j in sen.get(cod(m), []):
            if j > i:
                reclamadas[j] = m['nombre']
    res, prev = {}, -1
    for i, m in con:
        if m.get('sesiones'):
            idx = [pos[n] for n in arr(m['sesiones']) if n in pos]
        else:
            idx = set(range(prev + 1, i + 1)) | {j for j in sen.get(cod(m), []) if j > i}
            idx = sorted(j for j in idx if reclamadas.get(j, m['nombre']) == m['nombre'])
            if not idx:  # comparte sesión con la Tarea anterior: usa las sesiones que cite su texto («sesiones 3 a 5»)
                txt = f"{m.get('uso', '')} {m.get('descripcion', '')}"
                r = re.search(r'sesi[oó]n(?:es)?\s+(\d+)(?:\s*(?:a|-|–|y)\s*(\d+))?', txt, re.I)
                if r:
                    a, b = int(r.group(1)), int(r.group(2) or r.group(1))
                    idx = [pos[n] for n in range(a, b + 1) if n in pos]
                idx = idx or [i]
        res[m['nombre']] = [ses[j] for j in idx]
        prev = max(prev, i)
    return res


def nombre_enlace(u):
    u = u.lower()
    for clave, txt in (('laboratorio', 'Abrir el laboratorio'), ('forms.gle', 'Abrir el formulario'), ('docs.google.com/forms', 'Abrir el formulario'),
                       ('scratch.mit.edu', 'Abrir en Scratch'), ('makecode', 'Abrir en MakeCode'), ('tinkercad', 'Abrir en Tinkercad'),
                       ('youtu', 'Ver el vídeo'), ('.pdf', 'Abrir el PDF')):
        if clave in u:
            return txt
    return 'Abrir el enlace'


def para_repasar(d, sesiones, carpeta, base):
    """Dónde se trabajó en clase: cada sesión de la Tarea en la web de clase, los recursos que se usaron en ellas
    (laboratorios, webs; no los documentos ni los formularios), la guía del alumnado, la teoría y la web de clase."""
    li, ns, vistos = [], {s.get('n') for s in sesiones}, set()
    for s in sesiones:
        if base:
            li.append(a_href(f'{base}clase.html#s{s.get("n")}', f'Sesión {s.get("n")} · {s.get("titulo", "")}'))
    recursos = []
    for s in sesiones:
        for x in arr((s.get('clase') or {}).get('diapositivas')):
            u = str(x.get('enlace') or '')
            if not u.startswith('http') or re.search(r'docs\.google|drive\.google|forms\.gle|/forms/', u) or u in vistos:
                continue
            vistos.add(u)
            recursos.append(a_href(u, f'{x.get("titulo") or nombre_enlace(u)}') + f' ({nombre_enlace(u).replace("Abrir ", "").replace("el enlace", "web")})')
    li += recursos[:4]
    aps = [ap for ap in arr((d.get('guia_alumnado') or {}).get('apartados')) if ns & set(arr(ap.get('sesiones')))]
    # los apartados principales (1, 2…); si no hay, los primeros subapartados; como mucho 3
    aps = [ap for ap in aps if '.' not in str(ap.get('id', ''))] or [ap for ap in aps if str(ap.get('id', '')).count('.') == 1]
    for ap in aps[:3]:
        if base:
            li.append(a_href(f'{base}guia-alumnado.html#a-{ap.get("id")}', f'Guía del alumnado · {ap.get("id")}. {ap.get("titulo", "")}'))
    if base and carpeta and os.path.isfile(os.path.join(carpeta, 'teoria.html')):
        li.append(a_href(f'{base}teoria.html', 'Teoría de la SdA'))
    if base:
        li.append(a_href(f'{base}clase.html', 'Web de clase de la SdA (todas las sesiones)'))
    return '<ul>' + ''.join(f'<li>{x}</li>' for x in li) + '</ul>' if li else ''


def adjuntos_de(m, docs, sesiones, carpeta):
    """PDF y documentos del repositorio que se adjuntan a la Tarea: el "pdf" (o "adjunto") de sus plantillas, los
    "adjuntos" de la Tarea y los PDF de la carpeta de la SdA que la Tarea o sus prácticas nombran o enlazan."""
    if not carpeta:
        return []
    nombres = []
    for a in docs:
        nombres += arr(a.get('pdf')) + arr(a.get('adjunto'))
    nombres += arr(m.get('adjuntos'))
    texto = json.dumps(m, ensure_ascii=False) + json.dumps([s.get('clase') for s in sesiones], ensure_ascii=False)
    for f in sorted(os.listdir(carpeta)):
        if re.search(r'\.(pdf|docx|odt)$', f, re.I) and re.search(r'(?<![\w-])' + re.escape(f) + r'(?![\w-])', texto):
            nombres.append(f)
    res = []
    for n in nombres:
        ruta = os.path.normpath(os.path.join(carpeta, n))
        if os.path.isfile(ruta) and ruta not in res:
            res.append(ruta)
    return res


def ficha(m, sesiones, sin, grupos):
    ns = [s.get('n') for s in sesiones]
    rango = (f'Sesión {ns[0]}' if len(ns) == 1 else f'Sesiones {ns[0]}-{ns[-1]}') if ns else ''
    quien = '👥 En equipo (entrega una persona por equipo)' if grupos else '👤 Individual'
    como = '📝 En papel, en clase (no se sube nada a Moodle)' if sin else '📤 Se entrega aquí, en Moodle'
    nota = '✅ Apto / No apto' if m.get('correccion') == 'apto' else ('📊 Rúbrica (nota de 1 a 10; la ves más abajo)' if m.get('correccion') == 'rubrica' else '')
    datos = ' · '.join(x for x in (f'📅 {rango}' if rango else '', quien, como, nota) if x)
    # el resumen solo cuando no hay descripción para el alumnado (la descripción ya empieza por qué se entrega)
    uso = f'<p><strong>🎯 En esta Tarea:</strong> {md(m["uso"])}</p>\n' if m.get('uso') and not m.get('descripcion') else ''
    return uso + f'<p>{datos}</p>'


def tareas_de(d, src=None):
    res = []
    docs = documentos_por_tarea(d)
    vent = ventanas(d)
    carpeta = os.path.dirname(os.path.abspath(src)) if src else None
    base = url_base(d, src) if src else ''
    for s in arr(d.get('sesiones')):
        for m in arr(s.get('moodle')):
            if m.get('recurso') != 'Tarea':
                continue
            cfg = ' '.join(arr(m.get('config'))).lower()
            # el tipo de entrega sale de la línea «Tipo(s) de entrega: …» de config; si no la hay, de todo config
            tipo = next((str(c).lower() for c in arr(m.get('config')) if re.match(r'\s*tipos? de entrega', str(c), re.I)), None)
            fuente = tipo if tipo is not None else cfg
            sin = bool(re.search(r'\bninguno\b|\bsin entrega\b|solo recoge la nota', fuente)) or \
                  ('en papel' in fuente and 'texto' not in fuente and 'archivo' not in fuente and 'pdf' not in fuente)
            texto = not sin and bool(re.search(r'texto en l[ií]nea|\benlace\b|\burl\b', fuente))
            archivo = not sin and bool(re.search(r'\.pdf|\bpdf\b|archivo|fichero|\.sb3|\.hex|\.pkt|\.aia|foto|imagen|v[ií]deo|captura', fuente))
            entrega_txt = ' '.join(l for l in str(m.get('descripcion') or '').lower().split('\n') if 'cómo se entrega' in l or 'como se entrega' in l)
            exts = sorted({'.' + e.lower() for e in re.findall(r'\.(' + EXT + r')\b', cfg + ' ' + entrega_txt)})
            if re.search(r'\bpdf\b', fuente) and '.pdf' not in exts:
                exts.append('.pdf')
            if re.search(r'\bfoto|imagen|captura', fuente):
                exts += [e for e in ('.png', '.jpg', '.jpeg') if e not in exts]
            if re.search(r'v[ií]deo', fuente):
                exts += [e for e in ('.mp4', '.webm', '.mov') if e not in exts]
            grupos = 'entrega por grupos: sí' in cfg
            mis_docs, ses_t = docs.get(m['nombre']) or [], vent.get(m['nombre']) or []
            adj = adjuntos_de(m, mis_docs, ses_t, carpeta)
            cuerpo = intro_html(m.get('descripcion') or '')
            if not m.get('descripcion'):  # sin descripción para el alumnado: lo mínimo a partir de la rúbrica y config
                print(f'  aviso: «{m["nombre"]}» no tiene "descripcion" en el JSON: la Tarea solo lleva un resumen automático')
                if arr(m.get('rubrica')):
                    cuerpo += '<p><strong>Qué se valora:</strong></p><ul>' + ''.join(f'<li>{md(l.get("linea", ""))}</li>' for l in arr(m['rubrica'])) + '</ul>'
                ent = 'en papel, en clase' if sin else ' y '.join(x for x, ok in (('texto en línea (pega aquí los enlaces)', texto), ('archivo (' + ', '.join(exts or ['.pdf']) + ')', archivo)) if ok)
                cuerpo += f'<p><strong>Cómo se entrega:</strong> {X(ent or "texto en línea y archivo")}.</p>'
            adj_txt = ('<p>📎 <strong>Archivos adjuntos:</strong> ' + ', '.join(X(os.path.basename(a)) for a in adj) +
                       ' (los tienes al final de esta página, para descargar o imprimir).</p>') if adj else ''
            partes = [ficha(m, ses_t, sin, grupos), bloque_documentos(mis_docs, sin), adj_txt, cuerpo]
            if m.get('correccion') == 'apto' and arr(m.get('cotejo')) and 'apto si' not in (m.get('descripcion') or '').lower():
                partes.append('<p><strong>✅ Será Apto si:</strong></p><ul>' + ''.join(f'<li>{md(c)}</li>' for c in arr(m['cotejo'])) + '</ul>')
            if m.get('correccion') == 'rubrica' and 'rúbrica' not in (m.get('descripcion') or '').lower():
                partes.append('<p>📊 <strong>Cómo se corrige:</strong> con la rúbrica que tienes al final de esta página; '
                              'en cada línea verás qué hace falta para cada nota.</p>')
            rep = para_repasar(d, ses_t, carpeta, base)
            if rep:
                partes.append('<p><strong>📚 Para repasar lo que vimos en clase:</strong></p>\n' + rep)
            partes.append('<p><em>¿Tienes dudas? Repasa el bloque de la SdA al principio del tema o pregunta en clase.</em></p>')
            t = {'nombre': m['nombre'], 'intro': '\n'.join(p for p in partes if p), 'adjuntos': adj, 'exts': exts or ['.pdf'],
                 'docs': len(mis_docs),
                 'apto': m.get('correccion') == 'apto', 'texto': texto, 'archivo': archivo, 'sin': sin,
                 'grupos': grupos, 'rubrica': []}
            if not (t['texto'] or t['archivo']) and not sin:
                # no dice cómo se entrega: se activan las dos opciones para que el alumnado pueda entregar
                t['texto'] = t['archivo'] = True
            if m.get('correccion') == 'rubrica':
                pesos = any(l.get('peso') for l in arr(m.get('rubrica')))
                for l in arr(m.get('rubrica')):
                    publico = pesos and l.get('peso', 0) < 20
                    pts = [0.75, 2.25, 3.75, 5.25, 7.5] if publico else [1, 3, 5, 7, 10]
                    t['rubrica'].append({'desc': f"{l['linea']} [{l.get('criterio') or m.get('criterio')}]",
                                         'niveles': list(zip(pts, arr(l.get('niveles'))))})
            res.append(t)
    return res


EXT = r'pdf|sb3|hex|aia|apk|png|jpe?g|gif|svg|mp4|webm|mov|mp3|wav|pkt|stl|ino|py|txt|docx|odt|pptx|odp|xlsx|ods|zip'


CONOCIDOS = {'.pdf', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.mp4', '.webm', '.mov', '.mp3', '.wav', '.docx', '.odt',
             '.pptx', '.odp', '.xlsx', '.ods', '.zip', '.txt', '.py'}


def tipos_moodle(exts):
    """Tipos de archivo aceptados en la Tarea. Moodle no conoce .sb3, .hex, .aia, .apk, .pkt, .ino ni .stl y no deja
    guardar los ajustes de una Tarea que los pida, así que en ese caso se aceptan todos los tipos."""
    return '' if any(e not in CONOCIDOS for e in exts) else ','.join(exts)


def tema_por_defecto(src, num):
    """Tema de Moodle de la SdA: su número; en una recuperación («R2»), el tema siguiente a las SdA ordinarias del curso
    (con sda1 y sda2 en el curso, R1 → tema 3, R2 → tema 4…)."""
    if str(num).isdigit():
        return int(num)
    r = re.fullmatch(r'(?i)r(\d+)', str(num).strip())
    if not r:
        return 1
    curso = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(src))))
    ords = [int(x[3:]) for x in os.listdir(curso) if re.fullmatch(r'sda\d+', x)] if os.path.isdir(curso) else []
    return max(ords, default=0) + int(r.group(1))


def xml(body):
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + body


def main(src, snippet, out, NSEC=None):
    d = json.load(open(src, encoding='utf-8'))
    meta = d['meta']; num = meta.get('numero', '')
    NSEC = int(NSEC or (d.get('moodle') or {}).get('tema') or tema_por_defecto(src, num))
    bloque = open(snippet, encoding='utf-8').read().strip()
    tareas = tareas_de(d, src)
    ahora = int(time.time())
    F = {}  # ruta → contenido

    COURSE, CTX = 1, 100
    S0, S1, CAT, SCALE = 1, 2, 1, 1
    mods = []  # (moduleid, modulename, title, visible)
    tit = str(meta.get('titulo', '')).strip()
    nombre_sec = tit if re.match(r'(?i)sda\s*\w', tit) or re.search(r'(?i)recuperaci[oó]n', tit) else f'SdA {num}: {tit}'
    gi_id = 2   # grade_item 1 = total del curso
    ficheros, blobs = [], {}  # entradas de files.xml y contenido de files/xx/<sha1>
    MIME = {'.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.odt': 'application/vnd.oasis.opendocument.text'}
    crit_id = lvl_id = 0
    rubtotal = 0

    # ---------- Tareas
    for i, t in enumerate(tareas):
        mid = i + 1; aid = i + 1; gid = gi_id; gi_id += 1
        grade = -SCALE if t['apto'] else 10
        cfgs = [('onlinetext', 'assignsubmission', 'enabled', int(t['texto'])), ('onlinetext', 'assignsubmission', 'wordlimit', 0),
                ('onlinetext', 'assignsubmission', 'wordlimitenabled', 0), ('file', 'assignsubmission', 'enabled', int(t['archivo'])),
                ('file', 'assignsubmission', 'maxfilesubmissions', 5 if len(t['exts']) > 1 else 2), ('file', 'assignsubmission', 'maxsubmissionsizebytes', 0),
                ('file', 'assignsubmission', 'filetypeslist', tipos_moodle(t['exts'])), ('comments', 'assignsubmission', 'enabled', 0),
                ('comments', 'assignfeedback', 'enabled', 1), ('comments', 'assignfeedback', 'commentinline', 0),
                ('editpdf', 'assignfeedback', 'enabled', 0), ('offline', 'assignfeedback', 'enabled', 0), ('file', 'assignfeedback', 'enabled', 0)]
        pc = ''.join(f'\n      <plugin_config id="{aid * 100 + k}">\n        <plugin>{p}</plugin>\n        <subtype>{st}</subtype>\n        <name>{n}</name>\n        <value>{v}</value>\n      </plugin_config>'
                     for k, (p, st, n, v) in enumerate(cfgs))
        campos = [('alwaysshowdescription', 1), ('submissiondrafts', 0), ('sendnotifications', 0), ('sendlatenotifications', 0),
                  ('sendstudentnotifications', 1), ('duedate', 0), ('cutoffdate', 0), ('gradingduedate', 0), ('allowsubmissionsfromdate', 0),
                  ('grade', grade), ('timemodified', ahora), ('completionsubmit', 0), ('requiresubmissionstatement', 0),
                  ('teamsubmission', int(t['grupos'])), ('requireallteammemberssubmit', 0), ('teamsubmissiongroupingid', 0),
                  ('blindmarking', 0), ('hidegrader', 0), ('revealidentities', 0), ('attemptreopenmethod', 'untilpass'), ('maxattempts', -1),
                  ('markingworkflow', 0), ('markingallocation', 0), ('preventsubmissionnotingroup', 0), ('activity', NULL),
                  ('activityformat', 0), ('timelimit', 0), ('submissionattachments', 0)]
        F[f'activities/assign_{mid}/assign.xml'] = xml(
            f'<activity id="{aid}" moduleid="{mid}" modulename="assign" contextid="{CTX + mid}">\n  <assign id="{aid}">\n'
            f'    <name>{X(t["nombre"])}</name>\n    <intro>{X(t["intro"])}</intro>\n    <introformat>1</introformat>\n'
            + ''.join(f'    <{k}>{v}</{k}>\n' for k, v in campos) +
            f'    <userflags>\n    </userflags>\n    <submissions>\n    </submissions>\n    <grades>\n    </grades>\n'
            f'    <plugin_configs>{pc}\n    </plugin_configs>\n    <overrides>\n    </overrides>\n  </assign>\n</activity>')
        if t['apto']:
            gt, gmax, gmin, sc = 2, '2.00000', '1.00000', SCALE
        else:
            gt, gmax, gmin, sc = 1, '10.00000', '0.00000', NULL
        F[f'activities/assign_{mid}/grades.xml'] = xml(
            f'<activity_gradebook>\n  <grade_items>\n    <grade_item id="{gid}">\n      <categoryid>{CAT}</categoryid>\n'
            f'      <itemname>{X(t["nombre"])}</itemname>\n      <itemtype>mod</itemtype>\n      <itemmodule>assign</itemmodule>\n'
            f'      <iteminstance>{aid}</iteminstance>\n      <itemnumber>0</itemnumber>\n      <iteminfo>{NULL}</iteminfo>\n      <idnumber></idnumber>\n'
            f'      <calculation>{NULL}</calculation>\n      <gradetype>{gt}</gradetype>\n      <grademax>{gmax}</grademax>\n      <grademin>{gmin}</grademin>\n'
            f'      <scaleid>{sc}</scaleid>\n      <outcomeid>{NULL}</outcomeid>\n      <gradepass>0.00000</gradepass>\n      <multfactor>1.00000</multfactor>\n'
            f'      <plusfactor>0.00000</plusfactor>\n      <aggregationcoef>0.00000</aggregationcoef>\n      <aggregationcoef2>0.00000</aggregationcoef2>\n'
            f'      <weightoverride>0</weightoverride>\n      <sortorder>{gid}</sortorder>\n      <display>0</display>\n      <decimals>{NULL}</decimals>\n'
            f'      <hidden>0</hidden>\n      <locked>0</locked>\n      <locktime>0</locktime>\n      <needsupdate>0</needsupdate>\n'
            f'      <timecreated>{ahora}</timecreated>\n      <timemodified>{ahora}</timemodified>\n      <grade_grades>\n      </grade_grades>\n'
            f'    </grade_item>\n  </grade_items>\n  <grade_letters>\n  </grade_letters>\n</activity_gradebook>')
        refs = ''
        for k, ruta in enumerate([None] + t.get('adjuntos', []) if t.get('adjuntos') else []):
            datos = open(ruta, 'rb').read() if ruta else b''
            sha = hashlib.sha1(datos).hexdigest()
            fid = len(ficheros) + 1
            nombre = os.path.basename(ruta) if ruta else '.'
            mime = MIME.get(os.path.splitext(nombre)[1].lower(), 'application/octet-stream') if ruta else NULL
            ficheros.append(f'  <file id="{fid}">\n    <contenthash>{sha}</contenthash>\n    <contextid>{CTX + mid}</contextid>\n'
                            f'    <component>mod_assign</component>\n    <filearea>introattachment</filearea>\n    <itemid>0</itemid>\n'
                            f'    <filepath>/</filepath>\n    <filename>{X(nombre)}</filename>\n    <userid>{NULL}</userid>\n    <filesize>{len(datos)}</filesize>\n'
                            f'    <mimetype>{mime}</mimetype>\n    <status>0</status>\n    <timecreated>{ahora}</timecreated>\n    <timemodified>{ahora}</timemodified>\n'
                            f'    <source>{X(nombre) if ruta else NULL}</source>\n    <author>{NULL}</author>\n    <license>{"unknown" if ruta else NULL}</license>\n'
                            f'    <sortorder>0</sortorder>\n    <repositorytype>{NULL}</repositorytype>\n    <repositoryid>{NULL}</repositoryid>\n'
                            f'    <reference>{NULL}</reference>\n  </file>')
            if ruta:
                blobs[f'files/{sha[:2]}/{sha}'] = datos
            refs += f'\n  <fileref>\n    <file>\n      <id>{fid}</id>\n    </file>\n  </fileref>'
        F[f'activities/assign_{mid}/inforef.xml'] = xml(f'<inforef>{refs}\n  <grade_itemref>\n    <grade_item>\n      <id>{gid}</id>\n    </grade_item>\n  </grade_itemref>\n</inforef>')
        if t['rubrica']:
            crits = ''
            for k, c in enumerate(t['rubrica']):
                crit_id += 1
                lv = ''
                for p, txt in c['niveles']:
                    lvl_id += 1
                    lv += f'\n                <level id="{lvl_id}">\n                  <score>{p:.5f}</score>\n                  <definition>{X(txt)}</definition>\n                  <definitionformat>2</definitionformat>\n                </level>'
                crits += (f'\n            <criterion id="{crit_id}">\n              <sortorder>{k + 1}</sortorder>\n              <description>{X(c["desc"])}</description>\n'
                          f'              <descriptionformat>2</descriptionformat>\n              <levels>{lv}\n              </levels>\n            </criterion>')
            opciones = '{"sortlevelsasc":1,"lockzeropoints":1,"alwaysshowdefinition":1,"showdescriptionteacher":1,"showdescriptionstudent":1,"showscoreteacher":1,"showscorestudent":1,"enableremarks":1,"showremarksstudent":1}'
            desc = 'Cada línea se puntúa con 1, 3, 5, 7 o 10 puntos. La nota de la Tarea es la puntuación total entre la máxima, por 10 (la media de las líneas).'
            F[f'activities/assign_{mid}/grading.xml'] = xml(
                f'<areas>\n  <area id="{aid}">\n    <areaname>submissions</areaname>\n    <activemethod>rubric</activemethod>\n    <definitions>\n'
                f'      <definition id="{aid}">\n        <method>rubric</method>\n        <name>{X("Rúbrica " + t["nombre"])}</name>\n'
                f'        <description>{X(desc)}</description>\n        <descriptionformat>1</descriptionformat>\n        <status>20</status>\n'
                f'        <timecreated>{ahora}</timecreated>\n        <timemodified>{ahora}</timemodified>\n        <options>{X(opciones)}</options>\n'
                f'        <plugin_gradingform_rubric_definition>\n          <criteria>{crits}\n          </criteria>\n        </plugin_gradingform_rubric_definition>\n'
                f'        <instances>\n        </instances>\n      </definition>\n    </definitions>\n  </area>\n</areas>')
            rubtotal += 1
        else:
            F[f'activities/assign_{mid}/grading.xml'] = xml('<areas>\n</areas>')
        mods.append((mid, 'assign', t['nombre'], 0))

    # ---------- comunes de cada actividad
    for mid, mod, _, vis in mods:
        base = f'activities/{mod}_{mid}/'
        F[base + 'module.xml'] = xml(
            f'<module id="{mid}" version="2022112801">\n  <modulename>{mod}</modulename>\n  <sectionid>{S1}</sectionid>\n  <sectionnumber>{NSEC}</sectionnumber>\n'
            f'  <idnumber></idnumber>\n  <added>{ahora}</added>\n  <score>0</score>\n  <indent>0</indent>\n  <visible>{vis}</visible>\n'
            f'  <visibleoncoursepage>1</visibleoncoursepage>\n  <visibleold>{vis}</visibleold>\n  <groupmode>0</groupmode>\n  <groupingid>0</groupingid>\n'
            f'  <completion>0</completion>\n  <completiongradeitemnumber>{NULL}</completiongradeitemnumber>\n  <completionpassgrade>0</completionpassgrade>\n'
            f'  <completionview>0</completionview>\n  <completionexpected>0</completionexpected>\n  <availability>{NULL}</availability>\n'
            f'  <showdescription>0</showdescription>\n  <downloadcontent>1</downloadcontent>\n  <lang>{NULL}</lang>\n  <tags>\n  </tags>\n</module>')
        F[base + 'roles.xml'] = xml('<roles>\n  <role_overrides>\n  </role_overrides>\n  <role_assignments>\n  </role_assignments>\n</roles>')
        F[base + 'grade_history.xml'] = xml('<grade_history>\n  <grade_grades>\n  </grade_grades>\n</grade_history>')

    # ---------- secciones
    def seccion(sid, numero, secuencia, nombre=NULL, resumen=''):
        return xml(f'<section id="{sid}">\n  <number>{numero}</number>\n  <name>{nombre}</name>\n  <summary>{resumen}</summary>\n  <summaryformat>1</summaryformat>\n'
                   f'  <sequence>{secuencia}</sequence>\n  <visible>1</visible>\n  <availabilityjson>{NULL}</availabilityjson>\n  <timemodified>{ahora}</timemodified>\n</section>')
    F[f'sections/section_{S0}/section.xml'] = seccion(S0, 0, '')
    F[f'sections/section_{S1}/section.xml'] = seccion(S1, NSEC, ','.join(str(m[0]) for m in mods), X(nombre_sec), X(bloque))
    for s in (S0, S1):
        F[f'sections/section_{s}/inforef.xml'] = xml('<inforef>\n</inforef>')

    # ---------- curso
    F['course/course.xml'] = xml(
        f'<course id="{COURSE}" contextid="{CTX}">\n  <shortname>{X("sda" + str(num) + "-moodle")}</shortname>\n  <fullname>{X(meta.get("titulo", ""))}</fullname>\n'
        f'  <idnumber></idnumber>\n  <summary>{NULL}</summary>\n  <summaryformat>0</summaryformat>\n  <format>topics</format>\n  <showgrades>1</showgrades>\n'
        f'  <newsitems>0</newsitems>\n  <startdate>0</startdate>\n  <enddate>0</enddate>\n  <marker>0</marker>\n  <maxbytes>0</maxbytes>\n  <legacyfiles>0</legacyfiles>\n'
        f'  <showreports>0</showreports>\n  <visible>1</visible>\n  <groupmode>0</groupmode>\n  <groupmodeforce>0</groupmodeforce>\n  <defaultgroupingid>0</defaultgroupingid>\n'
        f'  <lang></lang>\n  <theme></theme>\n  <timecreated>{ahora}</timecreated>\n  <timemodified>{ahora}</timemodified>\n  <requested>0</requested>\n'
        f'  <showactivitydates>0</showactivitydates>\n  <showcompletionconditions>1</showcompletionconditions>\n  <enablecompletion>0</enablecompletion>\n'
        f'  <completionnotify>0</completionnotify>\n  <category id="1">\n    <name>Category 1</name>\n    <description>{NULL}</description>\n  </category>\n'
        f'  <tags>\n  </tags>\n  <customfields>\n  </customfields>\n  <courseformatoptions>\n  </courseformatoptions>\n</course>')
    F['course/inforef.xml'] = xml('<inforef>\n</inforef>')
    F['course/roles.xml'] = xml('<roles>\n  <role_overrides>\n  </role_overrides>\n  <role_assignments>\n  </role_assignments>\n</roles>')
    F['course/enrolments.xml'] = xml('<enrolments>\n  <enrols>\n  </enrols>\n</enrolments>')
    F['course/completiondefaults.xml'] = xml('<course_completion_defaults>\n</course_completion_defaults>')

    # ---------- raíz
    F['scales.xml'] = xml(f'<scales_definition>\n  <scale id="{SCALE}">\n    <courseid>{COURSE}</courseid>\n    <userid>0</userid>\n    <name>Apto / No apto</name>\n'
                          f'    <scale>No apto,Apto</scale>\n    <description>Escala para las Tareas de verificación de la SdA.</description>\n'
                          f'    <descriptionformat>1</descriptionformat>\n    <timemodified>{ahora}</timemodified>\n  </scale>\n</scales_definition>'
                          if any(t['apto'] for t in tareas) else '<scales_definition>\n</scales_definition>')
    F['gradebook.xml'] = xml(
        f'<gradebook>\n  <attributes>\n  </attributes>\n  <grade_categories>\n    <grade_category id="{CAT}">\n      <parent>{NULL}</parent>\n      <depth>1</depth>\n'
        f'      <path>/{CAT}/</path>\n      <fullname>?</fullname>\n      <aggregation>13</aggregation>\n      <keephigh>0</keephigh>\n      <droplow>0</droplow>\n'
        f'      <aggregateonlygraded>1</aggregateonlygraded>\n      <aggregateoutcomes>0</aggregateoutcomes>\n      <timecreated>{ahora}</timecreated>\n'
        f'      <timemodified>{ahora}</timemodified>\n      <hidden>0</hidden>\n    </grade_category>\n  </grade_categories>\n  <grade_items>\n'
        f'    <grade_item id="1">\n      <categoryid>{NULL}</categoryid>\n      <itemname>{NULL}</itemname>\n      <itemtype>course</itemtype>\n      <itemmodule>{NULL}</itemmodule>\n'
        f'      <iteminstance>{CAT}</iteminstance>\n      <itemnumber>{NULL}</itemnumber>\n      <iteminfo>{NULL}</iteminfo>\n      <idnumber>{NULL}</idnumber>\n'
        f'      <calculation>{NULL}</calculation>\n      <gradetype>1</gradetype>\n      <grademax>100.00000</grademax>\n      <grademin>0.00000</grademin>\n'
        f'      <scaleid>{NULL}</scaleid>\n      <outcomeid>{NULL}</outcomeid>\n      <gradepass>0.00000</gradepass>\n      <multfactor>1.00000</multfactor>\n'
        f'      <plusfactor>0.00000</plusfactor>\n      <aggregationcoef>0.00000</aggregationcoef>\n      <aggregationcoef2>0.00000</aggregationcoef2>\n'
        f'      <weightoverride>0</weightoverride>\n      <sortorder>1</sortorder>\n      <display>0</display>\n      <decimals>{NULL}</decimals>\n      <hidden>0</hidden>\n'
        f'      <locked>0</locked>\n      <locktime>0</locktime>\n      <needsupdate>1</needsupdate>\n      <timecreated>{ahora}</timecreated>\n'
        f'      <timemodified>{ahora}</timemodified>\n      <grade_grades>\n      </grade_grades>\n    </grade_item>\n  </grade_items>\n  <grade_letters>\n  </grade_letters>\n'
        f'  <grade_settings>\n    <grade_setting id="">\n      <name>minmaxtouse</name>\n      <value>1</value>\n    </grade_setting>\n  </grade_settings>\n</gradebook>')
    F['files.xml'] = xml('<files>\n' + '\n'.join(ficheros) + ('\n' if ficheros else '') + '</files>')
    F['completion.xml'] = xml('<course_completion>\n</course_completion>')
    F['groups.xml'] = xml('<groups>\n  <groupings>\n  </groupings>\n</groups>')
    F['outcomes.xml'] = xml('<outcomes_definition>\n</outcomes_definition>')
    F['questions.xml'] = xml('<question_categories>\n</question_categories>')
    F['roles.xml'] = xml('<roles_definition>\n</roles_definition>')
    F['grade_history.xml'] = xml('<grade_history>\n  <grade_grades>\n  </grade_grades>\n</grade_history>')
    F['moodle_backup.log'] = ''

    # ---------- moodle_backup.xml
    acts = ''.join(f'\n        <activity>\n          <moduleid>{mid}</moduleid>\n          <sectionid>{S1}</sectionid>\n          <modulename>{mod}</modulename>\n'
                   f'          <title>{X(tit)}</title>\n          <directory>activities/{mod}_{mid}</directory>\n        </activity>' for mid, mod, tit, _ in mods)
    secs = ''.join(f'\n        <section>\n          <sectionid>{s}</sectionid>\n          <title>{n}</title>\n          <directory>sections/section_{s}</directory>\n        </section>'
                   for s, n in ((S0, 0), (S1, NSEC)))
    raiz = [('filename', 'backup.mbz'), ('imscc11', 0), ('users', 0), ('anonymize', 0), ('role_assignments', 0), ('activities', 1), ('blocks', 0),
            ('files', 1), ('filters', 0), ('comments', 0), ('badges', 0), ('calendarevents', 0), ('userscompletion', 0), ('logs', 0),
            ('grade_histories', 0), ('questionbank', 0), ('groups', 0), ('competencies', 0), ('customfield', 0), ('contentbankcontent', 0), ('legacyfiles', 0)]
    sets = ''.join(f'\n      <setting>\n        <level>root</level>\n        <name>{n}</name>\n        <value>{v}</value>\n      </setting>' for n, v in raiz)
    for s in (S0, S1):
        for k, v in (('included', 1), ('userinfo', 0)):
            sets += f'\n      <setting>\n        <level>section</level>\n        <section>section_{s}</section>\n        <name>section_{s}_{k}</name>\n        <value>{v}</value>\n      </setting>'
    for mid, mod, _, _ in mods:
        for k, v in (('included', 1), ('userinfo', 0)):
            sets += f'\n      <setting>\n        <level>activity</level>\n        <activity>{mod}_{mid}</activity>\n        <name>{mod}_{mid}_{k}</name>\n        <value>{v}</value>\n      </setting>'
    bid = hashlib.md5(f'{src}{ahora}'.encode()).hexdigest()
    F['moodle_backup.xml'] = xml(
        f'<moodle_backup>\n  <information>\n    <name>backup.mbz</name>\n    <moodle_version>2022112800</moodle_version>\n    <moodle_release>4.1</moodle_release>\n'
        f'    <backup_version>2022112800</backup_version>\n    <backup_release>4.1</backup_release>\n    <backup_date>{ahora}</backup_date>\n'
        f'    <mnet_remoteusers>0</mnet_remoteusers>\n    <include_files>1</include_files>\n    <include_file_references_to_external_content>0</include_file_references_to_external_content>\n'
        f'    <original_wwwroot>https://florindotic.es</original_wwwroot>\n    <original_site_identifier_hash>{hashlib.md5(b"florindotic-sda").hexdigest()}</original_site_identifier_hash>\n'
        f'    <original_course_id>{COURSE}</original_course_id>\n    <original_course_format>topics</original_course_format>\n'
        f'    <original_course_fullname>{X(meta.get("titulo", ""))}</original_course_fullname>\n    <original_course_shortname>{X("sda" + str(num) + "-moodle")}</original_course_shortname>\n'
        f'    <original_course_startdate>0</original_course_startdate>\n    <original_course_enddate>0</original_course_enddate>\n'
        f'    <original_course_contextid>{CTX}</original_course_contextid>\n    <original_system_contextid>1</original_system_contextid>\n'
        f'    <details>\n      <detail backup_id="{bid}">\n        <type>course</type>\n        <format>moodle2</format>\n        <interactive>1</interactive>\n'
        f'        <mode>10</mode>\n        <execution>1</execution>\n        <executiontime>0</executiontime>\n      </detail>\n    </details>\n'
        f'    <contents>\n      <activities>{acts}\n      </activities>\n      <sections>{secs}\n      </sections>\n      <course>\n        <courseid>{COURSE}</courseid>\n'
        f'        <title>{X("sda" + str(num) + "-moodle")}</title>\n        <directory>course</directory>\n      </course>\n    </contents>\n'
        f'    <settings>{sets}\n    </settings>\n  </information>\n</moodle_backup>')

    # ---------- empaquetar (tar.gz con índice, como hace Moodle)
    datos = {k: v.encode('utf-8') for k, v in F.items()}
    datos.update(blobs)
    dirs = sorted({'/'.join(k.split('/')[:i]) + '/' for k in datos for i in range(1, k.count('/') + 1)})
    lineas = [f'{d}\td\t0\t?' for d in dirs] + [f'{k}\tf\t{len(v)}\t{ahora}' for k, v in sorted(datos.items())]
    indice = (f'Moodle archive file index. Count: {len(lineas)}\n' + '\n'.join(lineas) + '\n').encode('utf-8')
    with tarfile.open(out, 'w:gz', format=tarfile.USTAR_FORMAT) as tar:
        def add(nombre, contenido):
            ti = tarfile.TarInfo(nombre); ti.size = len(contenido); ti.mtime = ahora; ti.mode = 0o644
            tar.addfile(ti, io.BytesIO(contenido))
        add('.ARCHIVE_INDEX', indice)
        for k, v in sorted(datos.items()):
            add(k, v)
    ndocs = sum(t['docs'] for t in tareas)
    print(f'MBZ: {out} · tema {NSEC} «{nombre_sec}» con el bloque HTML · {len(tareas)} Tareas ({sum(t["apto"] for t in tareas)} Apto / No apto, {rubtotal} con rúbrica)'
          + (f' · {ndocs} enlaces a documentos' if ndocs else '')
          + (f' · {len(blobs)} archivos adjuntos' if blobs else ''))
    for t in tareas:
        if t['sin']:
            print(f'  aviso: «{t["nombre"]}» no tiene tipo de entrega (su config dice «ninguno» o en papel): en Moodle no se sube nada')


if __name__ == '__main__':
    args = sys.argv[1:]
    tema = None
    if '--tema' in args:
        i = args.index('--tema'); tema = args[i + 1]; del args[i:i + 2]
    if len(args) != 3 or (tema is not None and not tema.isdigit()):
        sys.exit(__doc__)
    main(*args, tema)
