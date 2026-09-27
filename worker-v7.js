// Aircraft Tracker V7 - Cloudflare Worker proxy
// Proxies live ADS-B data and can return a currently visible test aircraft.

const PROVIDERS = [
  {
    name: "ADSB.lol",
    callsign: q => `https://api.adsb.lol/v2/callsign/${encodeURIComponent(q)}`,
    reg: q => `https://api.adsb.lol/v2/reg/${encodeURIComponent(q)}`,
    point: (lat, lon, radius) => `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${radius}`
  },
  {
    name: "ADSB One",
    callsign: q => `https://api.adsb.one/v2/callsign/${encodeURIComponent(q)}`,
    reg: q => `https://api.adsb.one/v2/reg/${encodeURIComponent(q)}`,
    point: (lat, lon, radius) => `https://api.adsb.one/v2/point/${lat}/${lon}/${radius}`
  },
  {
    name: "adsb.fi",
    callsign: q => `https://opendata.adsb.fi/api/v2/callsign/${encodeURIComponent(q)}`,
    reg: q => `https://opendata.adsb.fi/api/v2/registration/${encodeURIComponent(q)}`,
    point: (lat, lon, radius) => `https://opendata.adsb.fi/api/v3/lat/${lat}/lon/${lon}/dist/${radius}`
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

async function getProviderData(url) {
  const r = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "AircraftTrackerV7/1.0"
    },
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

function pickUsefulAircraft(ac) {
  const candidates = (ac || []).filter(a =>
    a && a.lat != null && a.lon != null &&
    (a.flight || a.r || a.reg) &&
    a.alt_baro !== "ground"
  );
  candidates.sort((a,b) => {
    const aa = Number(a.alt_baro) || 0;
    const bb = Number(b.alt_baro) || 0;
    return bb - aa;
  });
  return candidates[0] || null;
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "GET") return json({ error: "GET only" }, 405);

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, service: "Aircraft Tracker ADS-B Proxy V6" });
    }

    // Find a live aircraft around a busy hub. Default: Atlanta, 150 NM.
    if (url.pathname === "/sample") {
      const lat = Number(url.searchParams.get("lat") || "33.6407");
      const lon = Number(url.searchParams.get("lon") || "-84.4277");
      const radius = Math.min(250, Math.max(25, Number(url.searchParams.get("radius") || "150")));
      const errors = [];

      for (const p of PROVIDERS) {
        try {
          const data = await getProviderData(p.point(lat, lon, radius));
          const a = pickUsefulAircraft(data?.ac);
          if (a) {
            return json({
              ok: true,
              provider: p.name,
              fetched_at: new Date().toISOString(),
              aircraft: a
            });
          }
          errors.push(`${p.name}: no airborne aircraft returned`);
        } catch (e) {
          errors.push(`${p.name}: ${e?.message || "fetch failed"}`);
        }
      }

      return json({
        ok: false,
        message: "No live sample aircraft could be returned.",
        errors
      });
    }

    if (url.pathname !== "/track") {
      return json({ error: "Use /track?q=N12345 or /sample" }, 404);
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
        const data = await getProviderData(upstream);
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
    });
  }
};
