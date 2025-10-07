// drawGroupLinesMST.js — 그룹별 MST 연결 (공백/NULL 무시 + 신규 라벨 표시 + 클리어 지원)
// v2025-10-final with 신규 overlay cleanup
(function () {
  console.log("[MST] loader start (신규 label + cleanup)");

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

  function makeMSTEdges(positions) {
    const n = positions.length;
    if (n < 2) return [];
    const used = Array(n).fill(false);
    const edges = [];
    used[0] = true;

    for (let k = 0; k < n - 1; k++) {
      let minD = Infinity, minU = -1, minV = -1;
      for (let i = 0; i < n; i++) if (used[i]) {
        for (let j = 0; j < n; j++) if (!used[j]) {
          const d = getDistanceLL(
            positions[i].getLat(), positions[i].getLng(),
            positions[j].getLat(), positions[j].getLng()
          );
          if (d < minD) { minD = d; minU = i; minV = j; }
        }
      }
      if (minU !== -1 && minV !== -1) {
        used[minV] = true;
        edges.push({ start: positions[minU], end: positions[minV], dist: minD });
      }
    }
    return edges;
  }

  function createMSTLinesForGroup(map, groupMarkers, groupName) {
    console.log(`[MST] group ${groupName} (${groupMarkers.length})`);

    const valid = groupMarkers.filter(mk =>
      mk && mk.getPosition && typeof mk.getPosition === "function"
    );
    if (valid.length < 1) return [];

    // 신규 그룹은 선대신 오버레이
    if (groupName === "신규") {
      console.log(`[MST] '${groupName}' → no lines, show label`);
      valid.forEach(mk => {
        const pos = mk.getPosition();
        const content = document.createElement("div");
        content.textContent = "신규";
        content.style.cssText = `
          background:#ffeb3b;
          color:#000;
          border:1px solid #f0c000;
          font-size:13px;
          font-weight:700;
          border-radius:6px;
          padding:2px 6px;
          white-space:nowrap;
          box-shadow:0 2px 6px rgba(0,0,0,.15);
        `;
        const overlay = new kakao.maps.CustomOverlay({
          position: pos,
          content,
          yAnchor: 0.5,
          xAnchor: -0.2,
          zIndex: 9999
        });
        overlay.setMap(map);

        // 신규 오버레이도 따로 기록
        window.__MST_NEW_OVERLAYS__.push(overlay);
      });
      return [];
    }

    if (valid.length < 2) {
      console.warn(`[MST] group ${groupName} → 유효 마커 ${valid.length}개 (skip)`);
      return [];
    }

    const positions = valid.map(mk => mk.getPosition()).filter(Boolean);
    const lines = makeMSTEdges(positions);

    const polylines = [];
    for (const edge of lines) {
      try {
        const path = [edge.start, edge.end];
        const line = new kakao.maps.Polyline({
          map,
          path,
          strokeWeight: 4,
          strokeColor: "rgba(255,0,0,0.9)",
          strokeStyle: "solid"
        });
        polylines.push(line);
      } catch (e) {
        console.error(`[MST] Polyline creation failed`, e);
      }
    }

    console.log(`[MST] group ok (${valid.length}) → ${polylines.length} lines`);
    return polylines;
  }

  window.drawMSTAllGroups = function (map) {
    if (!mapReady()) return console.warn("[MST] Map not ready.");
    if (!window.getMarkersByGroup) return console.error("[MST] getMarkersByGroup() missing.");

    // 초기화
    window.__MST_LINES__ = [];
    window.__MST_NEW_OVERLAYS__ = [];

    const groups = window.getMarkersByGroup();
    let totalLines = 0;

    console.log(`[MST] 그룹 연결 시작`);

    for (const [name, list] of Object.entries(groups)) {
      if (!name || typeof name !== "string" || !name.trim()) {
        console.log(`[MST] skip empty/null group`);
        continue;
      }
      if (!Array.isArray(list) || list.length === 0) continue;

      try {
        const lines = createMSTLinesForGroup(map, list, name);
        window.__MST_LINES__.push(...lines);
        totalLines += lines.length;
      } catch (err) {
        console.error(`[MST] ERROR @group ${name}`, err);
      }
    }

    console.log(`[MST] total lines: ${totalLines}`);
  };

  // ✅ 선 + 신규오버레이 모두 제거
  window.clearMSTLines = function () {
    if (window.__MST_LINES__) {
      for (const l of window.__MST_LINES__) try { l.setMap(null); } catch {}
      window.__MST_LINES__ = [];
    }
    if (window.__MST_NEW_OVERLAYS__) {
      for (const o of window.__MST_NEW_OVERLAYS__) try { o.setMap(null); } catch {}
      window.__MST_NEW_OVERLAYS__ = [];
    }
    console.log("[MST] all lines + 신규 overlays cleared.");
  };

})();
