/*******************************************************
 * SERPOAN TRACKER - GOOGLE APPS SCRIPT
 *
 * FUNCIONES:
 *
 * GET  ?api=config
 *      -> GitHub descarga la configuración publicada
 *
 * GET  ?api=health
 *      -> prueba rápida del servicio
 *
 * POST api=log
 *      -> GitHub Pages registra eventos en EVENTOS
 *******************************************************/


/*******************************************************
 * CONFIGURACIÓN
 *******************************************************/

const CONFIG = {

  SPREADSHEET_ID:
    '1jNT9M8qOJE3Qtoa_XslHcYK7_DQm1W1sma5U-qbrjhc',

  HOJAS: {
    EVENTOS: 'EVENTOS',
    DESTINOS: 'DESTINOS',
    PLANTILLAS: 'PLANTILLAS',
    CAMPANAS: 'CAMPAÑAS'
  },

  VERSION: '2.0.0'
};


/*******************************************************
 * GET
 *******************************************************/

function doGet(e) {

  try {

    const api = limpiar_(
      e && e.parameter
        ? e.parameter.api
        : ''
    ).toLowerCase();


    if (api === 'config') {

      return obtenerConfiguracion_();

    }


    if (
      api === 'health' ||
      api === ''
    ) {

      return json_({

        ok: true,

        service:
          'SERPOAN Tracker',

        version:
          CONFIG.VERSION,

        timestamp:
          new Date().toISOString()

      });

    }


    return json_({
      ok: false,
      error: 'API no reconocida'
    });


  } catch (error) {

    return json_({
      ok: false,
      error: error.message
    });

  }
}


/*******************************************************
 * POST
 *******************************************************/

