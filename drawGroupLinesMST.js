// drawGroupLinesMSTButton.js — 그룹별 MST 토글 버튼 (거리재기 아래 or 고정형)
// v2025-10-robust-NUMERIC + zIndex(지도 위, 제안창 아래)
(function () {
  console.log("[MST] loader start (numeric-only)");

  // ===== 유틸 =====
  const mapReady = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function";

  // 하버사인 거리 (숫자 위도/경도)
  function getDistanceLL(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = Math.PI / 180;
    const φ1 = lat1 * toRad, φ2 = lat2 * toRad;
    const dφ = (lat2 - lat1) * toRad;
    const dλ = (lng2 - lng1) * toRad;
    const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ===== 스타일 =====
  if (!document.getElementById("btnGroupMST-style")) {
    const st = document.createElement("style");
    st.id = "btnGroupMST-style";
    st.textContent = `
      #btnGroupMST{
        position:fixed;
        top:178px; left:10px;
        z-index:99998; /* 지도보다 위, 제안창(99999)보다 아래 */
        width:40px;height:40px;
        display:flex;align-items:center;justify-content:center;
        border:1px solid #ccc;border-radius:8px;background:#fff;
        cursor:pointer;transition:all .2s ease;box-sizing:border-box;
      }
      #btnGroupMST:hover{ box-shadow:0 3px 12px rgba(0,0,0,.12); }
      #btnGroupMST svg{ width:26px;height:26px;display:block; }
      #btnGroupMST svg path{ stroke:#555;stroke-width:2.4;fill:none;transition:all .2s ease; }
      #btnGroupMST.active{ border-color:#db4040;background:#fff !important; }
      #btnGroupMST.active svg path{ stroke:#db4040;stroke-width:3; }
    `;
    document.head.appendChild(st);
  }

  // ===== 버튼 생성 =====
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

  // ===== 전역 선 보관 =====
  window.groupLines = window.groupLines || [];

  // ===== 그룹 빌드 =====
  function buildGroups(markers) {
    const groups = {};
    for (const m of markers) {
      const lat = m.__lat ?? (typeof m.getPosition === "function" ? m.getPosition().getLat?.() : undefined);
      const lng = m.__lng ?? (typeof m.getPosition === "function" ? m.getPosition().getLng?.() : undefined);
      if (typeof lat !== "number" || typeof lng !== "number") continue;

      let g = null;
      if (m.group != null) g = String(m.group);
      else if (m.line != null) g = String(m.line);
      if (!g || !g.trim()) continue;

      const key = g.replace(/[-\s]/g, "");
      if (!groups[key]) groups[key] = [];
      if (m.__lat === undefined) m.__lat = lat;
      if (m.__lng === undefined) m.__lng = lng;
      groups[key].push(m);
    }
    return groups;
  }

  // ===== MST 생성 (Prim 알고리즘) =====
  function createMSTLinesForGroup(map, list) {
    const n = list.length;
    if (n < 2) return 0;
    const connected = [list[0]];
    let created = 0;

    while (connected.length < n) {
      let minEdge = null;
      for (const cm of connected) {
        for (const tm of list) {
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
        strokeWeight: 4,
        strokeColor: "#db4040",
        strokeOpacity: 0.9,
        strokeStyle: "solid"
      });
      window.groupLines.push(line);
      connected.push(minEdge.to);
      created++;
    }
    return created;
  }

  // ===== 전체 그룹 드로우 =====
  function drawMSTAllGroups() {
    if (!mapReady()) { console.warn("[MST] map not ready"); return; }
    const map = window.map;

    if (window.groupLines.length > 0) {
      for (const ln of window.groupLines) { try { ln.setMap(null); } catch (e) {} }
      window.groupLines = [];
      console.log("[MST] cleared lines");
      return;
    }

    const markers = Array.isArray(window.markers) ? window.markers : [];
    if (markers.length === 0) {
      console.warn("[MST] no markers (window.markers empty)");
      return;
    }

    const groups = buildGroups(markers);
    const keys = Object.keys(groups);
    if (keys.length === 0) {
      console.warn("[MST] no groups found on markers");
      return;
    }

    let totalLines = 0;
    for (const k of keys) {
      const arr = groups[k];
      if (!arr || arr.length < 2) continue;
      totalLines += createMSTLinesForGroup(map, arr);
    }
    console.log(`[MST] groups: ${keys.length}, lines created: ${totalLines}`);
  }

  // ===== 버튼 토글 =====
  btn.addEventListener("click", () => {
    if (!mapReady()) { console.warn("[MST] map not ready"); return; }
    const on = btn.classList.toggle("active");
    if (on) drawMSTAllGroups();
    else {
      for (const ln of window.groupLines) { try { ln.setMap(null); } catch (e) {} }
      window.groupLines = [];
      console.log("[MST] toggled off (cleared)");
    }
  });

  console.log("[MST] ready (numeric + z-index tuned)");
})();
