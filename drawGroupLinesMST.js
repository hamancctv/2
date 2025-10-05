// drawGroupLinesMSTButton.js — 그룹별 MST 토글 버튼 (group-safe + debug)
// v2025-10-05-STABLE-GROUPSAFE-FINAL-FIX
(function () {
  console.log("[MST] loader start (group-safe) - FINAL FIX APPLIED");

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

        // ⭐ 위치 정보 안정화: __lat, __lng이 없으면 getPosition()을 사용합니다.
        let lat, lng;
        try {
            if (m.getPosition && typeof m.getPosition === 'function') {
                const position = m.getPosition();
                lat = position.getLat();
                lng = position.getLng();
            } else {
                lat = +m.__lat; 
                lng = +m.__lng;
            }
        } catch(e) {
            continue;
        }

        if (!isFinite(lat) || !isFinite(lng)) {
            continue;
        }

        // MST 로직이 사용할 수 있도록 마커 객체에 위도/경도 저장
        m.__lat = lat; 
        m.__lng = lng;

        let g = (m.group ?? m.line ?? "").toString().trim();
        if (!g) continue;

        // 숫자/하이픈 외 문자가 포함된 그룹은 MST 연결에서 제외합니다.
        if (/[^0-9\-]/.test(g)) {
            continue; // 연결하지 않고, 그룹으로도 포함하지 않습니다. (CustomOverlay 오류 방지)
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
      // 중복 좌표 마커 제거 (Prims 알고리즘 준비)
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
        
        // ⭐ Polyline 생성 충돌 에러(TypeError) 해결: map 옵션 제거 후 setMap 별도 호출
        const line = new kakao.maps.Polyline({
          path: [p1, p2],
          strokeWeight: 3.5,
          strokeColor: "#db4040", // 빨간색
          strokeOpacity: 0.9
        });
        
        line.setMap(map); // ⭐ 맵 등록을 분리하여 에러를 우회합니다.
        
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

      // 이미 선이 그려져 있다면 지우고 종료 (토글 기능)
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
        // 그룹 내 마커가 2개 이상이고, MST 연결이 가능할 때만 시도
        if (arr.length >= 2) { 
            total += createMSTLinesForGroup(map, arr);
        }
      }
      console.log(`[MST] total lines drawn: ${total}`);
    }

    btn.addEventListener("click", () => {
      if (!mapReady()) return;
      const on = btn.classList.toggle("active");
      if (on) drawMSTAllGroups();
      else {
        // OFF 상태일 때 선을 지우는 로직
        window.groupLines.forEach(l => l.setMap(null));
        window.groupLines = [];
      }
    });

    console.log("[MST] ready");
  }

  // === 로드 대기 ===
  function waitForMapAndMarkers() {
    if (window.map && window.markers) {
      initMSTButton();
    } else {
      setTimeout(waitForMapAndMarkers, 500);
    }
  }

  waitForMapAndMarkers();
})();
