// worker.js (Cloudflare Worker)
// Bindings:
// - KV (CAPS)
// - Secret: SCREENSHOTONE_KEY
// - Var: KAKAO_APPKEY (선택: 없으면 하드코딩해도 됨)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    // CORS 프리플라이트 허용
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    try {
      if (pathname === "/store" && request.method === "POST") {
        const body = await request.json();
        const id = crypto.randomUUID();
        await env.CAPS.put(id, JSON.stringify(body), { expirationTtl: 60 * 60 * 24 }); // 24h
        return json({ id });
      }

      if (pathname === "/data" && request.method === "GET") {
        const id = searchParams.get("id");
        if (!id) return new Response("missing id", { status: 400 });
        const raw = await env.CAPS.get(id);
        if (!raw) return new Response("not found", { status: 404 });
        return new Response(raw, {
          headers: { ...corsHeaders(), "content-type": "application/json" }
        });
      }

      if (pathname === "/view" && request.method === "GET") {
        const id = searchParams.get("id");
        if (!id) return new Response("missing id", { status: 400 });
        const kakaoKey = env.KAKAO_APPKEY || "여기에_카카오_APPKEY_넣기";
        const html = renderCapViewHtml(kakaoKey, url.origin, id);
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" }
        });
      }

      if (pathname === "/shot" && request.method === "GET") {
        const id = searchParams.get("id");
        if (!id) return new Response("missing id", { status: 400 });
        const target = `${url.origin}/view?id=${encodeURIComponent(id)}`;

        const apiKey = env.SCREENSHOTONE_KEY;
        const qs = new URLSearchParams({
          access_key: apiKey,
          url: target,
          viewport_width: "1920",
          viewport_height: "1080",
          delay: "2500",         // 지도/마커 렌더 대기
          full_page: "true",
          format: "png",
          // view에는 버튼/검색창 자체가 없지만 혹시 모르니 숨김 선택자 예비
          hide_selector: ".toolbar,.search-wrap,.btn,.search-box"
        });

        const resp = await fetch(`https://api.screenshotone.com/take?${qs.toString()}`);
        if (!resp.ok) {
          const text = await resp.text();
          return new Response(`ScreenshotOne error: ${resp.status} ${text}`, { status: 502 });
        }
        return new Response(resp.body, {
          headers: {
            "content-type": "image/png",
            "content-disposition": 'attachment; filename="map_capture.png"'
          }
        });
      }

      return new Response("Not Found", { status: 404 });
    } catch (e) {
      return new Response("Server error: " + e.message, { status: 500 });
    }
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { ...corsHeaders(), "content-type": "application/json" }
  });
}

function renderCapViewHtml(kakaoKey, origin, id) {
  // 이 페이지엔 버튼/검색창 UI가 아예 없음(캡처 전용)
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>캡처 뷰어</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&libraries=services"></script>
<style>
  html,body{margin:0;height:100%;overflow:hidden;background:#f8f8f8;}
  #map{width:100%;height:100%;}
  #guide{
    position:fixed;top:10px;right:14px;
    background:rgba(0,0,0,.65);color:#fff;
    padding:6px 10px;border-radius:8px;
    font:13px/1.4 system-ui, sans-serif;
    z-index:9999;user-select:none;pointer-events:none;
  }
  .overlay-hover{
    padding:2px 6px;background:#fff;border:1px solid #ccc;border-radius:5px;
    font-size:14px;white-space:nowrap;opacity:.95;box-shadow:0 1px 3px rgba(0,0,0,.15);
    user-select:none;pointer-events:none;
  }
</style>
</head>
<body>
  <div id="map"></div>
  <div id="guide">📸 캡처 전용 화면(버튼/검색창 없음)</div>

  <script>
    (async function(){
      const id = ${JSON.stringify(id)};
      const resp = await fetch(${JSON.stringify(origin) } + "/data?id=" + encodeURIComponent(id));
      if(!resp.ok){ console.error("data not found"); return; }
      const data = await resp.json();

      kakao.maps.load(function(){
        const map = new kakao.maps.Map(document.getElementById("map"), {
          center: new kakao.maps.LatLng(data.center.lat, data.center.lng),
          level: data.level || 4,
          mapTypeId: data.type || kakao.maps.MapTypeId.ROADMAP
        });

        // 마커 + 오버레이
        (data.markers || []).forEach(o=>{
          const pos = new kakao.maps.LatLng(o.lat, o.lng);
          new kakao.maps.Marker({ position: pos, map: map, title: o.title });
          if (o.overlayHTML) {
            new kakao.maps.CustomOverlay({ position: pos, content: o.overlayHTML, yAnchor: 1.8 }).setMap(map);
          }
        });

        // MST 선
        (data.mstLines || []).forEach(l=>{
          new kakao.maps.Polyline({
            path: l.path.map(p=>new kakao.maps.LatLng(p.lat, p.lng)),
            strokeWeight: 2,
            strokeColor: l.color || "#0066ff",
            strokeOpacity: 0.85,
            strokeStyle: "solid",
            map
          });
        });

        // 거리재기 선
        (data.distLines || []).forEach(l=>{
          new kakao.maps.Polyline({
            path: l.path.map(p=>new kakao.maps.LatLng(p.lat, p.lng)),
            strokeWeight: 2,
            strokeColor: l.color || "#e53935",
            strokeOpacity: 0.9,
            strokeStyle: "dash",
            map
          });
        });

        console.log("[/view] 렌더 완료 ✅");
      });
    })();

    document.addEventListener("keydown", e=>{ if(e.key === "Escape") window.close(); });
  </script>
</body>
</html>`;
}
