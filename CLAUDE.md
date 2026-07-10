# Duo Style — sitio web de joyería

Contexto para cualquier sesión de Claude Code que trabaje en este repo, sin
importar desde qué computador se abra. El dueño del negocio no programa —
pide los cambios en español, por voz-a-texto casi siempre, y espera que
Claude ejecute directamente en vez de darle pasos técnicos a él (salvo
credenciales sensibles, ver más abajo).

## Qué es esto

Sitio de la joyería Duo Style: catálogo de anillos, manillas, aretes, dijes,
charms, collares, cadenas y juegos. Los clientes compran contactando por
WhatsApp (no hay checkout ni pagos en el sitio todavía). Reescrito por
completo en 2026 (antes era HTML plano copiado a mano por producto).

- **Repo**: `github.com/DuoStyle-Joyeria/Joyeria-DuoStyle-Home` (**público**).
- **Hosting**: Vercel, proyecto `joyeria-duo-style-home`, auto-deploy al hacer
  push a `main`. Sin `vercel.json` — Vercel detecta Astro automáticamente.
- **Stack**: Astro 5 (`output: 'static'`), sin framework de UI (islas con
  vanilla JS/TS). Cero build tools antes de esta reescritura.

## Catálogo: de dónde vienen los datos

El catálogo **no vive en archivos locales** — vive en **Firestore**, en un
proyecto Firebase dedicado: **`duostyle-catalogo`** (distinto del proyecto
`duostyle01-611b9` que usa `finanzas/`, ver abajo). Astro lo lee en build
time con un loader propio (`src/loaders/productos-firestore.ts`, Content
Layer API) usando `firebase-admin` y una service account.

**Esquema de un producto** (collection `productos`, doc id = `${tipo}-${slug}`):
```
nombre, slug,
tipo: 'anillos'|'manillas'|'aretes'|'dijes'|'charms'|'collares'|'cadenas'|'juegos',
genero: 'dama'|'caballero',
subtitulo?, precio, precioAnterior?, descripcion,
imagenes: string[],  // URLs (Firebase Storage o /img/... estático)
disponible: boolean,
secciones: string[],  // 'nuevo' | 'destacado' | 'promocion'
orden: number  // usado para el orden de despliegue, ver "Revolver catálogo"
```
`tipo` y `genero` son **independientes**: tipo = qué es la pieza, género =
para quién es. No mezclar esto con "categoria", que ya no existe (se
reemplazó por estos dos campos — si ves `categoria` en código viejo o
memoria antigua, está desactualizado).

**Orden de despliegue (`orden`)**: todas las páginas que listan productos
(home, `/{genero}/`, `/{genero}/{tipo}/`) ordenan por este campo numérico
(con `nombre` como desempate si dos productos empatan, ej. ambos en 0 antes
de revolver nunca). No es fecha de creación ni alfabético — es el valor que
deja el botón "🔀 Revolver catálogo" del panel admin. Un producto nuevo
recibe un `orden` aleatorio al crearse (no se queda pegado al final); al
editar un producto existente se preserva su `orden` actual (editar precio o
foto no debe reordenar el catálogo).

## Rutas

- `/` — home: hero, botones de género (Dama/Caballero, solo si tienen
  productos), carrusel general "Destacados" (máx. 10, cualquier tipo/género),
  carrusel "Nuevos".
- `/{genero}/` (ej. `/dama/`) — botones de tipo scoped a ese género, carrusel
  de destacados de ese género, grilla paginada completa (9/página).
- `/{genero}/{tipo}/` (ej. `/dama/anillos/`) — igual pero también filtrado
  por tipo. **Nunca mezcla anillos de dama con los de caballero.**
- `/{tipo}/{slug}/` (ej. `/anillos/anillo-pave-pandora/`) — detalle de
  producto. Nota: esta URL NO incluye el género (un producto solo tiene un
  género, no hace falta en la URL).
- `/admin/` — panel de administración (ver abajo). `noindex`, no linkeado en
  el nav público.
- `/tarjeta/` — mini landing tipo "linktree" con redes sociales.
- `/finanzas/` (sirve desde `public/finanzas/index.html`, HTML plano, no
  Astro) — dashboard interno de ventas/gastos, ver sección aparte.

## Panel de administración (`/admin/`)

Login con Firebase Auth (email/password, **sin registro público** — el único
usuario se crea a mano en Firebase Console). Permite crear/editar/eliminar
productos: sube fotos (se comprimen en el navegador con Canvas API antes de
subirlas a Firebase Storage), guarda el documento en Firestore, y dispara un
**Vercel Deploy Hook** para reconstruir el sitio estático (1-2 min).

**Botón "🔀 Revolver catálogo"**: le asigna un `orden` aleatorio (`Math.random()`)
a todos los productos con un `writeBatch` de Firestore, y dispara el mismo
Deploy Hook. Como cada listado del sitio filtra primero por tipo/género/sección
y recién después ordena por `orden`, un solo campo compartido logra que cada
sección se revuelva dentro de sí misma (los anillos nunca se mezclan con las
manillas) y que los carruseles generales del home también cambien, todo con
una sola acción — no hay modos separados ni un segundo botón.

