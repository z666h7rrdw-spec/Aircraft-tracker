// Aircraft Tracker V3 - Cloudflare Worker proxy
// Deploy this as a Cloudflare Worker. It proxies live ADS-B data to the GitHub Pages app.

const PROVIDERS = [
  {
    name: "ADSB.lol",
    callsign: q => `https://api.adsb.lol/v2/callsign/${encodeURIComponent(q)}`,
    reg: q => `https://api.adsb.lol/v2/reg/${encodeURIComponent(q)}`
  },
  {
    name: "ADSB One",
    callsign: q => `https://api.adsb.one/v2/callsign/${encodeURIComponent(q)}`,
    reg: q => `https://api.adsb.one/v2/reg/${encodeURIComponent(q)}`
  },
  {
    name: "adsb.fi",
    callsign: q => `https://opendata.adsb.fi/api/v2/callsign/${encodeURIComponent(q)}`,
    reg: q => `https://opendata.adsb.fi/api/v2/registration/${encodeURIComponent(q)}`
  }
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store"
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "GET") return json({ error: "GET only" }, 405);

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, service: "Aircraft Tracker ADS-B Proxy V3" });
    }

    if (url.pathname !== "/track") {
      return json({ error: "Use /track?q=AAL118 or /track?q=N826JS" }, 404);
    }

    const q = (url.searchParams.get("q") || "").trim().toUpperCase();
    if (!q || q.length > 20 || !/^[A-Z0-9-]+$/.test(q)) {
      return json({ error: "Invalid aircraft query" }, 400);
    }

    const isReg = /^N[0-9A-Z]+$/.test(q);
    const errors = [];

    for (const p of PROVIDERS) {
      const upstream = isReg ? p.reg(q) : p.callsign(q);
      try {
        const r = await fetch(upstream, {
          headers: {
            "Accept": "application/json",
            "User-Agent": "AircraftTrackerV3/1.0"
          },
          cf: { cacheTtl: 0, cacheEverything: false }
        });

        if (!r.ok) {
          errors.push(`${p.name}: HTTP ${r.status}`);
          continue;
        }

        const data = await r.json();
        if (data && Array.isArray(data.ac) && data.ac.length) {
          return json({
            ok: true,
            provider: p.name,
            query: q,
            fetched_at: new Date().toISOString(),
            data
          });
        }

        errors.push(`${p.name}: no live match`);
      } catch (e) {
        errors.push(`${p.name}: ${e?.message || "fetch failed"}`);
      }
    }

    return json({
      ok: false,
      query: q,
      message: "Aircraft not currently found in the live feeds.",
      errors
    }, 200);
  }
};
