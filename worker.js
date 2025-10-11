export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ✅ 요청 Origin 확인 (로컬 + Pages 모두 지원)
    const origin = request.headers.get("Origin") || "*";
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // ✅ OPTIONS(사전요청) 처리
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ✅ /api/save
    if (url.pathname === "/api/save" && request.method === "POST") {
      try {
        const { lat, lng, icon } = await request.json();

        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS emojis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lat REAL,
            lng REAL,
            icon TEXT,
            created_at TEXT
          )
        `).run();

        await env.DB.prepare(
          "INSERT INTO emojis (lat, lng, icon, created_at) VALUES (?, ?, ?, datetime('now'))"
        ).bind(lat, lng, icon).run();

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ✅ /api/load
    if (url.pathname === "/api/load") {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM emojis").all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ✅ 기본 Not Found 응답
    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
};
