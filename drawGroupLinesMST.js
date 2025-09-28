// drawGroupLinesMST.js
(function () {
  // 그룹명 정규화: 숫자만 있는 그룹은 하이픈/공백 제거 후 비교
  function normalizeGroupName(name) {
    if (!name) return null;
    const onlyNumDash = /^[0-9\s-]+$/;
    if (onlyNumDash.test(name)) {
      return name.replace(/[\s-]/g, ""); // 숫자만 남김
    }
    return name.trim(); // 그 외는 그대로
  }

  // 두 좌표 사이 거리 계산
  function getDistance(a, b) {
    return Math.sqrt(
      Math.pow(a.getLat() - b.getLat(), 2) + Math.pow(a.getLng() - b.getLng(), 2)
    );
  }

  // MST 생성 (Prim 알고리즘)
  function buildMSTPaths(markers) {
    if (markers.length <= 1) return [];

    const connected = [markers[0]];
    const edges = [];
    const paths = [];

    while (connected.length < markers.length) {
      let minEdge = null;
      let minDist = Infinity;

      connected.forEach(c => {
        markers.forEach(m => {
          if (connected.includes(m)) return;
          const d = getDistance(c.getPosition(), m.getPosition());
          if (d < minDist) {
            minDist = d;
            minEdge = [c, m];
          }
        });
      });

      if (minEdge) {
        connected.push(minEdge[1]);
        paths.push([minEdge[0].getPosition(), minEdge[1].getPosition()]);
      } else break;
    }
    return paths;
  }

  // 전역에 함수 노출
  let polyByGroup = {};

  window.drawGroupLinesMST = function () {
    if (!window.markers || !window.markers.length) {
      console.warn("[MST] markers 없음");
      return;
    }
    const map = window.markers[0].getMap() || window.map;
    if (!map) return;

    // 토글 OFF → 기존 선 지우기
    if (Object.keys(polyByGroup).length) {
      Object.values(polyByGroup).forEach(arr => arr.forEach(pl => pl.setMap(null)));
      polyByGroup = {};
      return;
    }

    // 그룹별 분류
    const groups = {};
    window.markers.forEach(mk => {
      const g = normalizeGroupName(mk.group);
      if (!g) return; // 그룹 없는 마커는 선 연결 안 함
      if (!groups[g]) groups[g] = [];
      groups[g].push(mk);
    });

    // 그룹별 MST 선 생성
    Object.keys(groups).forEach(g => {
      const list = groups[g];
      if (list.length < 2) return;

      const paths = buildMSTPaths(list);
      const arr = [];

      paths.forEach(path => {
        arr.push(
          new kakao.maps.Polyline({
            path,
            strokeWeight: 3,
            strokeColor: "#db4040",
            strokeOpacity: 0.9,
            strokeStyle: "solid",
            map,
          })
        );
      });

      polyByGroup[g] = arr;
    });
  };
})();
