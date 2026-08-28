const CACHE_SECONDS = 300;

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { "Allow": "GET" },
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({
        ok: true,
        service: "serpoan-tracker",
      });
    }

    const camp = clean(url.searchParams.get("camp")).toUpperCase();
    const lang = (clean(url.searchParams.get("lang")) || "ES").toUpperCase();
    const action = clean(url.searchParams.get("action")).toLowerCase();
    const source = clean(url.searchParams.get("source")).toUpperCase();
    const variant = clean(url.searchParams.get("variant")).toUpperCase();
    const id = clean(url.searchParams.get("id"));

    let event = clean(url.searchParams.get("event")).toLowerCase();
    if (!event) {
      event = source.startsWith("ASCENSOR") ? "qr" : "click";
    }

    if (!camp || !action) {
      return json(
        {
          ok: false,
          error: "Missing required parameters: camp and action",
        },
        400
      );
    }

    try {
      // El destino se resuelve desde Google Sheets mediante Apps Script.
      // El Worker lo cachea para que no haya que consultar Google en cada clic.
      const destination = await resolveDestination(
        env,
        ctx,
        camp,
        lang,
        action
      );

      // Registrar en Google en segundo plano: no bloquea el 302.
      ctx.waitUntil(
        logEvent(env, {
          camp,
          lang,
          event,
          action,
          source,
          variant,
          id,
          destinoKey: destination.destinoKey || "",
          urlFinal: destination.url,
        })
      );

      // Redirección HTTP real.
      return Response.redirect(destination.url, 302);

    } catch (error) {
      ctx.waitUntil(
        logEvent(env, {
          camp,
          lang,
          event,
          action,
          source,
          variant,
          id,
          destinoKey: "",
          urlFinal: "",
          resultado: "ERROR",
          detalle: error instanceof Error ? error.message : String(error),
        })
      );

      return json(
        {
          ok: false,
          error: "Destination unavailable",
        },
        502
      );
    }
  },
};

async function resolveDestination(env, ctx, camp, lang, action) {
  if (!env.GOOGLE_API_URL) {
    throw new Error("GOOGLE_API_URL is not configured");
  }

  const cacheUrl = new URL("https://serpoan-cache.invalid/resolve");
  cacheUrl.searchParams.set("camp", camp);
  cacheUrl.searchParams.set("lang", lang);
  cacheUrl.searchParams.set("action", action);

  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) {
    const data = await cached.json();
    if (!data.ok || !data.url) {
      throw new Error(data.error || "Invalid cached destination");
    }
    return data;
  }

  const apiUrl = new URL(env.GOOGLE_API_URL);
  apiUrl.searchParams.set("api", "resolve");
  apiUrl.searchParams.set("camp", camp);
  apiUrl.searchParams.set("lang", lang);
  apiUrl.searchParams.set("action", action);

  const response = await fetch(apiUrl.toString(), {
    method: "GET",
    redirect: "follow",
    headers: {
      "Accept": "application/json",
      "User-Agent": "SERPOAN-Tracker/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Google resolver returned HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.ok || !data.url) {
    throw new Error(data.error || "No active destination found");
  }

  const cacheResponse = new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
    },
  });

  ctx.waitUntil(cache.put(cacheKey, cacheResponse));

  return data;
}

async function logEvent(env, data) {
  if (!env.GOOGLE_API_URL) return;

  try {
    const response = await fetch(env.GOOGLE_API_URL, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "SERPOAN-Tracker/1.0",
      },
      body: JSON.stringify({
        api: "log",
        secret: env.TRACKER_SECRET || "",
        ...data,
      }),
    });

    if (!response.ok) {
      console.error("Google log HTTP error:", response.status);
    }
  } catch (error) {
    console.error("Google log failed:", error);
  }
}

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
