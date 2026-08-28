/**
 * SERPOAN - receptor de estadísticas para GitHub Pages
 *
 * El redirector vive en GitHub Pages.
 * Apps Script SOLO registra los eventos en Google Sheets.
 */

const SPREADSHEET_ID = 'PEGA_AQUI_EL_ID_DEL_GOOGLE_SHEET';
const SHEET_NAME = 'EVENTOS';

function doGet() {
  return json_({
    ok: true,
    service: 'SERPOAN event logger'
  });
}

function doPost(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};

    if (limpiar_(p.api).toLowerCase() !== 'log') {
      return json_({ ok: false, error: 'API no reconocida' });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error('No existe la hoja EVENTOS');
    }

    // Límites para no escribir contenidos arbitrariamente largos.
    const camp = limitar_(p.camp, 60).toUpperCase();
    const lang = limitar_(p.lang, 10).toUpperCase();
    const evento = limitar_(p.event, 30).toLowerCase();
    const accion = limitar_(p.action, 60).toLowerCase();
    const source = limitar_(p.source, 80).toUpperCase();
    const variant = limitar_(p.variant, 20).toUpperCase();
    const id = limitar_(p.id, 100);
    const destinationKey = limitar_(p.destinationKey, 150);
    const finalUrl = limitar_(p.finalUrl, 2000);
    const result = limitar_(p.result, 20) || 'OK';
    const detail = limitar_(p.detail, 500);

    if (!camp || !accion) {
      return json_({
        ok: false,
        error: 'Faltan camp o action'
      });
    }

    sheet.appendRow([
      new Date(),
      camp,
      lang,
      evento,
      accion,
      source,
      variant,
      id,
      destinationKey,
      finalUrl,
      result,
      detail
    ]);

    return json_({ ok: true });

  } catch (error) {
    return json_({
      ok: false,
      error: error.message
    });
  }
}

function limitar_(valor, max) {
  return limpiar_(valor).slice(0, max);
}

function limpiar_(valor) {
  return valor == null ? '' : String(valor).trim();
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
