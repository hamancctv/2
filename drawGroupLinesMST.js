// drawGroupLinesMSTButton.js — 그룹별 MST 토글 버튼 (거리재기 아래, 견고한 거리계산/그룹검증/배치)
// v2025-10-robust
(function () {
  console.log("[MST] loader start");

  // ===== 유틸 =====
  const mapReady = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function";

  // 두 LatLng 간 거리(m) - 하버사인
  function getDistance(latlng1, latlng2) {
    const R = 6371000; // m
    const toRad = Math.PI / 180;
    const lat1 = latlng1.getLat() * toRad;
    const lat2 = latlng2.getLat() * toRad;
    const dLat = (lat2 - lat1);
    const dLng = (latlng2.getLng() - latlng1.getLng()) * toRad;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
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
      /* fallback 배치용 (거리재기 버튼이 없을 때만 아래 규칙 적용) */
      #btnGroupMST.__fallback{
        position:fixed; top:200px; left:10px; z-index:350;
      }
    `;
    document.head.appendChild(st);
  }

  // ===== 버튼 생성 & 배치 (거리재기 버튼 바로 아래) =====
  let btn = document.getElementById("btnGroupMST");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "btnGroupMST";
    btn.title = "그룹 최소거리 연결";
    btn.innerHTML = `
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <!-- 간단한 트리형 아이콘 -->
        <path d="M8 26 L18 10 L28 26 M18 10 L18 26" />
      </svg>
    `;

    // 거리재기 버튼 바로 뒤에 꽂기 (같은 컨테이너 내)
    const distBtn = document.getElementById("btnDistance");
    if (distBtn && distBtn.parentElement) {
      distBtn.parentElement.insertBefore(btn, distBtn.nextSibling);
    } else {
      // 컨테이너를 못 찾으면 안전한 fallback: 화면 고정
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
      // kakao.maps.Marker 여야 함 (getPosition 존재)
      if (!m || typeof m.getPosition !== "function") continue;

      let g = null;
      // 커스텀 핸들러에서 marker.group을 세팅한 경우
      if (m.group != null) g = String(m.group);
      // 백업: line 속성을 그룹으로 쓸 수 있게
      else if (m.line != null) g = String(m.line);

      if (!g || !g.trim()) continue;

      const key = g.replace(/[-\s]/g, ""); // 하이픈/공백 제거 동일화
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    return groups;
  }

  // ===== MST 생성 (Prim) =====
  function createMSTLinesForGroup(map, groupMarkers) {
    // n 개면 n-1개 선
    const n = groupMarkers.length;
    if (n < 2) return 0;

    // 방문 집합 (연결된 마커)
    const connected = [groupMarkers[0]];
    let created = 0;

    while (connected.length < n) {
      let minEdge = null;

      for (const cm of connected) {
        for (const tm of groupMarkers) {
          if (connected.includes(tm)) continue;
const d = getDistance(cm.__pos || cm.getPosition(), tm.__pos || tm.getPosition());
          if (!minEdge || d < minEdge.dist) {
            minEdge = { from: cm, to: tm, dist: d };
          }
        }
      }

      if (!minEdge) break;

      const line = new kakao.maps.Polyline({
        map,
        path: [minEdge.from.getPosition(), minEdge.to.getPosition()],
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
      console.warn("[MST] no groups found on markers (need marker.group or marker.line)");
      return;
    }

    let totalLines = 0;
    for (const k of keys) {
      const arr = groups[k];
      if (!arr || arr.length < 2) continue;
      totalLines += createMSTLinesForGroup(map, arr);
    }
    console.log(`[MST] groups: ${keys.length}, lines created: ${totalLines}`);
    if (totalLines === 0) {
      console.warn("[MST] no MST lines created (check group sizes)");
    }
  }

  // ===== 버튼 토글 =====
  btn.addEventListener("click", () => {
    if (!mapReady()) return;
    const on = btn.classList.toggle("active");
    // on이면 그리기, off면 제거
    if (on) drawMSTAllGroups();
    else {
      for (const ln of window.groupLines) { try { ln.setMap(null); } catch(e){} }
      window.groupLines = [];
      console.log("[MST] toggled off (cleared)");
    }
  });

  console.log("[MST] ready");
})();
