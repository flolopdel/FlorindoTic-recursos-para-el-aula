let fullTree = null;
let activeLink = null;

async function loadMenu() {
  const container = document.getElementById('menu');
  try {
    const res = await fetch('menu.json', { cache: 'no-store' });
    fullTree = await res.json();
    renderTree(fullTree);

    const initialPath = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (initialPath) {
      loadIntoFrame(initialPath);
    }
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

  const currentPath = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (currentPath) highlightLink(currentPath);
}

function makeLink(path, label, extraClass) {
  const a = document.createElement('a');
  a.href = path;
  a.textContent = label;
  a.dataset.path = path;
  if (extraClass) a.className = extraClass;

  a.addEventListener('click', (event) => {
    // Dejar el comportamiento normal del navegador si abre en pestaña nueva
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) {
      return;
    }
    event.preventDefault();
    openContent(path);
  });

  return a;
}

function renderNode(node, isRoot = false, forceOpen = false) {
  if (node.type === 'file') {
    const li = document.createElement('li');
    li.appendChild(makeLink(node.path, '📄 ' + node.name));
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
  if (forceOpen || node.current) details.open = true;

  const summary = document.createElement('summary');
  if (node.landing) {
    summary.appendChild(makeLink(node.landing, '📁 ' + node.name, 'folder-link'));
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

function openContent(path) {
  const currentPath = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (currentPath === path) {
    loadIntoFrame(path);
    return;
  }
  location.hash = encodeURIComponent(path);
}

function loadIntoFrame(path) {
  const frame = document.getElementById('content-frame');
  frame.removeAttribute('srcdoc');
  frame.src = path;

  const toolbar = document.getElementById('content-toolbar');
  const openLink = document.getElementById('open-fullscreen');
  toolbar.hidden = false;
  openLink.href = path;

  highlightLink(path);
}

function highlightLink(path) {
  if (activeLink) activeLink.classList.remove('active');

  const el = document.querySelector(`[data-path="${CSS.escape(path)}"]`);
  if (!el) return;

  el.classList.add('active');
  activeLink = el;

  let ancestor = el.closest('details');
  while (ancestor) {
    ancestor.open = true;
    ancestor = ancestor.parentElement ? ancestor.parentElement.closest('details') : null;
  }
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

window.addEventListener('hashchange', () => {
  const path = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (path) loadIntoFrame(path);
});

document.addEventListener('DOMContentLoaded', () => {
  loadMenu();
  document.getElementById('buscador').addEventListener('input', handleSearch);
});
