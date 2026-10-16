// Aula TIC — portal (menú, búsqueda, navegación y herramientas de aula)
// Lee el mismo menu.json que la versión actual y es compatible con sus enlaces
// (#content/ruta/al/archivo.html), así que los enlaces ya compartidos siguen funcionando.

const BASE = document.documentElement.dataset.base || '';
const SITE_ROOT = new URL(BASE || './', location.href);
const QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
const MAX_RECIENTES = 6;
const MAX_RESULTADOS = 25;

const $ = (sel) => document.querySelector(sel);
const frame = $('#content-frame');

let tree = null;
let pages = new Map(); // path → { path, name, crumbs, siblings }
let textIndex = null; // [{ path, title, text }] — opcional (lo genera build-site.mjs)

/* ---------------- Utilidades ---------------- */

function normalize(text) {
  return (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function storage(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return null;
  }
}

function currentPath() {
  return decodeURIComponent(location.hash.replace(/^#/, ''));
}

function aviso(texto) {
  const el = $('#aviso');
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => (el.hidden = true), 2200);
}

function isNarrow() {
  return matchMedia('(max-width: 860px)').matches;
}

/* ---------------- Datos ---------------- */

function indexTree(node, crumbs = []) {
  const files = (node.children || []).filter((c) => c.type === 'file');
  for (const child of node.children || []) {
    if (child.type === 'file') {
      pages.set(child.path, { path: child.path, name: child.name, crumbs, siblings: files });
    } else {
      const crumb = { name: child.name, landing: child.landing || null };
      if (child.landing) {
        pages.set(child.landing, { path: child.landing, name: child.name, crumbs, siblings: [] });
      }
      indexTree(child, [...crumbs, crumb]);
    }
  }
}

async function loadData() {
  const res = await fetch(BASE + 'menu.json', { cache: 'no-store' });
  tree = await res.json();
  indexTree(tree);

  // Opcionales: no rompen nada si no existen (p. ej. en local sin build-site).
  fetch(BASE + 'search-index.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => (textIndex = data))
    .catch(() => {});
  fetch(BASE + 'version.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((v) => {
      if (!v) return;
      const fecha = new Date(v.builtAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
      $('#version').textContent = `Actualizado: ${fecha} · ${v.pages} páginas`;
    })
    .catch(() => {});
}

/* ---------------- Menú ---------------- */

function makeLink(path, label) {
  const a = document.createElement('a');
  a.href = '#' + encodeURIComponent(path);
  a.textContent = label;
  a.dataset.path = path;
  return a;
}

function renderNode(node) {
  const li = document.createElement('li');
  if (node.type === 'file') {
    li.appendChild(makeLink(node.path, '📄 ' + node.name));
    return li;
  }
  const details = document.createElement('details');
  details.open = Boolean(node.current);
  const summary = document.createElement('summary');
  if (node.landing) summary.appendChild(makeLink(node.landing, '📁 ' + node.name));
  else summary.textContent = '📁 ' + node.name;
  details.appendChild(summary);
  const ul = document.createElement('ul');
  for (const child of node.children || []) ul.appendChild(renderNode(child));
  details.appendChild(ul);
  li.appendChild(details);
  return li;
}

function renderMenu() {
  const menu = $('#menu');
  menu.innerHTML = '';
  if (!tree.children || !tree.children.length) {
    menu.innerHTML = '<p class="cargando">Todavía no hay contenidos.</p>';
    return;
  }
  const ul = document.createElement('ul');
  for (const child of tree.children) ul.appendChild(renderNode(child));
  menu.appendChild(ul);
}

function highlight(path) {
  document.querySelectorAll('#menu [aria-current]').forEach((el) => el.removeAttribute('aria-current'));
  const el = document.querySelector(`#menu [data-path="${CSS.escape(path)}"]`);
  if (!el) return;
  el.setAttribute('aria-current', 'page');
  for (let d = el.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
  el.scrollIntoView({ block: 'nearest' });
}

function setAllOpen(open) {
  document.querySelectorAll('#menu details').forEach((d) => (d.open = open));
}

/* ---------------- Recientes ---------------- */

function pushReciente(path) {
  const page = pages.get(path);
  if (!page) return;
  const list = (storage('aula-recientes') || []).filter((p) => p !== path);
  list.unshift(path);
  storage('aula-recientes', list.slice(0, MAX_RECIENTES));
  renderRecientes();
}

function renderRecientes() {
  const list = (storage('aula-recientes') || []).filter((p) => pages.has(p));
  const section = $('#recientes');
  section.hidden = !list.length || Boolean($('#buscador').value.trim());
  const ul = section.querySelector('ul');
  ul.innerHTML = '';
  for (const path of list) ul.appendChild(resultItem(path));
}

function resultItem(path, snippet) {
  const page = pages.get(path);
  const li = document.createElement('li');
  const a = makeLink(path, page ? page.name : path);
  const small = document.createElement('small');
  if (snippet) small.innerHTML = snippet;
  else small.textContent = page ? page.crumbs.map((c) => c.name).join(' › ') : '';
  a.appendChild(small);
  li.appendChild(a);
  return li;
}

/* ---------------- Búsqueda ---------------- */

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function makeSnippet(text, query) {
  const i = normalize(text).indexOf(query);
  if (i < 0) return null;
  const start = Math.max(0, i - 40);
  const end = Math.min(text.length, i + query.length + 60);
  return (
    (start ? '…' : '') +
    escapeHtml(text.slice(start, i)) +
    '<mark>' + escapeHtml(text.slice(i, i + query.length)) + '</mark>' +
    escapeHtml(text.slice(i + query.length, end)) +
    (end < text.length ? '…' : '')
  );
}

function search(raw) {
  const query = normalize(raw.trim());
  const section = $('#resultados');
  const ul = section.querySelector('ul');
  ul.innerHTML = '';
  if (!query) {
    section.hidden = true;
    renderRecientes();
    return;
  }
  $('#recientes').hidden = true;

  const results = new Map();
  for (const page of pages.values()) {
    const haystack = normalize([page.name, ...page.crumbs.map((c) => c.name)].join(' '));
    if (haystack.includes(query)) results.set(page.path, null);
  }
  for (const entry of textIndex || []) {
    if (results.size >= MAX_RESULTADOS) break;
    if (results.has(entry.path) || !pages.has(entry.path)) continue;
    const snippet = makeSnippet(entry.text, query) || (entry.title && makeSnippet(entry.title, query));
    if (snippet) results.set(entry.path, snippet);
  }

  section.hidden = false;
  section.querySelector('h2').textContent = results.size
    ? `Resultados (${Math.min(results.size, MAX_RESULTADOS)})`
    : 'Sin resultados';
  [...results].slice(0, MAX_RESULTADOS).forEach(([path, snippet]) => ul.appendChild(resultItem(path, snippet)));
}

/* ---------------- Navegación ---------------- */

function renderMigas(path) {
  const page = pages.get(path);
  const migas = $('#migas');
  migas.innerHTML = '';
  const parts = page ? page.crumbs : [];
  for (const crumb of parts) {
    if (crumb.landing) migas.appendChild(makeLink(crumb.landing, crumb.name));
    else migas.appendChild(document.createTextNode(crumb.name));
    const sep = document.createElement('span');
    sep.className = 'sep';
    sep.textContent = '›';
    migas.appendChild(sep);
  }
  const strong = document.createElement('strong');
  strong.textContent = page ? page.name : path.split('/').pop();
  migas.appendChild(strong);
}

function updateVecinos(path) {
  const page = pages.get(path);
  const sibs = page ? page.siblings : [];
  const i = sibs.findIndex((s) => s.path === path);
  const prev = i > 0 ? sibs[i - 1] : null;
  const next = i >= 0 && i < sibs.length - 1 ? sibs[i + 1] : null;
  for (const [btn, target] of [[$('#btn-anterior'), prev], [$('#btn-siguiente'), next]]) {
    btn.disabled = !target;
    btn.dataset.path = target ? target.path : '';
    btn.title = target ? target.name : 'No hay más en esta carpeta';
  }
}

function show(path) {
  const page = pages.get(path);
  const url = new URL(path, SITE_ROOT).href;
  if (frame.contentWindow && frame.dataset.path !== path) {
    frame.dataset.path = path;
    frame.src = url;
  }
  $('#toolbar').hidden = false;
  $('#btn-pestana').href = url;
  document.title = (page ? page.name + ' · ' : '') + 'Aula TIC de Florindo';
  renderMigas(path);
  updateVecinos(path);
  highlight(path);
  pushReciente(path);
}

function go(path) {
  if (!path) return;
  if (currentPath() === path) show(path);
  else location.hash = encodeURIComponent(path);
  if (isNarrow()) toggleMenu(false);
}

// Si se navega DENTRO del iframe (p. ej. desde una portada), sincronizar la URL.
frame.addEventListener('load', () => {
  try {
    const href = decodeURI(frame.contentWindow.location.pathname);
    const root = decodeURI(SITE_ROOT.pathname);
    if (!href.startsWith(root)) return;
    const path = href.slice(root.length);
    if (!path.startsWith('content/') || path === currentPath()) return;
    frame.dataset.path = path;
    history.replaceState(null, '', '#' + encodeURIComponent(path));
    show(path);
  } catch {
    /* página de otro origen: ignorar */
  }
});

/* ---------------- Herramientas ---------------- */

function toggleMenu(force) {
  if (isNarrow()) {
    const open = force ?? !document.body.classList.contains('menu-abierto');
    document.body.classList.toggle('menu-abierto', open);
    $('#velo').hidden = !open;
    $('#btn-menu').setAttribute('aria-expanded', String(open));
  } else {
    const hidden = force === undefined ? !document.body.classList.contains('sin-menu') : !force;
    document.body.classList.toggle('sin-menu', hidden);
    $('#btn-menu').setAttribute('aria-expanded', String(!hidden));
    storage('aula-sin-menu', hidden);
  }
}

function toggleTema() {
  const root = document.documentElement;
  const oscuroAhora =
    root.dataset.tema === 'oscuro' || (!root.dataset.tema && matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.tema = oscuroAhora ? 'claro' : 'oscuro';
  try {
    localStorage.setItem('aula-tema', root.dataset.tema);
  } catch {}
}

async function copiarEnlace() {
  try {
    await navigator.clipboard.writeText(location.href);
    aviso('Enlace copiado ✔');
  } catch {
    prompt('Copia este enlace:', location.href);
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function mostrarQR() {
  const dlg = $('#dlg-qr');
  const box = $('#qr-canvas');
  const page = pages.get(currentPath());
  $('#qr-nombre').textContent = page ? page.name : '';
  $('#qr-url').textContent = location.href;
  box.innerHTML = '';
  dlg.showModal();
  try {
    if (!window.QRCode) await loadScript(QR_LIB);
    new window.QRCode(box, { text: location.href, width: 512, height: 512, correctLevel: window.QRCode.CorrectLevel.M });
  } catch {
    box.textContent = 'No se pudo generar el QR (¿sin conexión?).';
  }
}

function togglePizarra() {
  const on = !document.body.classList.contains('pizarra');
  document.body.classList.toggle('pizarra', on);
  if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) document.body.classList.remove('pizarra');
});

/* ---------------- Arranque ---------------- */

function bind() {
  $('#menu').addEventListener('click', (e) => {
    const a = e.target.closest('a[data-path]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    go(a.dataset.path);
  });
  for (const sel of ['#recientes', '#resultados', '#migas']) {
    $(sel).addEventListener('click', (e) => {
      const a = e.target.closest('a[data-path]');
      if (!a || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      go(a.dataset.path);
    });
  }

  $('#buscador').addEventListener('input', (e) => search(e.target.value));
  $('#btn-menu').addEventListener('click', () => toggleMenu());
  $('#velo').addEventListener('click', () => toggleMenu(false));
  $('#btn-tema').addEventListener('click', toggleTema);
  $('#btn-expandir').addEventListener('click', () => setAllOpen(true));
  $('#btn-plegar').addEventListener('click', () => setAllOpen(false));
  $('#btn-anterior').addEventListener('click', (e) => go(e.currentTarget.dataset.path));
  $('#btn-siguiente').addEventListener('click', (e) => go(e.currentTarget.dataset.path));
  $('#btn-copiar').addEventListener('click', copiarEnlace);
  $('#btn-qr').addEventListener('click', mostrarQR);
  $('#btn-pizarra').addEventListener('click', togglePizarra);

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === '/' && !typing) {
      e.preventDefault();
      if (isNarrow()) toggleMenu(true);
      $('#buscador').focus();
    } else if (e.key === 'Escape' && document.activeElement === $('#buscador')) {
      $('#buscador').value = '';
      search('');
    } else if (!typing && e.altKey && e.key === 'ArrowLeft') {
      go($('#btn-anterior').dataset.path);
    } else if (!typing && e.altKey && e.key === 'ArrowRight') {
      go($('#btn-siguiente').dataset.path);
    }
  });

  window.addEventListener('hashchange', () => {
    const path = currentPath();
    if (path) show(path);
  });
}

async function init() {
  bind();
  if (!isNarrow() && storage('aula-sin-menu')) toggleMenu(false);
  try {
    await loadData();
    renderMenu();
    renderRecientes();
    const path = currentPath();
    if (path) show(path);
  } catch (err) {
    console.error(err);
    $('#menu').innerHTML = '<p class="cargando">Error cargando el menú.</p>';
  }
}

init();
