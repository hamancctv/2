// btnDistance.js (안 쓸 때 자동 비활성화)

(function () {
  console.log("[btnDistance] loaded");

  // 버튼 찾기
  const btn = document.getElementById("btnDistance");
  if (!btn) {
    console.log("[btnDistance] no button found, disabled");
    return; // 버튼 없으면 스크립트 종료
  }

  let drawing = false;
  let clickLine = null;
  let moveLine = null;
  let lastPoint = null;
  let segOverlay = null;
  let totalOverlay = null;
  let segCount = 0;

  btn.addEventListener('click', toggleMeasure);

  function toggleMeasure() {
    drawing = !drawing;
    if (drawing) {
      resetMeasure();
      btn.classList.add('active');
      map.setCursor('crosshair');
      kakao.maps.event.addListener(map, 'click', onMapClick);
    } else {
      kakao.maps.event.removeListener(map, 'click', onMapClick);
      btn.classList.remove('active');
      map.setCursor('');
      resetMeasure();
    }
  }

  function onMapClick(mouseEvent) {
    if (!drawing) return;
    const pos = mouseEvent.latLng;

    if (!clickLine) {
      // 첫 점
      clickLine = new kakao.maps.Polyline({
        map: map,
        path: [pos],
        strokeWeight: 3,
        strokeColor: '#db4040',
        strokeOpacity: 1,
        strokeStyle: 'solid'
      });
      lastPoint = pos;
      segCount = 0;
    } else {
      // 선 이어서 추가
      const path = clickLine.getPath();
      path.push(pos);
      clickLine.setPath(path);

      showSegmentDistance(lastPoint, pos);
      lastPoint = pos;
    }
  }

  function showSegmentDistance(from, to) {
    const poly = new kakao.maps.Polyline({ path: [from, to] });
    const dist = Math.round(poly.getLength());

    segCount++;
    const content = `<div class="dotOverlay">구간 ${segCount}: ${dist}m</div>`;

    segOverlay = new kakao.maps.CustomOverlay({
      position: to,
      content: content,
      yAnchor: 1
    });
    segOverlay.setMap(map);

    // 총 거리 표시
    const totalDist = Math.round(clickLine.getLength());
    const totalContent = `<div class="totalBox">총 거리: ${totalDist}m</div>`;

    if (totalOverlay) totalOverlay.setMap(null);
    totalOverlay = new kakao.maps.CustomOverlay({
      position: to,
      content: totalContent,
      yAnchor: 1
    });
    totalOverlay.setMap(map);
  }

  function resetMeasure() {
    if (clickLine) { clickLine.setMap(null); clickLine = null; }
    if (moveLine) { moveLine.setMap(null); moveLine = null; }
    if (segOverlay) { segOverlay.setMap(null); segOverlay = null; }
    if (totalOverlay) { totalOverlay.setMap(null); totalOverlay = null; }
    lastPoint = null;
    segCount = 0;
  }
})();
