// Aircraft Tracker V8 - Cloudflare Worker proxy
// Robust live ADS-B proxy with detailed diagnostics and live-sample lookup.

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

async function fetchJson(url) {
  const r = await fetch(url, {
    headers: { "Accept": "application/json" },
    cf: { cacheTtl: 0, cacheEverything: false }
  });

  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}

  return {
    ok: r.ok,
    status: r.status,
    url,
    data,
    preview: text.slice(0, 240)
  };
}

function aircraftArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.ac)) return data.ac;
  if (Array.isArray(data.aircraft)) return data.aircraft;
  if (data.data && Array.isArray(data.data.ac)) return data.data.ac;
  return [];
}

function pickAircraft(list) {
  const good = (list || []).filter(a =>
    a && a.lat != null && a.lon != null && a.alt_baro !== "ground"
  );

  good.sort((a, b) => {
    const aSeen = Number(a.seen);
    const bSeen = Number(b.seen);
    if (Number.isFinite(aSeen) && Number.isFinite(bSeen) && aSeen !== bSeen) {
      return aSeen - bSeen;
    }
    return (Number(b.alt_baro) || 0) - (Number(a.alt_baro) || 0);
  });

  return good[0] || null;
}

const LOOKUPS = [
  {
    name: "ADSB.lol",
    sample: "https://api.adsb.lol/v2/point/33.6407/-84.4277/250",
    callsign: q => `https://api.adsb.lol/v2/callsign/${encodeURIComponent(q)}`,
    reg: q => `https://api.adsb.lol/v2/reg/${encodeURIComponent(q)}`
  },
  {
    name: "ADSB One",
    sample: "https://api.adsb.one/v2/point/33.6407/-84.4277/250",
    callsign: q => `https://api.adsb.one/v2/callsign/${encodeURIComponent(q)}`,
    reg: q => `https://api.adsb.one/v2/reg/${encodeURIComponent(q)}`
  },
  {
    name: "adsb.fi",
    sample: "https://opendata.adsb.fi/api/v3/lat/33.6407/lon/-84.4277/dist/250",
    callsign: q => `https://opendata.adsb.fi/api/v2/callsign/${encodeURIComponent(q)}`,
    reg: q => `https://opendata.adsb.fi/api/v2/registration/${encodeURIComponent(q)}`
  }
];

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "GET") return json({ error: "GET only" }, 405);

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, service: "Aircraft Tracker ADS-B Proxy V8" });
    }

    if (url.pathname === "/debug") {
      const results = [];
      for (const p of LOOKUPS) {
        try {
          const r = await fetchJson(p.sample);
          results.push({
            provider: p.name,
            status: r.status,
            ok: r.ok,
            count: aircraftArray(r.data).length,
            preview: r.ok ? undefined : r.preview
          });
        } catch (e) {
          results.push({ provider: p.name, ok: false, error: e?.message || "fetch failed" });
        }
      }
      return json({ ok: true, service: "Aircraft Tracker ADS-B Proxy V8", results });
    }

    if (url.pathname === "/sample") {
      const diagnostics = [];

      for (const p of LOOKUPS) {
        try {
          const r = await fetchJson(p.sample);
          const list = aircraftArray(r.data);
          const picked = pickAircraft(list);

          diagnostics.push({
            provider: p.name,
            status: r.status,
            count: list.length
          });

          if (r.ok && picked) {
            return json({
              ok: true,
              provider: p.name,
              fetched_at: new Date().toISOString(),
              aircraft: picked,
              diagnostics
            });
          }
        } catch (e) {
          diagnostics.push({
            provider: p.name,
            error: e?.message || "fetch failed"
          });
        }
      }

      return json({
        ok: false,
        message: "No live sample aircraft could be returned.",
        diagnostics
      });
    }

    if (url.pathname === "/track") {
      const q = (url.searchParams.get("q") || "").trim().toUpperCase();

      if (!q || q.length > 20 || !/^[A-Z0-9-]+$/.test(q)) {
        return json({ error: "Invalid aircraft query" }, 400);
      }

      const isReg = /^N[0-9A-Z]+$/.test(q);
      const diagnostics = [];

      for (const p of LOOKUPS) {
        try {
          const r = await fetchJson(isReg ? p.reg(q) : p.callsign(q));
          const list = aircraftArray(r.data);

          diagnostics.push({
            provider: p.name,
            status: r.status,
            count: list.length
          });

          if (r.ok && list.length) {
            return json({
              ok: true,
              provider: p.name,
              query: q,
              fetched_at: new Date().toISOString(),
              data: { ac: list },
              diagnostics
            });
          }
        } catch (e) {
          diagnostics.push({
            provider: p.name,
            error: e?.message || "fetch failed"
          });
        }
      }

      return json({
        ok: false,
        query: q,
        message: "Aircraft not currently found in the live feeds.",
        diagnostics
      });
    }

    return json({ error: "Use /health, /sample, /track?q=N12345, or /debug" }, 404);
  }
};
