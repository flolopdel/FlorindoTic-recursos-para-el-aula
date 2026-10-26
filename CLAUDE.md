# Aula TIC de Florindo — instrucciones para agentes

Web estática de recursos de clase (Informática/Tecnología, ESO, Andalucía) publicada en
**https://florindotic.es** con GitHub Pages. El menú, las portadas y el buscador se generan solos a partir
de las carpetas de `content/`: **nunca se editan a mano** `menu.json` ni los `_pagina.html`.

## Estructura (no cambiar sin preguntar)

```
content/
  curso2026-2027/                    # un curso académico = cursoAAAA-AAAA (meta.json con "current": true)
    <asignatura>/                    # tecnologia-y-digitalizacion · digitalizacion · tecnologia · computacion-y-robotica
      <curso>/                       # 1-eso, 2-eso, 3-eso, 4-eso
        sda<N>/                      # una carpeta por situación de aprendizaje
          clase.html                 # web de clase (se proyecta y es lo que enlaza Moodle)
          guia-profesorado.html      # documento de la SdA        ┐ grupo «Docente»
          moodle.html                # bloque para pegar en Moodle ┘ del menú
          sda<N>.json                # datos de la SdA (de aquí sale el título del menú)
          Codigo.gs                  # crea los Google Forms (solo si la SdA tiene formularios)
          guia-alumnado.html         # opcional
          teoria.html                # opcional
          sesiones/                  # opcional: páginas de sesiones concretas
        programacion.html, cv_interactivo_*.html …
      comunes/                       # material compartido por varios cursos de la asignatura
```

- Nombres de archivo y carpeta en **minúsculas, sin tildes ni espacios, con guiones** (`ficha-escalas.pdf`).
- Las SdA se generan con la skill **sda-andalucia-tecnologia**, que publica con esos nombres fijos en una rama
  `sda/<asignatura>-<curso>-sda<N>` y abre una Pull Request. **No hagas push a `main` ni fusiones PR**: las
  fusiona el docente.

## No romper enlaces (Moodle enlaza estas páginas)

- **Nunca borres ni renombres** una página publicada sin dejar una redirección en el nombre antiguo.
  Plantilla (cambia `clase.html` por el destino):

  ```html
  <!doctype html>
  <html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="florindotic:redirect" content="clase.html">
    <meta name="robots" content="noindex">
    <meta http-equiv="refresh" content="0; url=clase.html">
    <link rel="canonical" href="clase.html">
    <title>Este material se ha movido</title>
    <script>location.replace('clase.html' + location.search + location.hash);</script>
  </head>
  <body><p>Este material se ha movido. <a href="clase.html">Ábrelo aquí</a>.</p></body>
  </html>
  ```

  Las páginas con `florindotic:redirect` no salen en el menú, el buscador ni el sitemap.
- `clase.html` **se queda siempre en la raíz de `sda<N>/`**: es la dirección que tiene Moodle.
- Un PDF no admite redirección: si se renombra, se deja también la copia con el nombre antiguo.
- Redirecciones existentes: en `sda1/` → `index.html`, `presentacion.html`; en `sda2/` de DIG 4.º, TYD 3.º y
  TEC 4.º → `1-guia-profesorado.html`, `2-guia-alumnado.html`, `3-presentacion.html`, `4-teoria.html`.
  PDF con nombre antiguo que se conservan en `sda1/`: los que tienen espacios (sus copias limpias son
  `sda1-guia-alumnado.pdf` y `sda1-guia-profesorado.pdf`).

## Menú (scripts/build-menu.mjs)

- Título de cada carpeta: `meta.json` (`title`, `description`, `current`, `hidden`) → si no, `meta.titulo` y
  `meta.subtitulo` de `sda<N>.json` → si no, el nombre de la carpeta embellecido. Si hay `meta.json` o
  `sda<N>.json`, se genera una portada `_pagina.html`.
- `"hidden": true` en un `meta.json` oculta esa carpeta del menú (se publica igual).
- Dentro de una SdA: `clase.html` primero, luego lo del alumnado, `sesiones/` y al final el grupo
  **Docente** (`guia-profesorado.html` y `moodle.html`).
- Etiquetas especiales de archivos: `EXACT_LABELS` en el script.

## Enlaces a Google Drive

- En las páginas del alumnado, los Google Docs/Hojas/Presentaciones se enlazan con `/preview` (ver) y
  `/copy` (copiar a su Drive), nunca con `/edit`. La web de clase lo hace sola: cualquier `enlace` de Docs
  en `sda<N>.json` se muestra como dos botones, **Ver anexo** y **Copiar a mi Drive**.
- Los documentos se comparten con el alumnado como **Lector**.

## Comprobar antes de abrir una PR

```bash
node scripts/build-site.mjs --out=/tmp/_site --base-url=https://florindotic.es/ --strict   # enlaces rotos
node scripts/revisar-pr.mjs --base=origin/main                                            # estructura de las SdA
```

En cada PR, la Action publica un comentario con las páginas cambiadas (con su dirección) y la revisión de
las SdA, y la marca en rojo si falta algo. Solo se despliega desde `main`.

## Qué se publica

Solo `index.html`, `bienvenida.html`, `menu.json`, `css/`, `js/`, `assets/` y `content/`. `prompts/` y
`scripts/` no se publican; `private_content/` está en `.gitignore` (material privado solo en local).
