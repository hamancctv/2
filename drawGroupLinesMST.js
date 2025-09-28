// drawGroupLinesMST.js
(function () {
  let currentPolylines = [];

  // 그룹 문자열 정규화: 숫자만 남기고, 하이픈·공백 제거
  function normalizeGroupName(name) {
    if (!name) return "";
    return name.replace(/[\s-]/g, ""); // 공백·하이픈 제거
  }

  // 거리 계산
  function getDistance(a, b) {
    const line = new kakao.maps.Polyline({ path: [a, b] });
    return line.getLength();
  }

  // MST (Prim 알고리즘)
  function buildMST(points) {
    const n = points.length;
    if (n <= 1) return [];

    const visited = Array(n).fill(false);
    visited[0] = true;
    const edges = [];

    while (edges.length < n - 1) {
      let minEdge = null;
      let minDist = Infinity;

      for (let i = 0; i < n; i++) {
        if (!visited[i]) continue;
        for (let j = 0; j < n; j++) {
          if (visited[j]) continue;
          const dist = getDistance(points[i].getPosition(), points[j].getPosition());
          if (dist < minDist) {
            minDist = dist;
            minEdge = [i, j];
          }
        }
      }

      if (minEdge) {
        const [u, v] = minEdge;
        visited[v] = true;
        edges.push([points[u], points[v]]);
      } else {
        break;
      }
    }
    return edges;
  }

  // 그룹별 선 연결
  window.drawGroupLinesMST = function () {
    // 이전 선 제거
    currentPolylines.forEach((line) => line.setMap(null));
    currentPolylines = [];

    if (!window.markers) {
      console.warn("markers 배열이 없습니다.");
      return;
    }

    // markers를 그룹별로 분류
    const groups = {};
    window.markers.forEach((marker) => {
      const g = normalizeGroupName(marker.group);
      if (!g) return; // 그룹 없으면 skip
      if (!groups[g]) groups[g] = [];
      groups[g].push(marker);
    });

    // 그룹별로 MST 선 연결
    Object.keys(groups).forEach((g) => {
      const edges = buildMST(groups[g]);
      edges.forEach(([m1, m2]) => {
        const line = new kakao.maps.Polyline({
          path: [m1.getPosition(), m2.getPosition()],
          strokeWeight: 3,
          strokeColor: "#00A0FF",
          strokeOpacity: 0.9,
          strokeStyle: "solid",
          map,
        });
        currentPolylines.push(line);
      });
    });
  };
})();
