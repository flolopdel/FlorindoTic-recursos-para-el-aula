let fullTree = null;

async function loadMenu() {
  const container = document.getElementById('menu');
  try {
    const res = await fetch('menu.json', { cache: 'no-store' });
    fullTree = await res.json();
    renderTree(fullTree);
  } catch (err) {
    container.innerHTML = '<p>Error cargando el menú.</p>';
    console.error(err);
  }
}

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function filterTree(node, query) {
  if (node.type === 'file') {
    return normalize(node.name).includes(query) ? node : null;
  }

  const selfMatches =
    normalize(node.name).includes(query) ||
    (node.description && normalize(node.description).includes(query));

  const filteredChildren = (node.children || [])
    .map((child) => filterTree(child, query))
    .filter(Boolean);

  if (selfMatches || filteredChildren.length > 0) {
    return {
      ...node,
      children: selfMatches ? node.children : filteredChildren,
    };
  }

  return null;
}

function renderTree(tree, query = '') {
  const container = document.getElementById('menu');
  container.innerHTML = '';

  if (!tree.children || tree.children.length === 0) {
    container.innerHTML = query
      ? '<p>Sin resultados para tu búsqueda.</p>'
      : '<p>Todavía no hay contenidos. Añade carpetas y archivos <code>.html</code> dentro de <code>content/</code> y haz push.</p>';
    return;
  }

  container.appendChild(renderNode(tree, true, Boolean(query)));
}

function renderNode(node, isRoot = false, forceOpen = false) {
  if (node.type === 'file') {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = node.path;
    a.textContent = '📄 ' + node.name;
    li.appendChild(a);
    return li;
  }

  if (isRoot) {
    const ul = document.createElement('ul');
    ul.className = 'menu-root';
    for (const child of node.children) {
      ul.appendChild(renderNode(child, false, forceOpen));
    }
    return ul;
  }

  const li = document.createElement('li');
  const details = document.createElement('details');
  if (forceOpen) details.open = true;

  const summary = document.createElement('summary');
  if (node.landing) {
    const a = document.createElement('a');
    a.href = node.landing;
    a.className = 'folder-link';
    a.textContent = '📁 ' + node.name;
    summary.appendChild(a);
  } else {
    const span = document.createElement('span');
    span.textContent = '📁 ' + node.name;
    summary.appendChild(span);
  }
  details.appendChild(summary);

  const ul = document.createElement('ul');
  for (const child of node.children) {
    ul.appendChild(renderNode(child, false, forceOpen));
  }
  details.appendChild(ul);
  li.appendChild(details);
  return li;
}

function handleSearch(event) {
  const query = normalize(event.target.value.trim());
  if (!query) {
    renderTree(fullTree);
    return;
  }
  const filtered = filterTree(fullTree, query) || { ...fullTree, children: [] };
  renderTree(filtered, query);
}

document.addEventListener('DOMContentLoaded', () => {
  loadMenu();
  document.getElementById('buscador').addEventListener('input', handleSearch);
});
