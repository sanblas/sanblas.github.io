(() => {
  "use strict";

  const cfg = window.SERPOAN_CONFIG || {};
  const params = new URLSearchParams(window.location.search);

  const FALLBACK_DELAY = 5000;

  const fallbackUrl =
    clean(cfg.fallbackUrl) ||
    "https://www.barcelo.com/";

  /*
   * Parámetros internos del tracker
   */
  const camp =
    clean(params.get("camp"))
      .toUpperCase();

  const lang =
    (clean(params.get("lang")) || "ES")
      .toUpperCase();

  const action =
    clean(params.get("action"))
      .toLowerCase();

  const source =
    clean(params.get("source"))
      .toUpperCase();

  const variant =
    clean(params.get("variant"))
      .toUpperCase();

  const id =
    clean(params.get("id"))
      .slice(0, 100);

  let event =
    clean(params.get("event"))
      .toLowerCase();


  /*
   * Evento automático:
   *
   * ASCENSOR_* = qr
   * resto       = click
   */
  if (!event) {

    event =
      source.startsWith("ASCENSOR")
        ? "qr"
        : "click";

  }


  /*
   * Si el enlace está incompleto,
   * NO mostramos otra página.
   *
   * Dejamos la pantalla actual
   * Redirigiendo / Redirecting
   * y vamos al fallback.
   */
  if (!camp || !action) {

    logEvent({
      camp,
      lang,
      event,
      action,
      source,
      variant,
      id,
      result: "ERROR",
      detail: "Faltan camp o action"
    });

    startFallback();

    return;
  }


  /*
   * Buscar destino
   */
  const destination =
    findDestination(
      cfg.destinations || [],
      camp,
      lang,
      action
    );


  /*
   * Destino inexistente
   */
  if (!destination) {

    logEvent({
      camp,
      lang,
      event,
      action,
      source,
      variant,
      id,
      result: "ERROR",
      detail: "Destino no configurado"
    });

    startFallback();

    return;
  }


  /*
   * Construir URL final
   */
  let finalUrl =
    buildFinalUrl(destination);


  /*
   * URL incorrecta
   */
  if (!finalUrl) {

    logEvent({
      camp,
      lang,
      event,
      action,
      source,
      variant,
      id,
      result: "ERROR",
      detail: "URL final inválida"
    });

    startFallback();

    return;
  }


  /*
   * Añadir las UTM del enlace original
   * al destino final.
   *
   * Solo para destinos URL normales.
   *
   * No enviamos:
   * id
   * source
   * variant
   * camp
   * lang
   * action
   *
   * Solo parámetros que empiecen por utm_.
   */
  if (
    clean(destination.type)
      .toUpperCase() === "URL"
  ) {

    finalUrl =
      preserveUtmParameters(finalUrl);

  }


  /*
   * Registrar el evento.
   */
  logEvent({

    camp,
    lang,
    event,
    action,
    source,
    variant,
    id,

    destinationKey:
      destination.destinationKey ||
      `${camp}:${lang}:${action}`,

    finalUrl,

    result: "OK",

    detail: ""

  });


  /*
   * Redirect normal.
   */
  window.location.replace(finalUrl);



  /***************************************************
   * BUSCAR DESTINO
   ***************************************************/

  function findDestination(
    list,
    camp,
    lang,
    action
  ) {

    return list.find(item =>

      clean(item.camp)
        .toUpperCase() === camp &&

      clean(item.lang)
        .toUpperCase() === lang &&

      clean(item.action)
        .toLowerCase() === action

    );

  }



  /***************************************************
   * CONSTRUIR URL
   ***************************************************/

  function buildFinalUrl(destination) {

    const type =
      clean(destination.type)
        .toUpperCase();

    const base =
      clean(destination.url);


    if (!base) {
      return "";
    }


    /*
     * URL normal
     */
    if (type === "URL") {

      return validateUrl(base);

    }


    /*
     * WhatsApp
     */
    if (type === "WHATSAPP") {

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
   * CONSERVAR UTM
   ***************************************************/

  function preserveUtmParameters(url) {

    try {

      const destinationUrl =
        new URL(url);


      /*
       * Copiar solamente parámetros
       * cuyo nombre empiece por utm_.
       */
      for (
        const [key, value]
        of params.entries()
      ) {

        if (
          key
            .toLowerCase()
            .startsWith("utm_")
        ) {

          destinationUrl
            .searchParams
            .set(
              key,
              value
            );

        }

      }


      return destinationUrl.toString();


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
        new URL(url);

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

  function validateUrl(url) {

    try {

      const u =
        new URL(url);


      /*
       * Solo permitimos http / https
       */
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
   *
   * IMPORTANTE:
   *
   * No modificamos el HTML.
   *
   * La pantalla bonita sigue siendo
   * exactamente la misma.
   ***************************************************/

  function startFallback() {

    /*
     * index.html ya tiene:
     *
     * <meta
     *   http-equiv="refresh"
     *   content="5;url=https://www.barcelo.com/"
     * >
     *
     * Este timeout es una segunda
     * protección por JavaScript.
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
   * LOG EVENTO
   ***************************************************/

  function logEvent(data) {

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
      "camp",
      data.camp || ""
    );

    body.set(
      "lang",
      data.lang || ""
    );

    body.set(
      "event",
      data.event || ""
    );

    body.set(
      "action",
      data.action || ""
    );

    body.set(
      "source",
      data.source || ""
    );

    body.set(
      "variant",
      data.variant || ""
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
          method: "POST",
          mode: "no-cors",
          keepalive: true,
          body
        }
      ).catch(() => {});


    } catch (_) {}

  }



  /***************************************************
   * LIMPIAR
   ***************************************************/

  function clean(value) {

    return value == null
      ? ""
      : String(value).trim();

  }

})();
