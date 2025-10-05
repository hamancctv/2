// drawGroupLinesMSTButton.js — 그룹별 MST 토글 버튼 (필터+한글오버레이)
// v2025-10-05-FINAL-HANGUL-FILTER
(function () {
  console.log("[MST] loader start (hangul-filter)");

  // ===== 유틸 =====
  const mapReady = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function";

  function getDistanceLL(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = Math.PI / 180;
    const φ1 = lat1 * toRad, φ2 = lat2 * toRad;
    const dφ = (lat2 - lat1) * toRad;
    const dλ = (lng2 - lng1) * toRad;
    const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // 숫자와 하이픈만 허용
  function isNumericHyphenOnly(str) {
    return /^[0-9-]+$/.test(str);
  }

  // 한글 오버레이 생성
  function createTextOverlay(map, marker, text) {
    const el = document.createElement("div");
    el.textContent = text;
    el.style.cssText = `
      padding:2px 6px;
      background:rgba(255,255,255,0.9);
      border:1px solid #aaa;
      border-radius:6px;
      font-size:13px;
      color:#222;
      white-space:nowrap;
      transform:translateY(-45px) translateX(28px);
      pointer-events:none;
      box-shadow:0 1px 3px rgba(0,0,0,.25);
    `;
    const overlay = new kakao.maps.CustomOverlay({
      map,
      position: new kakao.maps.LatLng(marker.__lat, marker.__lng),
      content: el,
      yAnchor: 1
    });
    overlay.setZIndex(9999);
    window.groupTextOverlays.push(overlay);
  }

  // ===== 스타일 =====
  function injectStyle() {
    if (document.getElementById("btnGroupMST-style")) return;
    const st = document.createElement("style");
    st.id = "btnGroupMST-style";
    st.textContent = `
      #btnGroupMST {
        position:fixed;
        top:204px; left:10px;
        z-index:99998; /* 지도 위, 제안창 아래 */
        width:40px;height:40px;
        display:flex;align-items:center;justify-content:center;
        border:1px solid #ccc;border-radius:8px;background:#fff;
        cursor:pointer;transition:all .2s ease;box-sizing:border-box;
      }
      #btnGroupMST:hover { box-shadow:0 3px 12px rgba(0,0,0,.12); }
      #btnGroupMST svg { width:26px;height:26px;display:block; }
      #btnGroupMST svg path { stroke:#555;stroke-width:2.4;fill:none;transition:all .2s ease; }
      #btnGroupMST.active { border-color:#db4040;background:#fff !important; }
      #btnGroupMST.active svg path { stroke:#db4040;stroke-width:3; }
    `;
    document.head.appendChild(st);
  }

  // ===== 본체 초기화 =====
  function initMSTButton() {
    injectStyle();

    let btn = document.getElementById("btnGroupMST");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "btnGroupMST";
      btn.title = "그룹 최소거리 연결";
      btn.innerHTML = `
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path d="M8 26 L18 10 L28 26 M18 10 L18 26" />
        </svg>
      `;
      document.body.appendChild(btn);
    }

    window.groupLines = window.groupLines || [];
    window.groupTextOverlays = window.groupTextOverlays || [];

    function buildGroups(markers) {
      const groups = {};
      for (const m of markers) {
        const lat = m.__lat, lng = m.__lng;
        if (typeof lat !== "number" || typeof lng !== "number") continue;

        const g = (m.group || "").trim();
        if (!g) continue; // group 없음 → skip

        // 숫자/하이픈 외 문자 포함 시 MST 제외 + 오버레이 표시
        if (!isNumericHyphenOnly(g)) {
          createTextOverlay(window.map, m, g);
          continue;
        }

        const key = g.replace(/[-\s]/g, "");
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
      }
      return groups;
    }

    function createMSTLinesForGroup(map, list) {
      const n = list.length;
      if (n < 2) return 0;
      const connected = [list[0]];
      let created = 0;

      while (connected.length < n) {
        let minEdge = null;
        for (const cm of connected) {
          if (!cm || typeof cm.__lat !== "number" || typeof cm.__lng !== "number") continue;
          for (const tm of list) {
            if (!tm || connected.includes(tm)) continue;
            if (typeof tm.__lat !== "number" || typeof tm.__lng !== "number") continue;
            const d = getDistanceLL(cm.__lat, cm.__lng, tm.__lat, tm.__lng);
            if (!minEdge || d < minEdge.dist) minEdge = { from: cm, to: tm, dist: d };
          }
        }

        if (!minEdge || !minEdge.from || !minEdge.to) break;

        try {
          const p1 = new kakao.maps.LatLng(minEdge.from.__lat, minEdge.from.__lng);
          const p2 = new kakao.maps.LatLng(minEdge.to.__lat, minEdge.to.__lng);
          const line = new kakao.maps.Polyline({
            map,
            path: [p1, p2],
            strokeWeight: 4,
            strokeColor: "#db4040",
            strokeOpacity: 0.9,
            strokeStyle: "solid"
          });
          window.groupLines.push(line);
          connected.push(minEdge.to);
          created++;
        } catch (err) {
          console.warn("[MST] polyline creation failed:", err, minEdge);
          break;
        }
      }
      return created;
    }

    function clearAllLinesAndTexts() {
      for (const ln of window.groupLines) { try { ln.setMap(null); } catch {} }
      for (const ov of window.groupTextOverlays) { try { ov.setMap(null); } catch {} }
      window.groupLines = [];
      window.groupTextOverlays = [];
    }

    function drawMSTAllGroups() {
      if (!mapReady()) { console.warn("[MST] map not ready"); return; }
      const map = window.map;

      if (window.groupLines.length > 0 || window.groupTextOverlays.length > 0) {
        clearAllLinesAndTexts();
        console.log("[MST] cleared lines & text overlays");
        return;
      }

      const markers = Array.isArray(window.markers) ? window.markers : [];
      if (markers.length === 0) return console.warn("[MST] no markers found");

      const groups = buildGroups(markers);
      const keys = Object.keys(groups);
      let totalLines = 0;
      for (const k of keys) {
        const arr = groups[k];
        if (arr && arr.length >= 2) totalLines += createMSTLinesForGroup(map, arr);
      }
      console.log(`[MST] groups: ${keys.length}, lines created: ${totalLines}`);
    }

    btn.addEventListener("click", () => {
      if (!mapReady()) return console.warn("[MST] map not ready");
      const on = btn.classList.toggle("active");
      if (on) drawMSTAllGroups();
      else clearAllLinesAndTexts();
    });

    console.log("[MST] ready (filter+hangul overlay)");
  }

  function waitForMapAndMarkers() {
    if (window.map && Array.isArray(window.markers) && window.markers.length > 0) {
      initMSTButton();
    } else {
      setTimeout(waitForMapAndMarkers, 500);
    }
  }

  waitForMapAndMarkers();
})();
