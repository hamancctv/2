// drawGroupLinesMST.js
(function () {
  let groupLines = []; // 현재 지도에 표시된 폴리라인들 저장용

  // ✅ 그룹 문자열 정규화: 숫자/하이픈 → 숫자만 비교, 공백 제거
  function normalizeGroup(str) {
    if (!str) return null;
    const digits = str.replace(/[^0-9]/g, ""); // 숫자만 추출
    return digits.length > 0 ? digits : str.replace(/\s+/g, "");
  }

  // ✅ 두 좌표 거리 계산
  function getDistance(a, b) {
    const dx = a.getLng() - b.getLng();
    const dy = a.getLat() - b.getLat();
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ✅ MST (Prim’s Algorithm)
  function buildMST(nodes) {
    const edges = [];
    if (nodes.length <= 1) return edges;

    const used = new Set();
    used.add(0);

    while (used.size < nodes.length) {
      let minEdge = null;
      let minDist = Infinity;

      used.forEach((i) => {
        for (let j = 0; j < nodes.length; j++) {
          if (used.has(j)) continue;
          const dist = getDistance(nodes[i].getPosition(), nodes[j].getPosition());
          if (dist < minDist) {
            minDist = dist;
            minEdge = [i, j];
          }
        }
      });

      if (minEdge) {
        edges.push(minEdge);
        used.add(minEdge[1]);
      } else {
        break;
      }
    }
    return edges;
  }

  // ✅ 메인 함수
  window.drawGroupLinesMST = function () {
    // 1) 기존 선 제거
    groupLines.forEach((line) => line.setMap(null));
    groupLines = [];

    if (!window.markers || window.markers.length === 0) return;

    // 2) 그룹 분류
    const groups = {};
    window.markers.forEach((marker) => {
      const key = normalizeGroup(marker.group);
      if (!key) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(marker);
    });

    // 3) 그룹별 MST 적용
    Object.values(groups).forEach((markersInGroup) => {
      if (markersInGroup.length < 2) return;
      const edges = buildMST(markersInGroup);

      edges.forEach(([a, b]) => {
        const line = new kakao.maps.Polyline({
          map: window.map,
          path: [
            markersInGroup[a].getPosition(),
            markersInGroup[b].getPosition(),
          ],
          strokeWeight: 5,   // <--------- 선굵기
          strokeColor: "#FF0000",
          strokeOpacity: 0.8,
        });
        groupLines.push(line);
      });
    });
  };
})();
