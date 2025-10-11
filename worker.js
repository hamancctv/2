export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ✅ 1. 요청 Origin 확인 (없으면 * 처리)
    const origin = request.headers.get("Origin") || "*";

    // ✅ 2. CORS 헤더 구성 (Pages 포함 전부 허용)
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    };

    // ✅ 3. OPTIONS 사전요청 응답 (Preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // ✅ 4. /api/save (좌표 저장)
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
        )
          .bind(lat, lng, icon)
          .run();

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ✅ 5. /api/load (저장된 좌표 불러오기)
    if (url.pathname === "/api/load") {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM emojis").all();
        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ✅ 6. 기본 응답 (Not Found)
    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
};
