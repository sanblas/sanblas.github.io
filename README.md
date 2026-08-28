# SERPOAN Tracker

Redirector HTTP para emails y QR:

1. Cloudflare Worker recibe el clic.
2. Consulta/cachea el destino configurado en Google Sheets.
3. Devuelve un HTTP 302 real.
4. Registra el evento en Google Sheets en segundo plano.

## Parámetros

- `camp`: campaña, p.ej. `TOUR26`
- `lang`: `ES` / `EN`
- `action`: `info`, `whatsapp`, etc.
- `source`: `EMAIL`, `ASCENSOR_01`, ...
- `variant`: `A`, `B` (opcional)
- `id`: identificador opaco (opcional)
- `event`: si se omite, será `qr` para `ASCENSOR_*` y `click` para el resto

Ejemplo:

```text
https://TU-WORKER.workers.dev/?camp=TOUR26&lang=ES&action=whatsapp&source=EMAIL&id=A8K92P
```

## 1. Google Apps Script

Reemplaza el código del Web App por `appscript/Code.gs`.

Edita:

```js
SPREADSHEET_ID: 'PEGA_AQUI_EL_ID_DEL_GOOGLE_SHEET'
```

Crea una Script Property:

```text
TRACKER_SECRET = una-clave-larga-y-aleatoria
```

Vuelve a desplegar la aplicación web.

## 2. Cloudflare

El `wrangler.jsonc` ya contiene la URL del Apps Script facilitada para este proyecto.

No guardes `TRACKER_SECRET` en GitHub.

Configúralo como secreto en Cloudflare:

```bash
npx wrangler secret put TRACKER_SECRET
```

O desde el dashboard de Cloudflare, en las variables/secrets del Worker.

El valor debe ser exactamente el mismo que en Apps Script.

## 3. GitHub / Cloudflare

Sube este proyecto a GitHub.

En Cloudflare:

Workers & Pages -> Create application -> Import a repository

Selecciona el repositorio y despliega.

Cada push posterior a la rama de producción puede desplegar automáticamente.

## 4. Pruebas

Health:

```text
https://TU-WORKER.workers.dev/health
```

Debe devolver JSON con `ok: true`.

Resolver de Google:

```text
https://script.google.com/macros/s/AKfycbz3N01x7eP1km7SNnCwou0VAn26p82i8DQXoyOVweAVSTD4vuEGd4NnycdfGSgjF3wv/exec?api=resolve&camp=TOUR26&lang=ES&action=info
```

Debe devolver JSON con `ok: true` y una URL.

Tracker:

```text
https://TU-WORKER.workers.dev/?camp=TOUR26&lang=ES&action=info&source=ASCENSOR_01&variant=A
```

Debe:
- redirigir al destino;
- registrar una fila en `EVENTOS`.

## Caché

Los destinos se cachean 5 minutos (`CACHE_SECONDS = 300`).

Esto permite editar Google Sheets sin tener que desplegar el Worker, pero evita consultar Apps Script en cada clic.

Durante pruebas puedes bajar `CACHE_SECONDS` a `10`.
