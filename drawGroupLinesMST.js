// drawGroupLinesMSTButton.js — 그룹별 MST 토글 버튼 (group-safe + debug)
// v2025-10-05-STABLE-GROUPSAFE
(function () {
  console.log("[MST] loader start (group-safe)");

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

  function injectStyle() {
    if (document.getElementById("btnGroupMST-style")) return;
    const st = document.createElement("style");
    st.id = "btnGroupMST-style";
    st.textContent = `
      #btnGroupMST {
        position:fixed;
        top:204px; left:10px;
        z-index:99998;
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

  function initMSTButton() {
    injectStyle();

    let btn = document.getElementById("btnGroupMST");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "btnGroupMST";
      btn.title = "그룹 최소거리 연결";
      btn.innerHTML = `<svg viewBox="0 0 36 36"><path d="M8 26 L18 10 L28 26 M18 10 L18 26" /></svg>`;
      document.body.appendChild(btn);
    }

    window.groupLines = window.groupLines || [];

    // === 그룹 정리 ===
    function buildGroups(markers) {
      const groups = {};
      for (const m of markers) {
        if (!m) continue;
        const lat = +m.__lat, lng = +m.__lng;
        if (!isFinite(lat) || !isFinite(lng)) continue;

        let g = (m.group ?? m.line ?? "").toString().trim();
        if (!g) continue;

        // ⚙️ 숫자+하이픈 외 문자 → 연결 대신 텍스트 표시용
        if (/[^0-9\-]/.test(g)) {
          const label = document.createElement("div");
          label.textContent = g;
          label.style.cssText = `
            position:absolute;
            background:rgba(255,255,255,0.8);
            border:1px solid #db4040;
            border-radius:4px;
            padding:1px 4px;
            font-size:12px;
            pointer-events:none;
            transform:translate(6px,-6px);
          `;
          const ov = new kakao.maps.CustomOverlay({
            position: new kakao.maps.LatLng(lat, lng),
            content: label,
            yAnchor: 1,
            zIndex: 99999
          });
          ov.setMap(window.map);
          continue;
        }

        const key = g.replace(/[-\s]/g, "");
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
      }

      console.log("[MST] built groups:", Object.keys(groups).length, groups);
      return groups;
    }

    // === 그룹별 MST 생성 ===
    function createMSTLinesForGroup(map, list) {
      const unique = [...new Map(list.map(m => [`${m.__lat},${m.__lng}`, m])).values()];
      if (unique.length < 2) return 0;

      const connected = [unique[0]];
      let created = 0;

      while (connected.length < unique.length) {
        let minEdge = null;
        for (const cm of connected) {
          for (const tm of unique) {
            if (connected.includes(tm)) continue;
            const d = getDistanceLL(cm.__lat, cm.__lng, tm.__lat, tm.__lng);
            if (!minEdge || d < minEdge.dist) minEdge = { from: cm, to: tm, dist: d };
          }
        }
        if (!minEdge) break;

        const p1 = new kakao.maps.LatLng(minEdge.from.__lat, minEdge.from.__lng);
        const p2 = new kakao.maps.LatLng(minEdge.to.__lat, minEdge.to.__lng);
        const line = new kakao.maps.Polyline({
          map,
          path: [p1, p2],
          strokeWeight: 3.5,
          strokeColor: "#db4040",
          strokeOpacity: 0.9
        });
        window.groupLines.push(line);
        connected.push(minEdge.to);
        created++;
      }

      console.log(`[MST] Group done (${unique.length} pts) → ${created} lines`);
      return created;
    }

    function drawMSTAllGroups() {
      if (!mapReady()) return;
      const map = window.map;

      if (window.groupLines.length > 0) {
        window.groupLines.forEach(l => l.setMap(null));
        window.groupLines = [];
        console.log("[MST] cleared");
        return;
      }

      const markers = window.markers || [];
      const groups = buildGroups(markers);
      let total = 0;
      for (const [g, arr] of Object.entries(groups)) {
        total += createMSTLinesForGroup(map, arr);
      }
      console.log(`[MST] total lines drawn: ${total}`);
    }

    btn.addEventListener("click", () => {
      if (!mapReady()) return;
      const on = btn.classList.toggle("active");
      if (on) drawMSTAllGroups();
      else {
        window.groupLines.forEach(l => l.setMap(null));
        window.groupLines = [];
      }
    });

    console.log("[MST] ready");
  }

  // === 로드 대기 ===
  function waitForMapAndMarkers() {
    if (window.map && window.markers && window.markers.length > 0) {
      initMSTButton();
    } else {
      setTimeout(waitForMapAndMarkers, 500);
    }
  }

  waitForMapAndMarkers();
})();
