// Aula TIC — portal (menú, búsqueda, navegación y herramientas de aula)
// Lee el mismo menu.json que la versión actual y es compatible con sus enlaces
// (#content/ruta/al/archivo.html), así que los enlaces ya compartidos siguen funcionando.

const BASE = document.documentElement.dataset.base || '';
const SITE_ROOT = new URL(BASE || './', location.href);
const QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
const MAX_RESULTADOS = 25;
// La misma aplicación web y la misma clave que las marcas de sesión (js/marcas-sesion.js).
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwPupS6l45QGDCc0UutXPiTYCWkXwWhswTVHLB1sNV44n1Iq081I-G7LAAysCu5Ovn-pg/exec';
const CLAVE_LS = 'marcas-sesion-clave';
const FIJADOS_LS = 'aula-fijados';
const SINC_LS = 'aula-fijados-sinc';
const PAGINA_DOCENTE = /\/(guia-profesorado|moodle)\.html$/i;

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
  if (node.path && node.path.endsWith('/#docente')) li.className = 'solo-docente';
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

/* ---------------- Fijados ---------------- */

// Solo el docente fija páginas: sin su clave (la misma de las marcas de sesión) no se ve el botón ni
// el apartado, y no se llama nunca al servidor. La lista buena es la de la hoja de Google; el
// navegador guarda una copia para pintarla al instante.
function leerClave() {
  try {
    return localStorage.getItem(CLAVE_LS) || '';
  } catch {
    return '';
  }
}

function guardarClave(valor) {
  try {
    if (valor) localStorage.setItem(CLAVE_LS, valor);
    else localStorage.removeItem(CLAVE_LS);
    if (!valor) localStorage.removeItem(SINC_LS);
  } catch {}
}

// Solo cuando la hoja ha confirmado la clave, no por tenerla guardada. Oculta el material docente del
// menú y del buscador, pero no lo protege: las páginas son públicas para quien tenga su dirección.
function accesoDocente() {
  return Boolean(leerClave()) && estadoSync.estado === 'ok';
}

function visibleEnPortal(path) {
  return accesoDocente() || !PAGINA_DOCENTE.test(path);
}

function getFijados() {
  const list = storage(FIJADOS_LS);
  return Array.isArray(list) ? list : [];
}

function setFijados(list) {
  storage(FIJADOS_LS, list);
  renderFijados();
}

function renderFijados() {
  const list = getFijados().filter((p) => pages.has(p) && visibleEnPortal(p));
  const section = $('#fijados');
  section.hidden = !leerClave() || !list.length || Boolean($('#buscador').value.trim());
  const ul = section.querySelector('ul');
  ul.innerHTML = '';
  for (const path of list) {
    const li = resultItem(path);
    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = 'quitar-pin';
    quitar.textContent = '✕';
    quitar.title = 'Quitar de fijados';
    quitar.setAttribute('aria-label', `Quitar «${pages.get(path).name}» de fijados`);
    quitar.dataset.quitar = path;
    li.appendChild(quitar);
    ul.appendChild(li);
  }
  renderBotonFijar();
}

function renderBotonFijar() {
  const path = currentPath();
  const btn = $('#btn-fijar');
  const fijada = getFijados().includes(path);
  btn.hidden = !leerClave();
  btn.disabled = !pages.has(path);
  btn.setAttribute('aria-pressed', fijada);
  btn.title = fijada ? 'Quitar de fijados' : 'Fijar esta página';
  btn.querySelector('span').textContent = fijada ? 'Fijada' : 'Fijar';
}

// Las peticiones van en fila y solo se aplica la respuesta de la última, para que un clic rápido
// no quede pisado por la respuesta, ya antigua, de otro anterior.
let colaPines = Promise.resolve();
let pinesPendientes = 0;
let estadoSync = { estado: 'pendiente' }; // pendiente | ok | error

function sincronizarPines(cambios = {}, clave = leerClave()) {
  pinesPendientes++;
  const peticion = colaPines.then(async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      // text/plain evita la comprobación previa de CORS, que Apps Script no atiende.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion: 'pines', clave, ...cambios }),
    });
    const datos = await res.json();
    if (!datos.ok) throw new Error(datos.error || 'datos');
    return datos.pines;
  });
  colaPines = peticion.catch(() => {});
  return peticion.then(
    (pines) => {
      if (--pinesPendientes === 0) setFijados(pines);
    },
    (err) => {
      pinesPendientes--;
      throw err;
    }
  );
}

function motivoSync(err) {
  if (err.message === 'clave') return 'La clave no es correcta.';
  if (err.message === 'bloqueado') return 'Demasiados intentos. Espera 15 minutos.';
  if (err.message === 'datos') return 'El Apps Script no reconoce los fijados: publica su nueva versión.';
  return 'No se ha podido conectar. Inténtalo de nuevo.';
}

function marcarSync(estado, err) {
  estadoSync = { estado, motivo: err ? motivoSync(err) : '' };
  document.body.classList.toggle('acceso-docente', accesoDocente());
  renderSyncPines();
  renderFijados();
  const consulta = $('#buscador').value;
  if (consulta.trim()) search(consulta);
}

