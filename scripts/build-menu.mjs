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
            return `<li class="tarjeta tarjeta-archivo"><a href="${item.href}"><span class="icono">📄</span><span class="nombre">${item.name}</span></a></li>`;
          }
          if (item.href) {
            return `<li class="tarjeta tarjeta-carpeta"><a href="${item.href}"><span class="icono">📁</span><span class="nombre">${item.name}</span></a></li>`;
          }
          return `<li class="tarjeta tarjeta-carpeta sin-portada"><span class="icono">📁</span><span class="nombre">${item.name}</span><span class="nota">(usa el menú lateral)</span></li>`;
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
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&family=Inter:wght@400;500;600&display=swap');

    :root {
      --primary: #6d28d9;
      --primary-dark: #4c1d95;
      --secondary: #0891b2;
      --accent-pink: #ec4899;
      --accent-amber: #f59e0b;
      --accent-green: #16a34a;
      --bg: #f4f5fb;
      --texto: #1e1b2e;
      --texto-suave: #635f77;
      --borde: #e6e3f2;
    }

    * { box-sizing: border-box; }

    body {
      font-family: 'Inter', system-ui, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 0 1.5rem 3rem;
      color: var(--texto);
      background: var(--bg);
      line-height: 1.55;
    }

    a.volver {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      margin: 1.5rem 0 0.5rem;
      padding: 0.5rem 1rem;
      background: white;
      border: 2px solid var(--borde);
      border-radius: 999px;
      color: var(--primary);
      text-decoration: none;
      font-weight: 700;
      font-size: 0.9rem;
    }
    a.volver:hover { border-color: var(--primary); }

    .cabecera {
      background: linear-gradient(120deg, var(--primary-dark) 0%, var(--primary) 55%, var(--accent-pink) 130%);
      color: white;
      padding: 2rem 2.2rem;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(76, 29, 149, 0.2);
      margin: 1rem 0 2rem;
    }

    h1 {
      font-family: 'Poppins', sans-serif;
      font-weight: 800;
      font-size: clamp(1.6rem, 4vw, 2.2rem);
      margin: 0 0 0.4rem;
    }

    p.desc {
      margin: 0;
      opacity: 0.95;
      font-size: 1.05rem;
    }

    ul.listado {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
    }

    ul.listado li.tarjeta {
      background: white;
      border: 1px solid var(--borde);
      border-radius: 14px;
      box-shadow: 0 4px 14px rgba(76, 29, 149, 0.06);
      transition: transform 0.12s, box-shadow 0.12s;
    }

    ul.listado li.tarjeta:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 22px rgba(76, 29, 149, 0.14);
    }

    ul.listado li.tarjeta a {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      padding: 1.1rem 1.2rem;
      color: inherit;
      text-decoration: none;
    }

    ul.listado li.tarjeta .icono { font-size: 1.6rem; }

    ul.listado li.tarjeta .nombre {
      font-family: 'Poppins', sans-serif;
      font-weight: 700;
      color: var(--texto);
      font-size: 1.02rem;
    }

    ul.listado li.tarjeta-carpeta { border-top: 4px solid var(--primary); }
    ul.listado li.tarjeta-carpeta:nth-of-type(5n+2) { border-top-color: var(--secondary); }
    ul.listado li.tarjeta-carpeta:nth-of-type(5n+3) { border-top-color: var(--accent-amber); }
    ul.listado li.tarjeta-carpeta:nth-of-type(5n+4) { border-top-color: var(--accent-pink); }
    ul.listado li.tarjeta-carpeta:nth-of-type(5n+5) { border-top-color: var(--accent-green); }
    ul.listado li.tarjeta-archivo { border-top: 4px solid var(--secondary); }

    li.sin-portada {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      padding: 1.1rem 1.2rem;
      color: var(--texto-suave);
    }
    li.sin-portada .nota { font-size: 0.8rem; font-style: italic; }

    .vacio {
      grid-column: 1 / -1;
      color: var(--texto-suave);
      font-style: italic;
      padding: 1rem 0;
    }
  </style>
</head>
<body>
  <a class="volver" href="${backPath}">&larr; Volver al índice</a>
  <div class="cabecera">
    <h1>${title}</h1>
    ${description ? `<p class="desc">${description}</p>` : ''}
  </div>
  <ul class="listado">
      ${itemsHtml}
  </ul>
  <script>
    if (window.top !== window.self) {
      document.querySelector('.volver').style.display = 'none';
    }
  </script>
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
