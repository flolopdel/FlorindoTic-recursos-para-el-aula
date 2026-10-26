// Revisión de una Pull Request (la ejecuta la GitHub Action y comenta el resultado en la PR).
//
// Qué hace:
//   1. Lista las páginas de content/ que la PR añade, cambia, renombra o borra, con su dirección web.
//   2. Comprueba cada carpeta de SdA generada con la skill (la que tiene sdaN.json):
//      clase.html, guia-profesorado.html y moodle.html presentes y JSON válido y coherente.
//   3. Avisa de cosas que conviene mirar: páginas vacías, enlaces de Google Docs con /edit en
//      páginas del alumnado, nombres de archivo con espacios o tildes, páginas borradas sin redirección.
//
// Uso:
//   node scripts/revisar-pr.mjs                                  # solo comprobaciones
//   node scripts/revisar-pr.mjs --base=origin/main --out=revision.md --base-url=https://florindotic.es/
// Sale con código 1 si hay errores (la Action marca la PR en rojo).

import { promises as fs } from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  })
);
const BASE = typeof args.base === 'string' ? args.base : null;
const BASE_URL = (typeof args['base-url'] === 'string' ? args['base-url'] : 'https://florindotic.es/').replace(/\/?$/, '/');
const OUT = typeof args.out === 'string' ? args.out : null;

const DOCENTE = new Set(['guia-profesorado.html', 'moodle.html']);
const REQUERIDOS = ['clase.html', 'guia-profesorado.html', 'moodle.html'];

const errores = [];
const avisos = [];
const url = (p) => BASE_URL + encodeURI(p);

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) yield full;
  }
}
const posix = (p) => p.split(path.sep).join('/');

// ---------------------------------------------------------------- cambios de la PR
const cambios = { A: [], M: [], R: [], D: [] };
let cambiados = null; // rutas tocadas por la PR (para limitar los avisos a lo nuevo)
if (BASE) {
  const diff = execFileSync('git', ['diff', '--name-status', '--find-renames', `${BASE}...HEAD`, '--', 'content/'])
    .toString()
    .trim();
  cambiados = new Set();
  for (const line of diff ? diff.split('\n') : []) {
    const [st, a, b] = line.split('\t');
    const k = st[0];
    if (k === 'R') {
      cambios.R.push([a, b]);
      cambiados.add(b);
    } else if (cambios[k]) {
      cambios[k].push(a);
      if (k !== 'D') cambiados.add(a);
    }
  }
}

// ---------------------------------------------------------------- comprobaciones
const todos = [];
for await (const f of walk('content')) todos.push(posix(f));
const existe = new Set(todos);