function doPost(e) {

  try {

    const p =
      e && e.parameter
        ? e.parameter
        : {};


    if (
      limpiar_(p.api)
        .toLowerCase() !== 'log'
    ) {

      return json_({
        ok: false,
        error: 'API no reconocida'
      });

    }


    const datos = {

      utmCampaign:
        limitar_(
          p.utm_campaign,
          100
        ),

      utmSource:
        limitar_(
          p.utm_source,
          150
        ),

      utmMedium:
        limitar_(
          p.utm_medium,
          100
        ),

      utmContent:
        limitar_(
          p.utm_content,
          200
        ),

      utmTerm:
        limitar_(
          p.utm_term,
          150
        ),

      lang:
        limitar_(
          p.lang,
          10
        ).toUpperCase(),

      id:
        limitar_(
          p.id,
          100
        ),

      destinoKey:
        limitar_(
          p.destinationKey,
          150
        ),

      urlFinal:
        limitar_(
          p.finalUrl,
          2000
        ),

      resultado:
        limitar_(
          p.result,
          20
        ) || 'OK',

      detalle:
        limitar_(
          p.detail,
          500
        )

    };


    if (!datos.utmCampaign) {

      return json_({
        ok: false,
        error: 'Falta utm_campaign'
      });

    }


    if (!datos.utmTerm) {

      return json_({
        ok: false,
        error: 'Falta utm_term'
      });

    }


    const ss =
      abrirSpreadsheet_();


    registrarEvento_(
      ss,
      datos
    );


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


/*******************************************************
 * CONFIG PARA GITHUB
 *******************************************************/

function obtenerConfiguracion_() {

  const ss =
    abrirSpreadsheet_();


  const campanas =
    leerTabla_(
      ss,
      CONFIG.HOJAS.CAMPANAS
    );


  const destinos =
    leerTabla_(
      ss,
      CONFIG.HOJAS.DESTINOS
    );


  const plantillas =
    leerTabla_(
      ss,
      CONFIG.HOJAS.PLANTILLAS
    );


  /***************************************************
   * CAMPAÑAS ACTIVAS
   ***************************************************/

  const campanasActivas =
    new Set();


  campanas.forEach(fila => {

    if (
      !esActivo_(
        fila.ACTIVA
      )
    ) {
      return;
    }


    const codigo =
      normalizar_(
        fila.UTM_CAMPAIGN
      );


    if (codigo) {

      campanasActivas.add(
        codigo
      );

    }

  });


  /***************************************************
   * PLANTILLAS
   ***************************************************/

  const mapaPlantillas = {};


  plantillas.forEach(fila => {

    if (
      !esActivo_(
        fila.ACTIVO
      )
    ) {
      return;
    }


    const key =
      normalizar_(
        fila.PLANTILLA_KEY
      );


    const lang =
      normalizar_(
        fila.LANG
      );


    if (
      !key ||
      !lang
    ) {
      return;
    }


    mapaPlantillas[
      key + '|' + lang
    ] =
      limpiar_(
        fila.TEXTO
      );

  });


  /***************************************************
   * DESTINOS
   ***************************************************/

  const publicados = [];

  const warnings = [];

  const rutasVistas =
    new Set();


  destinos.forEach(fila => {

    if (
      !esActivo_(
        fila.ACTIVO
      )
    ) {
      return;
    }


    const campaign =
      normalizar_(
        fila.UTM_CAMPAIGN
      );


    const lang =
      normalizar_(
        fila.LANG
      );


    const term =
      limpiar_(
        fila.UTM_TERM
      ).toLowerCase();


    const tipo =
      normalizar_(
        fila.TIPO
      );


    const urlBase =
      limpiar_(
        fila.URL_BASE
      );


    const destinoKey =
      limpiar_(
        fila.DESTINO_KEY
      );


    /*
     * Solo publicar campañas activas.
     */

    if (
      !campanasActivas
        .has(campaign)
    ) {
      return;
    }


    /*
     * Campos obligatorios.
     */

    if (
      !campaign ||
      !lang ||
      !term ||
      !tipo ||
      !urlBase
    ) {

      warnings.push(
        'Destino incompleto: ' +
        (
          destinoKey ||
          '(sin DESTINO_KEY)'
        )
      );

      return;
    }


    /*
     * Evitar rutas duplicadas.
     */

    const routeKey =
      campaign +
      '|' +
      lang +
      '|' +
      term;


    if (
      rutasVistas.has(
        routeKey
      )
    ) {

      warnings.push(
        'Ruta duplicada: ' +
        routeKey
      );

      return;
    }


    rutasVistas.add(
      routeKey
    );


    /*************************************************
     * URL
     *************************************************/

    if (
      tipo === 'URL'
    ) {

      publicados.push({

        utm_campaign:
          campaign,

        lang:
          lang,

        utm_term:
          term,

        type:
          'URL',

        url:
          urlBase,

        destinationKey:
          destinoKey

      });


      return;

    }


    /*************************************************
     * WHATSAPP
     *************************************************/

    if (
      tipo === 'WHATSAPP'
    ) {

      const plantillaKey =
        normalizar_(
          fila.PLANTILLA_KEY
        );


      if (!plantillaKey) {

        warnings.push(
          'WhatsApp sin PLANTILLA_KEY: ' +
          destinoKey
        );

        return;
      }


      const texto =
        mapaPlantillas[
          plantillaKey +
          '|' +
          lang
        ];


      if (!texto) {

        warnings.push(
          'Plantilla no encontrada: ' +
          plantillaKey +
          ' / ' +
          lang
        );

        return;
      }


      publicados.push({

        utm_campaign:
          campaign,

        lang:
          lang,

        utm_term:
          term,

        type:
          'WHATSAPP',

        url:
          urlBase,

        text:
          texto,

        destinationKey:
          destinoKey

      });


      return;

    }


    warnings.push(
      'TIPO desconocido: ' +
      tipo +
      ' (' +
      destinoKey +
      ')'
    );

  });


  return json_({

    ok: true,

    version:
      CONFIG.VERSION,

    generatedAt:
      new Date().toISOString(),

    destinations:
      publicados,

    warnings:
      warnings

  });

}


/*******************************************************
 * EVENTOS
 *******************************************************/

function registrarEvento_(
  ss,
  datos
) {

  const sheet =
    ss.getSheetByName(
      CONFIG.HOJAS.EVENTOS
    );


  if (!sheet) {

    throw new Error(
      'No existe la hoja EVENTOS'
    );

  }


  const fila = [

    new Date(),

    seguroCelda_(
      datos.utmCampaign
    ),

    seguroCelda_(
      datos.utmSource
    ),

    seguroCelda_(
      datos.utmMedium
    ),

    seguroCelda_(
      datos.utmContent
    ),

    seguroCelda_(
      datos.utmTerm
    ),

    seguroCelda_(
      datos.lang
    ),

    seguroCelda_(
      datos.id
    ),

    seguroCelda_(
      datos.destinoKey
    ),

    seguroCelda_(
      datos.urlFinal
    ),

    seguroCelda_(
      datos.resultado
    ),

    seguroCelda_(
      datos.detalle
    )

  ];


  const lock =
    LockService
      .getScriptLock();


  try {

    lock.waitLock(
      5000
    );

    sheet.appendRow(
      fila
    );

  } finally {

    try {
      lock.releaseLock();
    } catch (_) {}

  }

}


/*******************************************************
 * LEER TABLAS
 *******************************************************/

function leerTabla_(
  ss,
  nombreHoja
) {

  const sheet =
    ss.getSheetByName(
      nombreHoja
    );


  if (!sheet) {

    throw new Error(
      'No existe la hoja ' +
      nombreHoja
    );

  }


  const datos =
    sheet
      .getDataRange()
      .getDisplayValues();


  if (
    datos.length < 2
  ) {

    return [];

  }


  const cabeceras =
    datos[0].map(
      c => limpiar_(c)
    );


  const resultado = [];


  for (
    let i = 1;
    i < datos.length;
    i++
  ) {

    const fila =
      datos[i];


    if (
      fila.every(
        valor =>
          limpiar_(valor) === ''
      )
    ) {

      continue;

    }


    const objeto = {};


    cabeceras.forEach(
      (cabecera, indice) => {

        objeto[cabecera] =
          fila[indice];

      }
    );


    resultado.push(
      objeto
    );

  }


  return resultado;

}


/*******************************************************
 * SPREADSHEET
 *******************************************************/

function abrirSpreadsheet_() {

  if (
    !CONFIG.SPREADSHEET_ID ||
    CONFIG.SPREADSHEET_ID
      .indexOf(
        'PEGA_AQUI'
      ) !== -1
  ) {

    throw new Error(
      'Debes configurar SPREADSHEET_ID'
    );

  }


  return SpreadsheetApp.openById(
    CONFIG.SPREADSHEET_ID
  );

}


/*******************************************************
 * UTILIDADES
 *******************************************************/

function limpiar_(valor) {

  return valor == null
    ? ''
    : String(valor).trim();

}


function limitar_(
  valor,
  longitud
) {

  return limpiar_(valor)
    .slice(
      0,
      longitud
    );

}


function normalizar_(valor) {

  return limpiar_(valor)
    .toUpperCase();

}


function esActivo_(valor) {

  return [
    'SI',
    'SÍ',
    'YES',
    'TRUE',
    '1',
    'ACTIVO'
  ].includes(
    normalizar_(valor)
  );

}


function seguroCelda_(valor) {

  const texto =
    limpiar_(valor);


  if (!texto) {

    return '';

  }


  if (
    texto.startsWith('=') ||
    texto.startsWith('+') ||
    texto.startsWith('-') ||
    texto.startsWith('@')
  ) {

    return "'" + texto;

  }


  return texto;

}


function json_(objeto) {

  return ContentService
    .createTextOutput(
      JSON.stringify(
        objeto
      )
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}
