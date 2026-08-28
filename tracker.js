(() => {
  "use strict";

  const cfg = window.SERPOAN_CONFIG || {};
  const params = new URLSearchParams(window.location.search);

  const camp = clean(params.get("camp")).toUpperCase();
  const lang = (clean(params.get("lang")) || "ES").toUpperCase();
  const action = clean(params.get("action")).toLowerCase();
  const source = clean(params.get("source")).toUpperCase();
  const variant = clean(params.get("variant")).toUpperCase();
  const id = clean(params.get("id")).slice(0, 100);

  let event = clean(params.get("event")).toLowerCase();
  if (!event) {
    event = source.startsWith("ASCENSOR") ? "qr" : "click";
  }

  if (!camp || !action) {
    showError("Enlace incompleto.");
    return;
  }

  const destination = findDestination(cfg.destinations || [], camp, lang, action);

  if (!destination) {
    logEvent({
      camp, lang, event, action, source, variant, id,
      result: "ERROR",
      detail: "Destino no configurado"
    });

    if (cfg.fallbackUrl) {
      window.location.replace(cfg.fallbackUrl);
    } else {
      showError("Destino no disponible.");
    }
    return;
  }

  const finalUrl = buildFinalUrl(destination);

  if (!finalUrl) {
    logEvent({
      camp, lang, event, action, source, variant, id,
      result: "ERROR",
      detail: "URL final inválida"
    });
    showError("Destino no disponible.");
    return;
  }

  // Registro best-effort. keepalive permite que la petición siga
  // enviándose aunque la página navegue al destino.
  logEvent({
    camp, lang, event, action, source, variant, id,
    destinationKey: `${camp}:${lang}:${action}`,
    finalUrl,
    result: "OK",
    detail: ""
  });

  // Redirect inmediato en el navegador.
  window.location.replace(finalUrl);


  function findDestination(list, camp, lang, action) {
    return list.find(item =>
      clean(item.camp).toUpperCase() === camp &&
      clean(item.lang).toUpperCase() === lang &&
      clean(item.action).toLowerCase() === action
    );
  }

  function buildFinalUrl(destination) {
    const type = clean(destination.type).toUpperCase();
    const base = clean(destination.url);

    if (!base) return "";

    if (type === "URL") {
      return base;
    }

    if (type === "WHATSAPP") {
      const text = String(destination.text || "");
      return addParam(base, "text", text);
    }

    return "";
  }

  function addParam(url, key, value) {
    try {
      const u = new URL(url);
      u.searchParams.set(key, value);
      return u.toString();
    } catch {
      return "";
    }
  }

  function logEvent(data) {
    const endpoint = clean(cfg.appsScriptUrl);
    if (!endpoint) return;

    const body = new URLSearchParams();
    body.set("api", "log");
    body.set("camp", data.camp || "");
    body.set("lang", data.lang || "");
    body.set("event", data.event || "");
    body.set("action", data.action || "");
    body.set("source", data.source || "");
    body.set("variant", data.variant || "");
    body.set("id", data.id || "");
    body.set("destinationKey", data.destinationKey || "");
    body.set("finalUrl", data.finalUrl || "");
    body.set("result", data.result || "OK");
    body.set("detail", data.detail || "");

    try {
      fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        keepalive: true,
        body
      }).catch(() => {});
    } catch (_) {}
  }

  function clean(value) {
    return value == null ? "" : String(value).trim();
  }

  function showError(message) {
    document.body.innerHTML = `
      <main style="
        font-family:Arial,sans-serif;
        max-width:520px;
        margin:60px auto;
        padding:20px;
        text-align:center
      ">
        <h1>Enlace no disponible</h1>
        <p>${escapeHtml(message)}</p>
      </main>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
