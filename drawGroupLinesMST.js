// drawGroupLinesMST.js
(function () {
  // 전역 배열에 저장 → 토글 제어
  window.groupLines = window.groupLines || [];

  window.drawGroupLinesMST = function () {
    const map = window.map; // 전역 map 참조
    if (!map) {
      console.error("지도(map)가 정의되지 않았습니다.");
      return;
    }

    // 🔹 이미 선이 있으면 모두 제거 (토글 Off)
    if (window.groupLines.length > 0) {
      window.groupLines.forEach(line => line.setMap(null));
      window.groupLines = [];
      return;
    }

    if (!window.markers || window.markers.length === 0) return;
    const markers = window.markers;

    // === 그룹별 마커 묶기 ===
    const groups = {};
    markers.forEach(m => {
      if (!m.group) return;
      const key = m.group.replace(/[-\s]/g, ""); // 하이픈/공백 무시
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    // === 그룹별 MST (Prim 알고리즘) ===
    Object.values(groups).forEach(group => {
      if (group.length < 2) return;

      const connected = [group[0]];

      while (connected.length < group.length) {
        let minEdge = null;

        connected.forEach(cm => {
          group.forEach(tm => {
            if (connected.includes(tm)) return;

            const dist = cm.getPosition().distance(tm.getPosition());
            if (!minEdge || dist < minEdge.dist) {
              minEdge = { from: cm, to: tm, dist };
            }
          });
        });

        if (minEdge) {
          const polyline = new kakao.maps.Polyline({
            map: map,
            path: [minEdge.from.getPosition(), minEdge.to.getPosition()],
            strokeWeight: 5,          // 선 굵기
            strokeColor: "#FF0000",   // 선 색
            strokeOpacity: 0.9,       // 불투명도 (1에 가까울수록 진함)
          });
          window.groupLines.push(polyline);
          connected.push(minEdge.to);
        } else {
          break;
        }
      }
    });
  };
})();
