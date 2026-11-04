// Marcas de sesión en las guías del profesorado: «3.º ESO B va por la sesión 4».
// Se guardan en una hoja de Google (scripts/marcas-sesion.gs), así que se ven desde cualquier navegador.
// Verlas no pide nada; para cambiarlas hace falta la clave, que se pide una vez en cada navegador.
// scripts/build-site.mjs añade este archivo a cada guia-profesorado.html al publicar.
(function () {
  // URL /exec de la aplicación web. Mientras esté vacía, las guías se ven como siempre.
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwPupS6l45QGDCc0UutXPiTYCWkXwWhswTVHLB1sNV44n1Iq081I-G7LAAysCu5Ovn-pg/exec';

  const ruta = location.pathname.match(/content\/(.+)\/guia-profesorado\.html$/);
  if (!ENDPOINT || !ruta) return;
  const GUIA = ruta[1];
  const CLAVE_LS = 'marcas-sesion-clave';

  // Las guías generadas con la plantilla tienen la lista de sesiones en S; las antiguas, no.
  const lista = document.getElementById('slist');
  const numeros = lista && typeof S !== 'undefined' ? S.sesiones.map((s) => s.n) : null;
  let marcas = [];
  let aviso = '';

  const leerClave = () => {
    try { return localStorage.getItem(CLAVE_LS) || ''; } catch (_) { return ''; }
  };
  const guardarClave = (v) => {
    try { v ? localStorage.setItem(CLAVE_LS, v) : localStorage.removeItem(CLAVE_LS); } catch (_) {}
  };
  const siguiente = (n) => {
    if (!numeros) return n + 1;
    const i = numeros.indexOf(n);
    return i >= 0 && i < numeros.length - 1 ? numeros[i + 1] : null;
  };

  function el(tag, props, ...hijos) {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...hijos);
    return e;
  }

  const estilo = el('style', {
    textContent: `
    .ms-fila{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;font:13px/1.4 system-ui,sans-serif}
    .ms-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 4px 2px 10px;border-radius:999px;background:var(--warn-bg,#fef3c7);color:var(--warn-ink,#78350f);border:1px solid var(--warn-line,#d97706);font-weight:600}
    .ms-chip button{border:0;background:none;color:inherit;font:inherit;cursor:pointer;min-width:24px;min-height:24px;border-radius:999px}
    .ms-chip button:hover{background:rgba(0,0,0,.12)}
    .ms-add,.ms-ok,.ms-no,.ms-abrir{font:inherit;cursor:pointer;border-radius:8px;padding:3px 10px;min-height:28px;border:1px solid var(--line,#cbd5e1);background:var(--card,#fff);color:var(--ink,#1e293b)}
    .ms-add{border-style:dashed;color:var(--muted,#64748b);background:none}
    .ms-ok{background:var(--brand,#0f766e);border-color:transparent;color:var(--card,#fff);font-weight:600}
    .ms-form{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
    .ms-form input{font:inherit;padding:3px 8px;min-height:28px;width:130px;border-radius:8px;border:1px solid var(--line,#cbd5e1);background:var(--card,#fff);color:var(--ink,#1e293b)}
    .ms-form input[type=number]{width:76px}
    .ms-aviso{flex-basis:100%;color:#b91c1c;font-weight:600}
    .ms-ayuda{flex-basis:100%;color:var(--muted,#64748b);font-size:12px}
    .ms-panel{position:fixed;right:16px;bottom:16px;z-index:9999;max-width:min(380px,calc(100vw - 32px));font:13px/1.4 system-ui,sans-serif;color:var(--ink,#1e293b)}
    .ms-abrir{display:block;margin-left:auto;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.25);min-height:36px;border-radius:999px;padding:4px 14px}
    .ms-caja{background:var(--card,#fff);border:1px solid var(--line,#cbd5e1);border-radius:12px;padding:12px;margin-bottom:8px;box-shadow:0 4px 16px rgba(0,0,0,.25);max-height:60vh;overflow:auto}
    .ms-caja h2{font-size:14px;margin:0 0 8px}
    .ms-caja .ms-chip{margin:0 0 6px}
    @media print{.ms-fila,.ms-panel{display:none!important}}`,
  });
  document.head.append(estilo);

  async function enviar(accion, sesion, nota, clave) {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      // text/plain evita la comprobación previa de CORS, que Apps Script no atiende.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ clave, accion, guia: GUIA, sesion, nota }),
    });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'datos');
    guardarClave(clave);
    marcas = d.marcas;
    aviso = '';
    pintar();
  }

  // Sin clave guardada (o si ya no vale) se abre el formulario para pedirla.
  async function cambiar(accion, sesion, nota) {
    try {
      await enviar(accion, sesion, nota, leerClave());
    } catch (err) {
      if (err.message === 'clave') guardarClave('');
      aviso = err.message === 'clave' ? 'Escribe la clave para cambiar las marcas.' : 'No se ha podido guardar. Inténtalo de nuevo.';
      panelAbierto = true;
      pintar();
    }
  }

  function formulario(sesionFija, alCerrar) {
    const nota = el('input', { type: 'text', placeholder: 'Grupo: 3.º ESO B', maxLength: 40, required: true });
    nota.setAttribute('aria-label', 'Grupo o nota');
    nota.setAttribute('list', 'ms-grupos');
    const sesion = el('input', { type: 'number', min: 0, max: 999, placeholder: 'Sesión', required: true });
    sesion.setAttribute('aria-label', 'Número de sesión');
    const clave = el('input', { type: 'password', placeholder: 'Clave', required: true, autocomplete: 'off' });
    clave.setAttribute('aria-label', 'Clave para editar');
    const error = el('span', { className: 'ms-aviso', hidden: true });
    const ok = el('button', { type: 'submit', className: 'ms-ok', textContent: 'Guardar' });
    const no = el('button', { type: 'button', className: 'ms-no', textContent: 'Cancelar', onclick: alCerrar });
    const form = el('form', { className: 'ms-form' }, nota);
    if (sesionFija === null) form.append(sesion);
    if (!leerClave()) form.append(clave);
    form.append(ok, no, error);
    form.addEventListener('keydown', (e) => { if (e.key === 'Escape') alCerrar(); });
    // Dentro de un <summary>, Firefox pliega la sesión al pulsar la barra espaciadora.
    form.addEventListener('keyup', (e) => { if (e.key === ' ') e.preventDefault(); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      ok.disabled = true;
      error.hidden = true;
      try {
        await enviar('poner', sesionFija === null ? Number(sesion.value) : sesionFija, nota.value.trim(), leerClave() || clave.value.trim());
      } catch (err) {
        ok.disabled = false;
        if (err.message === 'clave') {
          guardarClave('');
          if (!clave.isConnected) form.insertBefore(clave, ok);
          error.textContent = 'La clave no es correcta.';
        } else {
          error.textContent = 'No se ha podido guardar. Inténtalo de nuevo.';
        }
        error.hidden = false;
      }
    });
    setTimeout(() => nota.focus());
    return form;
  }

  function chip(m, conSesion) {
    const c = el('span', {
      className: 'ms-chip',
      title: m.fecha ? 'Actualizado: ' + m.fecha : '',
      textContent: '📍 ' + m.nota + (conSesion ? ' · sesión ' + m.sesion : ''),
    });
    const sig = siguiente(m.sesion);
    if (sig !== null) {
      c.append(el('button', {
        type: 'button',
        textContent: '→',
        title: 'Pasar a la sesión ' + sig,
        onclick: () => cambiar('poner', sig, m.nota),
      }));
    }
    c.append(el('button', {
      type: 'button',
      textContent: '✕',
      title: 'Quitar la marca',
      onclick: () => cambiar('quitar', m.sesion, m.nota),
    }));
    return c;
  }

  // ---------- dentro de cada sesión (guías con plantilla) ----------
  function pintarSesion(det) {
    const n = Number(det.dataset.n);
    const destino = det.querySelector('summary > div:last-child');
    if (!destino) return;
    let fila = destino.querySelector(':scope > .ms-fila');
    if (!fila) {
      fila = el('div', { className: 'ms-fila' });
      // Usar los controles no debe plegar ni desplegar la sesión.
      fila.addEventListener('click', (e) => {
        if (!e.target.closest('button, input, form')) return;
        e.preventDefault();
        if (e.target.type === 'submit') e.target.form.requestSubmit();
      });
      destino.append(fila);
    }
    const add = el('button', { type: 'button', className: 'ms-add', textContent: '＋ Grupo aquí' });
    add.onclick = () => {
      fila.replaceChildren(formulario(n, () => pintarSesion(det)));
    };
    fila.replaceChildren(...marcas.filter((m) => m.sesion === n).map((m) => chip(m, false)), add);
  }
  const pintarSesiones = () => { if (lista) lista.querySelectorAll('details.ses[data-n]').forEach(pintarSesion); };
  // Los filtros de fase y DUA vuelven a generar la lista de sesiones.
  if (lista) new MutationObserver(pintarSesiones).observe(lista, { childList: true });

  // ---------- panel flotante (en todas las guías) ----------
  let panelAbierto = false;
  const panel = el('aside', { className: 'ms-panel' });
  panel.setAttribute('aria-label', 'Por dónde va cada grupo');
  document.body.append(panel);

  function pintarPanel() {
    const orden = [...marcas].sort((a, b) => a.sesion - b.sesion);
    const abrir = el('button', {
      type: 'button',
      className: 'ms-abrir',
      textContent: '📍 Grupos' + (marcas.length ? ' (' + marcas.length + ')' : ''),
      onclick: () => { panelAbierto = !panelAbierto; pintarPanel(); },
    });
    abrir.setAttribute('aria-expanded', panelAbierto);
    if (!panelAbierto) return panel.replaceChildren(abrir);

    const caja = el('div', { className: 'ms-caja' }, el('h2', { textContent: 'Por dónde va cada grupo' }));
    if (aviso) caja.append(el('div', { className: 'ms-aviso', textContent: aviso }));
    const chips = el('div', { className: 'ms-fila' }, ...orden.map((m) => chip(m, true)));
    if (!orden.length) chips.append(el('span', { className: 'ms-ayuda', textContent: 'Aún no hay ningún grupo marcado en esta guía.' }));
    caja.append(chips);
    caja.append(el('p', { className: 'ms-ayuda', textContent: 'Las marcas son públicas: escribe solo el grupo, nunca el nombre de un alumno o alumna.' }));
    caja.append(formulario(null, () => { panelAbierto = false; aviso = ''; pintarPanel(); }));
    panel.replaceChildren(caja, abrir);
  }

  // Propone al escribir los grupos ya usados en esta guía.
  const grupos = el('datalist', { id: 'ms-grupos' });
  document.body.append(grupos);

  function pintar() {
    grupos.replaceChildren(...[...new Set(marcas.map((m) => m.nota))].map((v) => el('option', { value: v })));
    pintarSesiones();
    pintarPanel();
  }

  pintar();
  fetch(ENDPOINT + '?guia=' + encodeURIComponent(GUIA))
    .then((r) => r.json())
    .then((d) => {
      if (!d.ok) throw new Error(d.error);
      marcas = d.marcas;
      pintar();
    })
    .catch(() => {
      aviso = 'No se han podido cargar las marcas.';
      panelAbierto = true;
      pintarPanel();
    });
})();
