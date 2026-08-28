/*************************************************
 * SERPOAN TRACKER - Google Apps Script API
 *
 * Hojas requeridas:
 * EVENTOS
 * DESTINOS
 * PLANTILLAS
 * CAMPAÑAS
 *************************************************/

const CONFIG = {
  // Pega aquí el ID del Google Sheet.
  SPREADSHEET_ID: 'PEGA_AQUI_EL_ID_DEL_GOOGLE_SHEET',

  HOJAS: {
    EVENTOS: 'EVENTOS',
    DESTINOS: 'DESTINOS',
    PLANTILLAS: 'PLANTILLAS',
    CAMPANAS: 'CAMPAÑAS'
  }
};


/*************************************************
 * API GET: RESOLVER DESTINO
 *
 * Ejemplo:
 * /exec?api=resolve&camp=TOUR26&lang=ES&action=whatsapp
 *************************************************/

function doGet(e) {
  try {
    const api = limpiar_(e && e.parameter ? e.parameter.api : '').toLowerCase();

    if (api !== 'resolve') {
      return json_({
        ok: false,
        error: 'API no reconocida'
      });
    }

    const camp = limpiar_(e.parameter.camp).toUpperCase();
    const lang = (limpiar_(e.parameter.lang) || 'ES').toUpperCase();
    const action = limpiar_(e.parameter.action).toLowerCase();

    if (!camp || !action) {
      return json_({
        ok: false,
        error: 'Faltan camp o action'
      });
    }

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

    comprobarCampanaActiva_(ss, camp);

    const destino = buscarDestino_(ss, camp, lang, action);

    const urlFinal = construirUrlFinal_(ss, destino, lang);

    return json_({
      ok: true,
      url: urlFinal,
      destinoKey: limpiar_(destino.DESTINO_KEY)
    });

  } catch (error) {
    return json_({
      ok: false,
      error: error.message
    });
  }
}


/*************************************************
 * API POST: REGISTRAR EVENTO
 *************************************************/

function doPost(e) {
  try {
    const body = JSON.parse(
      e && e.postData && e.postData.contents
        ? e.postData.contents
        : '{}'
    );

    if (limpiar_(body.api).toLowerCase() !== 'log') {
      return json_({
        ok: false,
        error: 'API no reconocida'
      });
    }

    const secretEsperado =
      PropertiesService
        .getScriptProperties()
        .getProperty('TRACKER_SECRET') || '';

    if (!secretEsperado) {
      throw new Error(
        'TRACKER_SECRET no está configurado en Script Properties'
      );
    }

    if (limpiar_(body.secret) !== secretEsperado) {
      return json_({
        ok: false,
        error: 'Unauthorized'
      });
    }

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

    registrarEvento_(ss, {
      fechaHora: new Date(),
      campana: limpiar_(body.camp).toUpperCase(),
      idioma: limpiar_(body.lang).toUpperCase(),
      evento: limpiar_(body.event).toLowerCase(),
      accion: limpiar_(body.action).toLowerCase(),
      source: limpiar_(body.source).toUpperCase(),
      variant: limpiar_(body.variant).toUpperCase(),
      id: limpiar_(body.id),
      destinoKey: limpiar_(body.destinoKey),
      urlFinal: limpiar_(body.urlFinal),
      resultado: limpiar_(body.resultado) || 'OK',
      detalle: limpiar_(body.detalle)
    });

    return json_({
      ok: true
    });

  } catch (error) {
    return json_({
      ok: false,
      error: error.message
    });
  }
}


/*************************************************
 * CAMPAÑAS
 *************************************************/

function comprobarCampanaActiva_(ss, campana) {
  const filas = leerTabla_(ss, CONFIG.HOJAS.CAMPANAS);

  const encontrada = filas.find(fila =>
    normalizar_(fila.CAMPAÑA) === normalizar_(campana)
  );

  if (!encontrada) {
    throw new Error('Campaña no encontrada: ' + campana);
  }

  if (!esActivo_(encontrada.ACTIVA)) {
    throw new Error('Campaña no activa: ' + campana);
  }
}


/*************************************************
 * DESTINOS
 *************************************************/

