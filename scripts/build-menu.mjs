import { promises as fs } from 'fs';
import path from 'path';

const CONTENT_DIR = path.resolve('content');
const OUTPUT_FILE = path.resolve('menu.json');

function prettify(name) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function readMeta(dir) {
  try {
    const raw = await fs.readFile(path.join(dir, 'meta.json'), 'utf-8');
    const data = JSON.parse(raw);
    return {
      title: typeof data.title === 'string' ? data.title : null,
      description: typeof data.description === 'string' ? data.description : null,
    };
  } catch {
    return null;
  }
}

function landingPageTemplate({ title, description, backPath, items }) {
  const itemsHtml = items.length
    ? items
        .map((item) => {
          if (item.type === 'file') {
            return `<li><a href="${item.href}">📄 ${item.name}</a></li>`;
          }
          if (item.href) {
            return `<li><a href="${item.href}">📁 ${item.name}</a></li>`;
          }
          return `<li class="sin-portada">📁 ${item.name} <span>(usa el menú lateral)</span></li>`;
        })
        .join('\n      ')
    : '<li class="vacio">Todavía no hay contenido aquí.</li>';

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1.5rem; color: #1e293b; line-height: 1.55; }
    a.volver { display: inline-block; margin-bottom: 1.5rem; color: #1d4ed8; text-decoration: none; }
    h1 { margin-bottom: 0.25rem; }
    p.desc { color: #475569; }
    ul.listado { list-style: none; padding: 0; margin-top: 1.5rem; }
    ul.listado li { margin: 0.5rem 0; }
    ul.listado a { color: #1d4ed8; text-decoration: none; font-weight: 600; }
    ul.listado a:hover { text-decoration: underline; }
    .sin-portada { color: #64748b; }
    .sin-portada span { font-size: 0.85rem; font-style: italic; }
    .vacio { color: #64748b; font-style: italic; }
  </style>
</head>
<body>
  <a class="volver" href="${backPath}">&larr; Volver al índice</a>
  <h1>${title}</h1>
  ${description ? `<p class="desc">${description}</p>` : ''}
  <ul class="listado">
      ${itemsHtml}
  </ul>
</body>
</html>
`;
}

async function walk(dir, relBase = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  const dirs = entries
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const files = entries
    .filter(
      (e) =>
        e.isFile() &&
        e.name.toLowerCase().endsWith('.html') &&
        !e.name.startsWith('_')
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const children = [];
  const landingItems = [];

  for (const d of dirs) {
    const childPath = path.join(dir, d.name);
    const childRel = relBase ? `${relBase}/${d.name}` : d.name;
    const node = await walk(childPath, childRel);
    node.type = 'folder';
    node.path = childRel;
    children.push(node);
    landingItems.push({
      type: 'folder',
      name: node.name,
      href: node.landing ? `${d.name}/_pagina.html` : null,
    });
  }

  for (const f of files) {
    const rel = relBase ? `${relBase}/${f.name}` : f.name;
    const name = prettify(f.name.replace(/\.html$/i, ''));
    children.push({
      type: 'file',
      name,
      path: `content/${rel}`,
    });
    landingItems.push({ type: 'file', name, href: f.name });
  }

  const meta = await readMeta(dir);
  const node = { children };

  if (meta) {
    node.name = meta.title || prettify(path.basename(dir));
    node.description = meta.description || null;

    const depth = relBase ? relBase.split('/').length + 1 : 1;
    const backPath = '../'.repeat(depth) + 'index.html';

    const html = landingPageTemplate({
      title: node.name,
      description: node.description,
      backPath,
      items: landingItems,
    });

    await fs.writeFile(path.join(dir, '_pagina.html'), html);
    node.landing = relBase ? `content/${relBase}/_pagina.html` : 'content/_pagina.html';
  } else {
    node.name = prettify(path.basename(dir));
  }

  return node;
}

async function main() {
  try {
    await fs.access(CONTENT_DIR);
  } catch {
    console.log('No existe la carpeta content/, se genera un menú vacío.');
    await fs.writeFile(
      OUTPUT_FILE,
      JSON.stringify({ name: 'Contenidos', type: 'folder', path: '', children: [] }, null, 2)
    );
    return;
  }

  const tree = await walk(CONTENT_DIR);
  tree.name = 'Contenidos';
  tree.type = 'folder';
  tree.path = '';

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(tree, null, 2));
  console.log('menu.json generado con éxito (con páginas de portada donde había meta.json).');
}

main();
