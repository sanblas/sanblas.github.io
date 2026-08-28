# SERPOAN GitHub Tracker

Redirector estático para GitHub Pages + registro de estadísticas en Google Sheets.

## Arquitectura

```text
Email / QR
   ↓
GitHub Pages
   ├─ resuelve destino desde config.js
   ├─ envía evento a Apps Script (best-effort)
   └─ location.replace()
          ↓
      web / WhatsApp
```

GitHub Pages no es un servidor dinámico: el redirect se realiza con JavaScript.

## Archivos

- `index.html`: página mínima.
- `config.js`: campañas, idiomas, acciones, URLs y textos WhatsApp.
- `tracker.js`: tracking + redirect.
- `Code.gs`: receptor para Google Apps Script.
- `.nojekyll`: publica los archivos tal cual.

## 1. Configurar Apps Script

En `Code.gs`, cambia:

```js
const SPREADSHEET_ID = 'PEGA_AQUI_EL_ID_DEL_GOOGLE_SHEET';
```

La hoja `EVENTOS` debe tener:

```text
FECHA_HORA
CAMPAÑA
IDIOMA
EVENTO
ACCION
SOURCE
VARIANT
ID
DESTINO_KEY
URL_FINAL
RESULTADO
DETALLE
```

Vuelve a implementar el Web App después de cambiar el código.

La URL incluida en `config.js` es:

```text
https://script.google.com/macros/s/AKfycbz3N01x7eP1km7SNnCwou0VAn26p82i8DQXoyOVweAVSTD4vuEGd4NnycdfGSgjF3wv/exec
```

## 2. Configurar destinos

Edita `config.js`.

WhatsApp ya incluye dos ejemplos ES/EN para `TOUR26`.

Para una landing:

```js
{
  camp: "TOUR26",
  lang: "ES",
  action: "info",
  type: "URL",
  url: "https://tu-destino.example/es"
}
```

## 3. Subir a GitHub

Crea un repositorio, por ejemplo:

```text
serpoan-tracker
```

Sube los archivos.

En GitHub:

```text
Settings → Pages
Build and deployment → Deploy from a branch
Branch → main
Folder → /(root)
Save
```

La URL quedará parecida a:

```text
https://TU-USUARIO.github.io/serpoan-tracker/
```

## 4. Ejemplos

Email a WhatsApp ES:

```text
https://TU-USUARIO.github.io/serpoan-tracker/?camp=TOUR26&lang=ES&action=whatsapp&source=EMAIL&id=A8K92P
```

Email a WhatsApp EN:

```text
https://TU-USUARIO.github.io/serpoan-tracker/?camp=TOUR26&lang=EN&action=whatsapp&source=EMAIL&id=A8K92P
```

Ascensor A:

```text
https://TU-USUARIO.github.io/serpoan-tracker/?camp=TOUR26&lang=ES&action=info&source=ASCENSOR_01&variant=A
```

Ascensor B:

```text
https://TU-USUARIO.github.io/serpoan-tracker/?camp=TOUR26&lang=ES&action=whatsapp&source=ASCENSOR_01&variant=B
```

## Importante sobre estadísticas

El registro desde GitHub Pages es "best effort":

- JavaScript debe estar habilitado.
- El navegador o una extensión de privacidad puede bloquear la petición al logger.
- No equivale a un registro de servidor garantizado.

Para campañas y QR normales debería ser útil como métrica operativa, pero no debe tratarse como evidencia infalible de una acción.
