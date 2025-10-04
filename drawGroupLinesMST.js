// drawGroupLinesMSTButton.js — 그룹별 MST 토글 버튼 (거리재기 아래, Lat/Lng 숫자만 사용)
// v2025-10-robust-NUMERIC
(function () {
  console.log("[MST] loader start (numeric-only)");

  // ===== 유틸 =====
  const mapReady = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function";

  // 하버사인 (숫자 위도/경도)
  function getDistanceLL(lat1, lng1, lat2, lng2) {
    const R = 6371000; // m
    const toRad = Math.PI / 180;
    const φ1 = lat1 * toRad, φ2 = lat2 * toRad;
    const dφ = (lat2 - lat1) * toRad;
    const dλ = (lng2 - lng1) * toRad;
    const a = Math.sin(dφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ===== 스타일 =====
  if (!document.getElementById("btnGroupMST-style")) {
    const st = document.createElement("style");
    st.id = "btnGroupMST-style";
    st.textContent = `
      #btnGroupMST{
        width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;
        border:1px solid #ccc;border-radius:8px;background:#fff;cursor:pointer;transition:all .2s ease;box-sizing:border-box;
      }
      #btnGroupMST:hover{ box-shadow:0 3px 12px rgba(0,0,0,.12); }
      #btnGroupMST svg{ width:26px;height:26px;display:block; }
      #btnGroupMST svg path{ stroke:#555;stroke-width:2.4;fill:none;transition:all .2s ease; }
      #btnGroupMST.active{ border-color:#db4040;background:#fff !important; }
      #btnGroupMST.active svg path{ stroke:#db4040;stroke-width:3; }

      /* 거리재기 버튼을 못 찾을 때만 고정 배치 */
      #btnGroupMST.__fallback{ position:fixed; top:200px; left:10px; z-index:340; }
    `;
    document.head.appendChild(st);
  }

  // ===== 버튼 생성 & 배치 (btnDistance 바로 아래) =====
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
    const distBtn = document.getElementById("btnDistance");
    if (distBtn && distBtn.parentElement) {
      distBtn.parentElement.insertBefore(btn, distBtn.nextSibling);
    } else {
      btn.classList.add("__fallback");
      document.body.appendChild(btn);
    }
  }

  // ===== 전역 선 보관 =====
  window.groupLines = window.groupLines || [];

  // ===== 그룹핑 (marker.group 우선, 없으면 marker.line 보조) =====
  function buildGroups(markers) {
    const groups = {};
    for (const m of markers) {
      // 숫자 좌표 필수
      const lat = m.__lat ?? (typeof m.getPosition === "function" ? m.getPosition().getLat?.() : undefined);
      const lng = m.__lng ?? (typeof m.getPosition === "function" ? m.getPosition().getLng?.() : undefined);
      if (typeof lat !== "number" || typeof lng !== "number") continue;

      let g = null;
      if (m.group != null) g = String(m.group);
      else if (m.line != null) g = String(m.line);
      if (!g || !g.trim()) continue;

      const key = g.replace(/[-\s]/g, "");
      if (!groups[key]) groups[key] = [];
      // 최소 정보 캐시 (숫자만 사용)
      if (m.__lat === undefined) m.__lat = lat;
      if (m.__lng === undefined) m.__lng = lng;
      groups[key].push(m);
    }
    return groups;
  }

  // ===== MST 생성 (Prim, 숫자좌표 기반) =====
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
          if (!minEdge || d < minEdge.dist) {
            minEdge = { from: cm, to: tm, dist: d };
          }
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

  // ===== 메인 드로우 함수 =====
  function drawMSTAllGroups() {
    if (!mapReady()) { console.warn("[MST] map not ready"); return; }
    const map = window.map;

    // 토글 OFF: 기존 선 제거
    if (window.groupLines.length > 0) {
      for (const ln of window.groupLines) { try { ln.setMap(null); } catch(e){} }
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
      console.warn("[MST] no groups found on markers (need marker.group or marker.line, plus __lat/__lng)");
      return;
    }

    let totalLines = 0;
    for (const k of keys) {
      const arr = groups[k];
      if (!arr || arr.length < 2) continue;
      totalLines += createMSTLinesForGroup(map, arr);
    }
    console.log(`[MST] groups: ${keys.length}, lines created: ${totalLines}`);
    if (totalLines === 0) console.warn("[MST] no MST lines created (check group sizes and __lat/__lng)");
  }

  // ===== 버튼 토글 =====
  btn.addEventListener("click", () => {
    if (!mapReady()) { console.warn("[MST] map not ready"); return; }
    const on = btn.classList.toggle("active");
    if (on) drawMSTAllGroups();
    else {
      for (const ln of window.groupLines) { try { ln.setMap(null); } catch(e){} }
      window.groupLines = [];
      console.log("[MST] toggled off (cleared)");
    }
  });

  console.log("[MST] ready (numeric)");
})();