Reglas de seguridad (`firestore.rules`, `storage.rules` en la raíz del repo,
también hay que pegarlas manualmente en la consola de Firebase — el repo
las tiene pero Firebase no las lee de ahí automáticamente salvo que se corra
`firebase deploy`): solo el UID del dueño puede leer/escribir la collection
`productos`. El build del sitio lee vía Admin SDK, que ignora estas reglas.

## Variables de entorno (Vercel → Settings → Environment Variables)

- `FIREBASE_SERVICE_ACCOUNT_KEY` — JSON completo de la service account del
  proyecto `duostyle-catalogo`. **Sensitive**, solo Production + Preview.
  **Crítico**: sin esto el build de Vercel falla por completo (aunque el
  sitio sigue sirviendo el último deploy exitoso, no se cae).
- `PUBLIC_VERCEL_DEPLOY_HOOK_URL` — URL del Deploy Hook `panel-admin` (branch
  `main`). No sensible, se usa desde el navegador en `/admin/`.

Para builds/pruebas locales: usar `GOOGLE_APPLICATION_CREDENTIALS="ruta/al/archivo.json"`
apuntando al `.json` de la service account descargado (nunca commitear ese
archivo — patrones `*service-account*.json` y `*firebase-adminsdk*.json` ya
están en `.gitignore`).

## finanzas/ (dashboard interno, no confundir con el catálogo)

Vive en `public/finanzas/index.html` (HTML plano con Tailwind CDN + Firebase,
NO es una página Astro). Usa el proyecto Firebase **`duostyle01-611b9`**
(el original, distinto de `duostyle-catalogo`). Fue movido ahí (antes estaba
en la raíz del repo) porque este repo es público — quedó con `noindex` +
`Disallow: /finanzas/` en `robots.txt`, y reglas de Firestore/Storage
restringidas al email `administrador01@gmail.com` y al UID del dueño. No
tocar esto al trabajar en el catálogo — son proyectos Firebase separados.

## Config centralizada

- `src/data/site-config.ts` — número de WhatsApp, redes sociales, nombre de
  marca, listas `TIPOS` y `GENEROS`. **Siempre editar aquí**, nunca
  hardcodear el número de WhatsApp en una página — ya pasó una vez
  (9 archivos con el número pegado) y fue un dolor de cabeza migrar.
- `src/data/firebase-config.ts` — config pública del cliente Firebase
  (apiKey, projectId, etc. del proyecto `duostyle-catalogo`). No es secreta.

## Gotchas ya encontrados (para no repetir errores)

- **Precio en el panel**: el campo espera el número completo (`180000`), no
  abreviado (`180`). Ya pasó que se guardó mal y se vio "$180" en vez de
  "$180.000".
- **Fotos de producto**: deben ser fotos reales de lo que se vende. Está
  descartado usar fotos de internet/de otras marcas para representar
  productos que el dueño no tiene físicamente — es una decisión de negocio
  explícita, no solo técnica (riesgo de reclamos si el cliente recibe algo
  distinto a la foto).
- **`<style>` scoped de Astro no aplica a HTML inyectado por JS en runtime**
  (ej. listas generadas con `innerHTML`). Si una página tiene contenido
  dinámico que no se ve estilado, probablemente falte `<style is:global>`.
- **Migraciones de datos son irreversibles si hay colisión de IDs**: al
  migrar de `categoria` a `tipo`+`genero` se perdieron temporalmente 4
  variantes de anillos por colisión de doc IDs (mismo nombre, precio/fotos
  distintos) — se recuperaron del historial de git porque los JSON
  originales todavía estaban en un commit viejo. Si se vuelve a
  reestructurar el esquema de Firestore, verificar colisiones de ID antes
  de sobrescribir, no después.
- El repo usa credenciales de GitHub de la cuenta `brandonrocha77`
  (`brandaniels24@gmail.com`) para push — si `git push` falla con 403,
  revisar que esa cuenta siga como colaboradora del repo (org
  `DuoStyle-Joyeria`), no asumir que es un problema de credenciales locales.

## Scripts de un solo uso (`scripts/`)

Ya se corrieron, no hace falta repetirlos salvo necesidad puntual:
- `migrate-catalogo.mjs` — extrajo los productos originales del HTML viejo
  (`legacy/`, ya no existe) a JSON, con deduplicación.
- `migrar-productos-a-firestore.mjs` — subió esos JSON a Firestore
  (proyecto viejo `duostyle01-611b9`, antes de migrar a `duostyle-catalogo`).
- `migrar-tipo-genero.mjs` — migración de `categoria` a `tipo`+`genero`
  (proyecto `duostyle-catalogo`).

## Estado actual / pendiente

- **Caballero** (joyería de hombre) está vacío — el esquema y las rutas ya
  están listas, solo falta que el dueño cargue productos desde `/admin/`.
- **Carrito de compras**: existen `CarritoFloat.astro`, `CarritoDrawer.astro`
  y `src/scripts/carrito.ts`, integrados en `ProductoCard` y en la página de
  producto. Es trabajo reciente — verificar su estado/comportamiento antes
  de asumir que está completo, no fue construido ni verificado a fondo en
  la sesión que escribió el resto de este documento.
- **Checkout real / integración con Laura (bot de WhatsApp con IA)**: no
  implementado. La decisión original fue carrito → mensaje de WhatsApp
  estructurado → Laura, evaluado después de tener el rediseño estable.
- No hay tests automatizados. La verificación ha sido manual: build local
  contra Firestore real + capturas con Playwright antes de cada deploy.
