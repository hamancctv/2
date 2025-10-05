<script>
// drawGroupLinesMSTButton.js — 그룹별 MST 토글 버튼 (고정형 + 좌표/그룹 견고화)
// v2025-10-robust-NUMERIC-fix1
(function () {
  console.log("[MST] loader start (numeric-only/fix1)");

  // ===== 유틸 =====
  const mapReady = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function" &&
    typeof kakao.maps.LatLng === "function";

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

  // ===== 좌표/그룹 추출을 견고하게 =====
  function extractCoords(m) {
    // 1) 캐시 우선
    if (typeof m.__lat === "number" && typeof m.__lng === "number") {
      return { lat: m.__lat, lng: m.__lng };
    }
    // 2) 대표적인 필드들
    if (typeof m.lat === "number" && typeof m.lng === "number") {
      return { lat: m.lat, lng: m.lng };
    }
    if (typeof m.y === "number" && typeof m.x === "number") { // 일부 데이터셋(x,y)
      return { lat: m.y, lng: m.x };
    }
    // 3) 카카오 마커 또는 래핑객체 내부에 마커
    const cand = [m, m.marker, m.mk, m.kakaoMarker];
    for (const c of cand) {
      if (!c) continue;
      if (typeof c.getPosition === "function") {
        const p = c.getPosition();
        const lat = p?.getLat?.();
        const lng = p?.getLng?.();
        if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
      }
      if (c.position && typeof c.position.getLat === "function") {
        const lat = c.position.getLat();
        const lng = c.position.getLng();
        if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
      }
    }
    return null;
  }

  function extractGroup(m) {
    let g = null;
    // 우선순위: group -> line -> grp -> g -> properties.group
    if (m.group != null) g = String(m.group);
    else if (m.line != null) g = String(m.line);
    else if (m.grp != null) g = String(m.grp);
    else if (m.g != null) g = String(m.g);
    else if (m.properties?.group != null) g = String(m.properties.group);

    if (!g) return null;
    const key = g.replace(/[-\s]/g, ""); // 하이픈/공백 제거
    return key.length ? key : null;
  }

  // ===== 스타일 =====
  if (!document.getElementById("btnGroupMST-style")) {
    const st = document.createElement("style");
    st.id = "btnGroupMST-style";
    st.textContent = `
      #btnGroupMST{
        position:fixed; top:58px; left:10px; z-index:340;
        width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;
        border:1px solid #ccc;border-radius:8px;background:#fff;cursor:pointer;transition:all .2s ease;box-sizing:border-box;
      }
      #btnGroupMST:hover{ box-shadow:0 3px 12px rgba(0,0,0,.12); }
      #btnGroupMST svg{ width:26px;height:26px;display:block; }
      #btnGroupMST svg path{ stroke:#555;stroke-width:2.4;fill:none;transition:all .2s ease; }
      #btnGroupMST.active{ border-color:#db4040;background:#fff !important; }
      #btnGroupMST.active svg path{ stroke:#db4040;stroke-width:3; }
    `;
    document.head.appendChild(st);
  }

  // ===== 버튼 생성 (기본: 고정형). 필요하면 '#btnDistance' 아래로 재배치 옵션 제공 =====
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

  // 필요 시, 아래 주석을 해제하면 거리재기 버튼 바로 뒤로 옮깁니다.
  // (DOM 타이밍 문제로 못 찾으면 고정형 그대로 둠)
  /*
  const distBtn = document.getElementById("btnDistance");
  if (distBtn && distBtn.parentElement) {
    btn.style.position = ""; // 고정 해제
    btn.style.top = "";
    btn.style.left = "";
    distBtn.parentElement.insertBefore(btn, distBtn.nextSibling);
  }
  */

  // ===== 선 보관 & 상태 =====
  window.groupLines = window.groupLines || [];
  let isOn = false;

  function clearLines() {
    if (!window.groupLines.length) return;
    for (const ln of window.groupLines) {
      try { ln.setMap(null); } catch(e){}
    }
    window.groupLines = [];
  }

  // ===== 그룹핑 =====
  function buildGroups(markers) {
    const groups = {};
    let used = 0, skippedNoCoord = 0, skippedNoGroup = 0;

    for (const m of markers) {
      const coord = extractCoords(m);
      if (!coord) { skippedNoCoord++; continue; }

      const key = extractGroup(m);
      if (!key) { skippedNoGroup++; continue; }

      if (!groups[key]) groups[key] = [];
      // 캐시
      if (m.__lat === undefined) m.__lat = coord.lat;
      if (m.__lng === undefined) m.__lng = coord.lng;

      groups[key].push(m);
      used++;
    }

    console.log(`[MST] markers used: ${used}, noCoord: ${skippedNoCoord}, noGroup: ${skippedNoGroup}, groupKeys: ${Object.keys(groups).length}`);
    return groups;
  }

  // ===== MST 생성 (Prim) =====
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

  // ===== 그리기 전용 =====
  function drawMSTAllGroups() {
    if (!mapReady()) { console.warn("[MST] map not ready"); return 0; }
    const map = window.map;

    const markers = Array.isArray(window.markers) ? window.markers : [];
    if (!markers.length) { console.warn("[MST] no markers (window.markers empty)"); return 0; }

    const groups = buildGroups(markers);
    const keys = Object.keys(groups);
    if (!keys.length) { console.warn("[MST] no groups found on markers"); return 0; }

    let totalLines = 0;
    for (const k of keys) {
      const arr = groups[k];
      if (!arr || arr.length < 2) continue;
      totalLines += createMSTLinesForGroup(map, arr);
    }
    console.log(`[MST] groups: ${keys.length}, lines created: ${totalLines}`);
    return totalLines;
  }

  // ===== 버튼 토글 =====
  btn.addEventListener("click", () => {
    if (!mapReady()) { console.warn("[MST] map not ready"); return; }
    isOn = !isOn;
    btn.classList.toggle("active", isOn);
    if (isOn) {
      clearLines(); // 혹시 남아있던 선 제거
      const made = drawMSTAllGroups();
      if (!made) {
        // 실패시 상태 롤백
        btn.classList.remove("active");
        isOn = false;
      }
    } else {
      clearLines();
      console.log("[MST] toggled off (cleared)");
    }
  });

  console.log("[MST] ready (numeric/fix1)");
})();
</script>
