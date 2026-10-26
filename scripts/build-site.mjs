// Build del portal para publicar (lo ejecuta la GitHub Action).
//
// Qué hace:
//   1. Ejecuta el build actual (scripts/build-menu.mjs) → menu.json + _pagina.html.
//   2. Copia SOLO lo publicable a una carpeta de salida (por defecto _site/),
//      de modo que private_content/, prompts/, scripts/… nunca llegan a la web.
//   3. Genera search-index.json (búsqueda por el texto de cada página).
//   4. Genera sitemap.xml, 404.html y version.json.
//   5. Comprueba enlaces internos rotos (href/src relativos) y los informa.
//      Con --strict el build falla si hay enlaces rotos.
//
// Uso:
//   node scripts/build-site.mjs                 # salida en _site/
//   node scripts/build-site.mjs --out=dist --strict --base-url=https://usuario.github.io/repo/

import { promises as fs } from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const ROOT = path.resolve('.');
const OUT = path.resolve(args.out || '_site');
const STRICT = Boolean(args.strict);
const BASE_URL = typeof args['base-url'] === 'string' ? args['base-url'].replace(/\/?$/, '/') : '';

// Lista blanca: solo esto se publica.
const PUBLIC_ENTRIES = ['index.html', 'bienvenida.html', 'menu.json', 'css', 'js', 'assets', 'content'];
// Dentro de lo publicado, nunca copiar estas rutas.
const EXCLUDE = [/(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/];

const MAX_TEXT_PER_PAGE = 4000;

function toPosix(p) {
  return p.split(path.sep).join('/');
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function* walkFiles(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (entry.isFile()) yield full;
  }
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function extractText(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];
  const text = body
    .replace(/<(script|style|svg|noscript|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return {
    title: title ? decodeEntities(title).replace(/\s+/g, ' ').trim() : null,
    text: decodeEntities(text).replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_PER_PAGE),
  };
}

function findLocalRefs(html) {
  const refs = [];
  const re = /\s(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  const code = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
  let m;
  while ((m = re.exec(code))) {
    const url = m[1].trim();
    if (!url || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\$\{|\{\{)/i.test(url)) continue;
    refs.push(url);
  }
  return refs;
}

function page404() {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Página no encontrada</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #f4f5fb; color: #1e1b2e; text-align: center; padding: 1rem; }
    a { display: inline-block; margin-top: 1rem; padding: .6rem 1.2rem; border-radius: 999px; background: #6d28d9; color: #fff; text-decoration: none; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <h1>🔍 Esta página no existe</h1>
    <p>Puede que el material se haya movido o cambiado de nombre.</p>
    <a id="volver" href="./">Volver al Aula TIC</a>
  </main>
  <script>
    // GitHub Pages sirve 404.html desde cualquier ruta: calculamos la raíz del sitio.
    var parts = location.pathname.split('/').filter(Boolean);
    if (location.hostname.endsWith('github.io') && parts.length) {
      document.getElementById('volver').href = '/' + parts[0] + '/';
    }
  </script>
</body>
</html>
`;
}

async function main() {
  console.log('1/5 Generando menú y portadas (scripts/build-menu.mjs)…');
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/build-menu.mjs')], { stdio: 'inherit', cwd: ROOT });

  console.log(`2/5 Copiando lo publicable a ${toPosix(path.relative(ROOT, OUT)) || '.'}/ …`);
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });

  const published = [];
  for (const entry of PUBLIC_ENTRIES) {
    const src = path.join(ROOT, entry);
    if (!(await exists(src))) continue;
    const stat = await fs.stat(src);
    const files = stat.isDirectory() ? walkFiles(src) : [src];
    for await (const file of files) {
      const rel = toPosix(path.relative(ROOT, file));
      if (EXCLUDE.some((re) => re.test(rel))) continue;
      const dest = path.join(OUT, rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(file, dest);
      published.push(rel);
    }
  }
  await fs.writeFile(path.join(OUT, '.nojekyll'), '');
  await fs.writeFile(path.join(OUT, '404.html'), page404());
  published.push('404.html');

  console.log('3/5 Generando índice de búsqueda…');
  const htmlFiles = [];
  const index = [];
  for (const rel of published.filter((p) => p.startsWith('content/') && p.endsWith('.html'))) {
    const html = await fs.readFile(path.join(OUT, rel), 'utf-8');
    // Las páginas de redirección (nombres antiguos) se publican pero no se indexan ni van al sitemap.
    if (html.includes('florindotic:redirect')) continue;
    htmlFiles.push(rel);
    const { title, text } = extractText(html);
    index.push({ path: rel, title, text });
  }
  await fs.writeFile(path.join(OUT, 'search-index.json'), JSON.stringify(index));

  console.log('4/5 Generando sitemap.xml y version.json…');
  const today = new Date().toISOString().slice(0, 10);
  const urls = ['', ...htmlFiles.filter((p) => !p.endsWith('/_pagina.html'))]
    .map((p) => `  <url><loc>${BASE_URL}${encodeURI(p)}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n');
  await fs.writeFile(
    path.join(OUT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );
  let commit = process.env.GITHUB_SHA || null;
  if (!commit) {
    try {
      commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim();
    } catch {
      commit = null;
    }
  }
  await fs.writeFile(
    path.join(OUT, 'version.json'),
    JSON.stringify({ builtAt: new Date().toISOString(), commit, pages: htmlFiles.length }, null, 2)
  );

  console.log('5/5 Comprobando enlaces internos…');
  const publishedSet = new Set(published);
  const broken = [];
  for (const rel of published.filter((p) => p.endsWith('.html'))) {
    const html = await fs.readFile(path.join(OUT, rel), 'utf-8');
    for (const ref of findLocalRefs(html)) {
      const clean = ref.split(/[?#]|\$\{|\{\{/)[0]; // la parte fija antes de una plantilla ${…} o {{…}}
      if (!clean) continue;
      let decoded;
      try {
        decoded = decodeURIComponent(clean);
      } catch {
        decoded = clean;
      }
      let target = path.posix.normalize(
        decoded.startsWith('/') ? decoded.slice(1) : path.posix.join(path.posix.dirname(rel), decoded)
      );
      if (target.endsWith('/') || target === '.') target = path.posix.join(target, 'index.html');
      if (target.startsWith('..')) continue; // apunta fuera del sitio
      if (!publishedSet.has(target) && !publishedSet.has(`${target}/index.html`)) {
        broken.push(`${rel} → ${ref}`);
      }
    }
  }

  console.log(`\n✔ ${published.length} ficheros publicados, ${htmlFiles.length} páginas indexadas.`);
  if (broken.length) {
    console.log(`⚠ ${broken.length} enlace(s) interno(s) roto(s):`);
    for (const b of broken) console.log('   - ' + b);
    if (STRICT) process.exit(1);
  } else {
    console.log('✔ Sin enlaces internos rotos.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