function clavePinesRechazada(err) {
  if (err.message !== 'clave') return;
  guardarClave('');
  renderFijados();
}

async function alternarFijado(path) {
  if (!pages.has(path) || !leerClave()) return;
  const fijada = getFijados().includes(path);
  setFijados(fijada ? getFijados().filter((p) => p !== path) : [...getFijados(), path]);
  try {
    await sincronizarPines(fijada ? { quitar: [path] } : { poner: [path] });
    marcarSync('ok');
  } catch (err) {
    setFijados(fijada ? [...getFijados(), path] : getFijados().filter((p) => p !== path));
    clavePinesRechazada(err);
    marcarSync('error', err);
    aviso('No se ha podido guardar el cambio');
  }
}

// La primera vez en este navegador se suben sus pines; después manda la lista de la hoja, para que
// lo quitado en otro navegador no vuelva a aparecer.
async function arrancarSyncPines() {
  if (!leerClave()) return;
  try {
    await sincronizarPines(storage(SINC_LS) ? {} : { poner: getFijados() });
    storage(SINC_LS, true);
    marcarSync('ok');
  } catch (err) {
    clavePinesRechazada(err);
    marcarSync('error', err);
  }
}

function renderSyncPines(mostrarFormulario = false) {
  const caja = $('#sync-pines');
  caja.innerHTML = '';
  if (leerClave()) {
    const salir = document.createElement('button');
    salir.type = 'button';
    salir.className = 'link-btn';
    salir.textContent = 'Desconectar';
    salir.title = 'Borra de este navegador la clave y los fijados. Siguen guardados en la hoja de Google.';
    salir.addEventListener('click', () => {
      guardarClave('');
      setFijados([]);
      marcarSync('pendiente');
    });
    const { estado, motivo } = estadoSync;
    if (estado === 'error') {
      const reintentar = document.createElement('button');
      reintentar.type = 'button';
      reintentar.className = 'link-btn';
      reintentar.textContent = 'Reintentar';
      reintentar.addEventListener('click', () => {
        marcarSync('pendiente');
        arrancarSyncPines();
      });
      caja.append(`⚠️ Sin sincronizar. ${motivo} `, reintentar, ' · ', salir);
    } else {
      caja.append(estado === 'ok' ? '🔄 Fijados sincronizados · ' : '🔄 Sincronizando… · ', salir);
    }
    return;
  }
  if (!mostrarFormulario) {
    const abrir = document.createElement('button');
    abrir.type = 'button';
    abrir.className = 'link-btn';
    abrir.textContent = 'Acceso docente';
    abrir.addEventListener('click', () => renderSyncPines(true));
    if (estadoSync.estado === 'error') caja.append(`⚠️ ${estadoSync.motivo} `);
    caja.append(abrir);
    return;
  }
  const form = document.createElement('form');
  form.className = 'form-sync';
  const clave = document.createElement('input');
  clave.type = 'password';
  clave.placeholder = 'Clave';
  clave.required = true;
  clave.autocomplete = 'off';
  clave.setAttribute('aria-label', 'Clave del docente');
  const ok = document.createElement('button');
  ok.type = 'submit';
  ok.className = 'link-btn';
  ok.textContent = 'Activar';
  const no = document.createElement('button');
  no.type = 'button';
  no.className = 'link-btn';
  no.textContent = 'Cancelar';
  no.addEventListener('click', () => renderSyncPines());
  const error = document.createElement('p');
  error.className = 'form-sync-error';
  error.setAttribute('role', 'alert');
  error.hidden = true;
  form.append(clave, ok, no, error);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ok.disabled = true;
    error.hidden = true;
    try {
      await sincronizarPines({ poner: getFijados() }, clave.value.trim());
      guardarClave(clave.value.trim());
      storage(SINC_LS, true);
      renderFijados();
      marcarSync('ok');
      aviso('Fijados sincronizados');
    } catch (err) {
      ok.disabled = false;
      error.textContent = motivoSync(err);
      error.hidden = false;
    }
  });
  caja.append(form);
  clave.focus();
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
    renderFijados();
    return;
  }
  $('#fijados').hidden = true;

  const results = new Map();
  for (const page of pages.values()) {
    const haystack = normalize([page.name, ...page.crumbs.map((c) => c.name)].join(' '));
    if (haystack.includes(query) && visibleEnPortal(page.path)) results.set(page.path, null);
  }
  for (const entry of textIndex || []) {
    if (results.size >= MAX_RESULTADOS) break;
    if (results.has(entry.path) || !pages.has(entry.path) || !visibleEnPortal(entry.path)) continue;
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
  renderBotonFijar();
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
  $('#fijados').addEventListener('click', (e) => {
    const quitar = e.target.closest('[data-quitar]');
    if (quitar) alternarFijado(quitar.dataset.quitar);
  });
  $('#btn-fijar').addEventListener('click', () => alternarFijado(currentPath()));
  for (const sel of ['#fijados', '#resultados', '#migas']) {
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
    renderFijados();
    renderSyncPines();
    arrancarSyncPines();
    const path = currentPath();
    if (path) show(path);
  } catch (err) {
    console.error(err);
    $('#menu').innerHTML = '<p class="cargando">Error cargando el menú.</p>';
  }
}

init();
