(() => {
  "use strict";


  const cfg =
    window.SERPOAN_CONFIG || {};


  const params =
    new URLSearchParams(
      window.location.search
    );


  const FALLBACK_DELAY =
    5000;


  const fallbackUrl =
    clean(
      cfg.fallbackUrl
    ) ||
    "https://www.barcelo.com/";


  /***************************************************
   * PARÁMETROS PERMITIDOS HACIA EL DESTINO
   *
   * Además de las UTM, estos parámetros pueden
   * propagarse expresamente al destino final.
   *
   * IMPORTANTE:
   * id y lang NO se propagan.
   ***************************************************/

  const FORWARD_PARAMS = [
    "entry.1583904262",
    "entry.6360222"
  ];


  /***************************************************
   * UTM
   ***************************************************/

  const utmCampaign =
    clean(
      params.get(
        "utm_campaign"
      )
    );


  const utmSource =
    clean(
      params.get(
        "utm_source"
      )
    );


  const utmMedium =
    clean(
      params.get(
        "utm_medium"
      )
    );


  const utmContent =
    clean(
      params.get(
        "utm_content"
      )
    );


  const utmTerm =
    clean(
      params.get(
        "utm_term"
      )
    );


  const lang =
    (
      clean(
        params.get(
          "lang"
        )
      ) ||
      "ES"
    ).toUpperCase();


  /*
   * ID interno.
   *
   * Se registra,
   * pero NUNCA se propaga.
   */

  const id =
    clean(
      params.get(
        "id"
      )
    ).slice(
      0,
      100
    );


  /***************************************************
   * VALIDACIÓN
   ***************************************************/

  if (
    !utmCampaign ||
    !utmTerm
  ) {

    logEvent({

      utmCampaign,
      utmSource,
      utmMedium,
      utmContent,
      utmTerm,
      lang,
      id,

      result:
        "ERROR",

      detail:
        "Faltan utm_campaign o utm_term"

    });


    startFallback();

    return;
  }


  /***************************************************
   * RESOLVER DESTINO
   ***************************************************/

  const destination =
    findDestination(

      cfg.destinations || [],

      utmCampaign,

      lang,

      utmTerm

    );


  if (!destination) {

    logEvent({

      utmCampaign,
      utmSource,
      utmMedium,
      utmContent,
      utmTerm,
      lang,
      id,

      result:
        "ERROR",

      detail:
        "Destino no configurado"

    });


    startFallback();

    return;
  }


  /***************************************************
   * URL FINAL
   ***************************************************/

  let finalUrl =
    buildFinalUrl(
      destination
    );


  if (!finalUrl) {

    logEvent({

      utmCampaign,
      utmSource,
      utmMedium,
      utmContent,
      utmTerm,
      lang,
      id,

      result:
        "ERROR",

      detail:
        "URL final inválida"

    });


    startFallback();

    return;
  }


  /***************************************************
   * PROPAGAR PARÁMETROS
   *
   * SOLO destinos de tipo URL.
   *
   * Se propagan:
   * - todos los utm_*
   * - parámetros expresamente autorizados
   *   en FORWARD_PARAMS
   *
   * NO se propagan:
   * - id
   * - lang
   * - ningún otro parámetro no autorizado
   ***************************************************/

  if (
    clean(
      destination.type
    ).toUpperCase() ===
      "URL"
  ) {

    finalUrl =
      preserveAllowedParameters(
        finalUrl
      );

  }


  /***************************************************
   * REGISTRAR
   ***************************************************/

  logEvent({

    utmCampaign,
    utmSource,
    utmMedium,
    utmContent,
    utmTerm,
    lang,
    id,

    destinationKey:
      destination.destinationKey ||
      [
        utmCampaign,
        lang,
        utmTerm
      ].join(":"),

    finalUrl,

    result:
      "OK",

    detail:
      ""

  });


  /***************************************************
   * REDIRECT
   ***************************************************/

  window.location.replace(
    finalUrl
  );



  /***************************************************
   * BUSCAR DESTINO
   ***************************************************/

  function findDestination(
    list,
    campaign,
    language,
    term
  ) {

    const campaignNorm =
      clean(
        campaign
      ).toUpperCase();


    const languageNorm =
      clean(
        language
      ).toUpperCase();


    const termNorm =
      clean(
        term
      ).toLowerCase();


    return list.find(
      item =>

        clean(
          item.utm_campaign
        ).toUpperCase() ===
          campaignNorm &&

        clean(
          item.lang
        ).toUpperCase() ===
          languageNorm &&

        clean(
          item.utm_term
        ).toLowerCase() ===
          termNorm

    );

  }



  /***************************************************
   * CONSTRUIR DESTINO
   ***************************************************/

  function buildFinalUrl(
    destination
  ) {

    const type =
      clean(
        destination.type
      ).toUpperCase();


    const base =
      clean(
        destination.url
      );


    if (!base) {

      return "";

    }


    /*
     * Web normal
     */

    if (
      type === "URL"
    ) {

      return validateUrl(
        base
      );

    }


    /*
     * WhatsApp
     */

    if (
      type === "WHATSAPP"
    ) {

      const text =
        String(
          destination.text || ""
        );


      return addParam(
        base,
        "text",
        text
      );

    }


    return "";

  }



  /***************************************************
   * PROPAGAR PARÁMETROS AUTORIZADOS
   ***************************************************/

  function preserveAllowedParameters(
    url
  ) {

    try {

      const destinationUrl =
        new URL(
          url
        );


      for (
        const [key, value]
        of params.entries()
      ) {

        const keyLower =
          key.toLowerCase();


        const isUtm =
          keyLower.startsWith(
            "utm_"
          );


        const isExplicitlyAllowed =
          FORWARD_PARAMS.includes(
            key
          );


        if (
          isUtm ||
          isExplicitlyAllowed
        ) {

          destinationUrl
            .searchParams
            .set(
              key,
              value
            );

        }

      }


      return destinationUrl
        .toString();


    } catch (_) {

      return url;

    }

  }



  /***************************************************
   * AÑADIR PARÁMETRO
   ***************************************************/

  function addParam(
    url,
    key,
    value
  ) {

    try {

      const u =
        new URL(
          url
        );


      u.searchParams.set(
        key,
        value
      );


      return u.toString();


    } catch (_) {

      return "";

    }

  }



  /***************************************************
   * VALIDAR URL
   ***************************************************/

  function validateUrl(
    url
  ) {

    try {

      const u =
        new URL(
          url
        );


      if (
        u.protocol !== "https:" &&
        u.protocol !== "http:"
      ) {

        return "";

      }


      return u.toString();


    } catch (_) {

      return "";

    }

  }



  /***************************************************
   * FALLBACK
   ***************************************************/

  function startFallback() {

    /*
     * No cambia la pantalla.
     *
     * El usuario sigue viendo:
     *
     * Redirigiendo...
     * Redirecting...
     */

    window.setTimeout(

      () => {

        window.location.replace(
          fallbackUrl
        );

      },

      FALLBACK_DELAY

    );

  }



  /***************************************************
   * LOG
   ***************************************************/

  function logEvent(
    data
  ) {

    const endpoint =
      clean(
        cfg.appsScriptUrl
      );


    if (!endpoint) {

      return;

    }


    const body =
      new URLSearchParams();


    body.set(
      "api",
      "log"
    );


    body.set(
      "utm_campaign",
      data.utmCampaign || ""
    );


    body.set(
      "utm_source",
      data.utmSource || ""
    );


    body.set(
      "utm_medium",
      data.utmMedium || ""
    );


    body.set(
      "utm_content",
      data.utmContent || ""
    );


    body.set(
      "utm_term",
      data.utmTerm || ""
    );


    body.set(
      "lang",
      data.lang || ""
    );


    body.set(
      "id",
      data.id || ""
    );


    body.set(
      "destinationKey",
      data.destinationKey || ""
    );


    body.set(
      "finalUrl",
      data.finalUrl || ""
    );


    body.set(
      "result",
      data.result || "OK"
    );


    body.set(
      "detail",
      data.detail || ""
    );


    try {

      fetch(
        endpoint,
        {
          method:
            "POST",

          mode:
            "no-cors",

          keepalive:
            true,

          body
        }
      ).catch(
        () => {}
      );


    } catch (_) {}

  }



  /***************************************************
   * LIMPIAR
   ***************************************************/

  function clean(
    value
  ) {

    return value == null
      ? ""
      : String(value).trim();

  }


})();