function buscarDestino_(ss, campana, idioma, accion) {
  const filas = leerTabla_(ss, CONFIG.HOJAS.DESTINOS);

  const encontrada = filas.find(fila =>
    normalizar_(fila.CAMPAÑA) === normalizar_(campana) &&
    normalizar_(fila.IDIOMA) === normalizar_(idioma) &&
    normalizar_(fila.ACCION) === normalizar_(accion) &&
    esActivo_(fila.ACTIVO)
  );

  if (!encontrada) {
    throw new Error(
      'No existe destino activo para ' +
      campana + ' / ' + idioma + ' / ' + accion
    );
  }

  return encontrada;
}


/*************************************************
 * CONSTRUIR DESTINO
 *************************************************/

function construirUrlFinal_(ss, destino, idioma) {
  const tipo = normalizar_(destino.TIPO);
  const urlBase = limpiar_(destino.URL_BASE);

  if (!urlBase) {
    throw new Error('URL_BASE vacía');
  }

  if (tipo === 'URL') {
    return urlBase;
  }

  if (tipo === 'WHATSAPP') {
    const plantillaKey =
      limpiar_(destino.PLANTILLA_KEY) ||
      limpiar_(destino.DESTINO_KEY);

    if (!plantillaKey) {
      throw new Error(
        'El destino WhatsApp no tiene PLANTILLA_KEY'
      );
    }

    const texto = buscarPlantilla_(
      ss,
      plantillaKey,
      idioma
    );

    return agregarParametro_(
      urlBase,
      'text',
      texto
    );
  }

  throw new Error(
    'TIPO no reconocido: ' + tipo
  );
}


/*************************************************
 * PLANTILLAS
 *************************************************/

function buscarPlantilla_(ss, plantillaKey, idioma) {
  const filas = leerTabla_(ss, CONFIG.HOJAS.PLANTILLAS);

  const encontrada = filas.find(fila =>
    normalizar_(fila.PLANTILLA_KEY) === normalizar_(plantillaKey) &&
    normalizar_(fila.IDIOMA) === normalizar_(idioma) &&
    esActivo_(fila.ACTIVO)
  );

  if (!encontrada) {
    throw new Error(
      'Plantilla no encontrada: ' +
      plantillaKey + ' / ' + idioma
    );
  }

  return encontrada.TEXTO;
}


/*************************************************
 * EVENTOS
 *************************************************/

function registrarEvento_(ss, datos) {
  const sheet = ss.getSheetByName(CONFIG.HOJAS.EVENTOS);

  if (!sheet) {
    throw new Error('No existe la hoja EVENTOS');
  }

  sheet.appendRow([
    datos.fechaHora,
    datos.campana,
    datos.idioma,
    datos.evento,
    datos.accion,
    datos.source,
    datos.variant,
    datos.id,
    datos.destinoKey,
    datos.urlFinal,
    datos.resultado,
    datos.detalle
  ]);
}


/*************************************************
 * TABLAS
 *************************************************/

function leerTabla_(ss, nombreHoja) {
  const sheet = ss.getSheetByName(nombreHoja);

  if (!sheet) {
    throw new Error('No existe la hoja ' + nombreHoja);
  }

  const datos = sheet.getDataRange().getDisplayValues();

  if (datos.length < 2) {
    return [];
  }

  const cabeceras = datos[0].map(c => limpiar_(c));

  return datos.slice(1)
    .filter(fila => !fila.every(v => limpiar_(v) === ''))
    .map(fila => {
      const obj = {};
      cabeceras.forEach((cabecera, i) => {
        obj[cabecera] = fila[i];
      });
      return obj;
    });
}


/*************************************************
 * URL
 *************************************************/

function agregarParametro_(url, nombre, valor) {
  let base = url;
  let fragmento = '';

  const posicionHash = url.indexOf('#');

  if (posicionHash !== -1) {
    base = url.substring(0, posicionHash);
    fragmento = url.substring(posicionHash);
  }

  let separador;

  if (base.indexOf('?') === -1) {
    separador = '?';
  } else if (base.endsWith('?') || base.endsWith('&')) {
    separador = '';
  } else {
    separador = '&';
  }

  return (
    base +
    separador +
    encodeURIComponent(nombre) +
    '=' +
    encodeURIComponent(valor) +
    fragmento
  );
}


/*************************************************
 * UTILIDADES
 *************************************************/

function limpiar_(valor) {
  return valor == null
    ? ''
    : String(valor).trim();
}

function normalizar_(valor) {
  return limpiar_(valor).toUpperCase();
}

function esActivo_(valor) {
  return [
    'SI',
    'SÍ',
    'YES',
    'TRUE',
    '1',
    'ACTIVO'
  ].includes(normalizar_(valor));
}

function json_(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
