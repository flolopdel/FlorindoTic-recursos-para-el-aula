# Blog de contenidos de clase

Menú generado automáticamente a partir de la estructura de carpetas dentro de `content/`.

## Estructura de carpetas

```
content/
  curso2026-2027/
    computacion-y-robotica/
      ud1/
        indice.html
        practica1.html
    programacion/
      ud1/
        ...
  curso2027-2028/
    ...
```

Cualquier archivo `.html` dentro de `content/` (a cualquier profundidad) aparece automáticamente en el menú. Los nombres de carpetas y archivos se "embellecen" automáticamente (guiones/guiones bajos → espacios, mayúscula inicial). Puedes usar los nombres de carpeta que quieras: `curso2026-2027`, `1-eso-b`, `unidad3-bbdd`, etc.

## Páginas de portada (asignatura, curso, etc.)

Cualquier carpeta puede tener un `meta.json` opcional:

```json
{
  "title": "Computación y Robótica",
  "description": "Contenidos, prácticas y rúbricas de la asignatura de Computación y Robótica.",
  "current": false
}
```

Si existe, el build genera automáticamente una página de portada (`_pagina.html`) dentro de esa carpeta, con el título, la descripción y un listado de lo que contiene (subcarpetas con su propia portada y archivos `.html` sueltos). En el menú lateral, el nombre de esa carpeta pasa a ser un enlace directo a su portada.

En las carpetas de cursos, establece `"current": true` en el `meta.json` del curso activo para que el menú lo mantenga desplegado al cargar.

Las carpetas sin `meta.json` siguen funcionando igual que antes: solo se pliegan/despliegan en el menú, sin página propia.

`_pagina.html` y `menu.json` se regeneran en cada build (están en `.gitignore`) — no los edites a mano.

## Buscador

El campo de búsqueda sobre el menú filtra en tiempo real por nombre de carpeta/archivo y por la descripción del `meta.json`, ignorando mayúsculas y tildes. Al buscar, las carpetas con coincidencias se despliegan automáticamente.

## Cómo añadir contenido nuevo

1. Crea la carpeta/archivo que necesites dentro de `content/`, por ejemplo:
   `content/curso2026-2027/programacion/unidad2/rubrica-practica2.html`
2. `git add`, `git commit`, `git push` a la rama `main`.
3. La GitHub Action regenera `menu.json` y despliega automáticamente. El menú se actualiza solo, no hay que tocar nada más.

## Puesta en marcha (primera vez)

1. Crea un repositorio en GitHub y sube todo el contenido de esta carpeta.
2. En **Settings → Pages**, en "Build and deployment" selecciona **Source: GitHub Actions** (no "Deploy from a branch").
3. Haz un push a `main`. En unos segundos tendrás la web publicada en `https://tu-usuario.github.io/tu-repo/`.

## Generar los HTML de contenido

Para las páginas de explicaciones, prácticas con rúbricas o pizarras digitales, puedes:

- Pedírselas a Claude (aquí en el chat o con Claude Code sobre tu repo clonado) y guardarlas en la ruta correcta dentro de `content/`.
- Editarlas a mano si lo prefieres — son HTML estático normal, sin build ni dependencias.

No hace falta ningún framework: el único paso de "build" es la regeneración de `menu.json`, y lo hace la Action por ti.

## Desarrollo en local

```bash
node scripts/build-menu.mjs   # regenera menu.json
python3 -m http.server 8000   # o cualquier servidor estático
```

Abre `http://localhost:8000`.