for (const f of todos) {
  const tocado = !cambiados || cambiados.has(f);
  const nombre = path.posix.basename(f);

  if (tocado && /[\sÀ-ÿ]/.test(nombre)) {
    avisos.push(`\`${f}\`: el nombre tiene espacios o tildes; mejor en minúsculas con guiones (p. ej. \`guia-alumnado.pdf\`).`);
  }

  // Carpeta de SdA de la skill
  const m = nombre.match(/^sda(\d+)\.json$/i);
  if (m) {
    const dir = path.posix.dirname(f);
    for (const r of REQUERIDOS) {
      if (!existe.has(`${dir}/${r}`)) errores.push(`\`${dir}/\`: falta \`${r}\` (cada SdA de la skill lleva ${REQUERIDOS.join(', ')} y \`${nombre}\`).`);
    }
    try {
      const d = JSON.parse(await fs.readFile(f, 'utf-8'));
      const meta = d.meta || {};
      if (!meta.titulo) errores.push(`\`${f}\`: falta \`meta.titulo\`.`);
      if (String(meta.numero) !== m[1]) errores.push(`\`${f}\`: \`meta.numero\` es ${meta.numero} pero la carpeta es sda${m[1]}.`);
      if (`sda${m[1]}` !== path.posix.basename(dir)) errores.push(`\`${f}\`: el JSON no está en su carpeta \`sda${m[1]}/\`.`);
      const forms = (d.anexos && d.anexos.formularios) || [];
      if (forms.some((x) => !x.enlace) && !existe.has(`${dir}/Codigo.gs`)) {
        avisos.push(`\`${dir}/\`: hay formularios sin enlace y no está \`Codigo.gs\` para crearlos.`);
      }
    } catch (e) {
      errores.push(`\`${f}\`: no es un JSON válido (${e.message}).`);
    }
  }

  if (!f.endsWith('.html')) continue;
  const html = await fs.readFile(f, 'utf-8');
  if (tocado && !html.trim()) avisos.push(`\`${f}\`: la página está vacía.`);
  if (tocado && !DOCENTE.has(nombre) && /href=["']https:\/\/docs\.google\.com\/[^"']*\/edit/i.test(html)) {
    avisos.push(`\`${f}\`: enlaza un Google Doc con \`/edit\`; para el alumnado usa \`/preview\` (ver) o \`/copy\` (copiar a su Drive).`);
  }
}

for (const f of cambios.D.filter((p) => p.endsWith('.html'))) {
  avisos.push(`Se borra \`${f}\`: si Moodle u otra web la enlaza, el enlace se romperá. Deja una página de redirección (ver CLAUDE.md).`);
}

// ---------------------------------------------------------------- informe
const L = ['<!-- revision-florindotic -->', '## 🔎 Revisión automática', ''];
if (BASE) {
  const html = (p) => p.endsWith('.html') && !p.endsWith('/_pagina.html');
  const redir = new Set();
  for (const p of [...cambios.A, ...cambios.M].filter(html)) {
    if ((await fs.readFile(p, 'utf-8').catch(() => '')).includes('florindotic:redirect')) redir.add(p);
  }
  const linea = (p) => `- [${p.replace(/^content\//, '')}](${url(p)})${redir.has(p) ? ' ↪️ ahora es una redirección' : ''}`;
  const bloques = [
    ['🆕 Páginas nuevas', cambios.A.filter(html).map(linea)],
    ['✏️ Páginas modificadas', cambios.M.filter(html).map(linea)],
    ['🔀 Renombradas', cambios.R.filter(([, b]) => html(b)).map(([a, b]) => `- \`${a.replace(/^content\//, '')}\` → [${b.replace(/^content\//, '')}](${url(b)})`)],
    ['🗑️ Borradas', cambios.D.filter(html).map((p) => `- \`${p.replace(/^content\//, '')}\``)],
  ];
  const otros = [...cambios.A, ...cambios.M, ...cambios.R.map(([, b]) => b)].filter((p) => !p.endsWith('.html'));
  if (otros.length) bloques.push(['📎 Otros archivos', otros.map((p) => `- \`${p.replace(/^content\//, '')}\``)]);
  const con = bloques.filter(([, l]) => l.length);
  if (con.length) {
    L.push('Las direcciones funcionarán cuando fusiones la PR y termine el despliegue.', '');
    for (const [t, l] of con) L.push(`**${t}** (${l.length})`, '', ...l.slice(0, 60), ...(l.length > 60 ? [`- … y ${l.length - 60} más`] : []), '');
  } else {
    L.push('Esta PR no cambia páginas de `content/`.', '');
  }
}
L.push(errores.length ? `### ❌ Errores (${errores.length})` : '### ✅ Estructura de las SdA correcta', '');
for (const e of errores) L.push(`- ${e}`);
if (errores.length) L.push('');
if (avisos.length) {
  L.push(`### ⚠️ Para revisar (${avisos.length})`, '');
  for (const a of avisos) L.push(`- ${a}`);
  L.push('');
}
const informe = L.join('\n');

if (OUT) await fs.writeFile(OUT, informe);
console.log(informe);
if (errores.length) process.exit(1);
