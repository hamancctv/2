// roadview.js
function initRoadview(map, mapCenter) {
  const rv = new kakao.maps.Roadview(document.getElementById('roadview'));
  const rvClient = new kakao.maps.RoadviewClient();
  let overlayOn = false;

  const rvMarker = new kakao.maps.Marker({
    image: new kakao.maps.MarkerImage(
      'https://t1.daumcdn.net/localimg/localimages/07/2018/pc/roadview_minimap_wk_2018.png',
      new kakao.maps.Size(26, 46),
      {
        spriteSize: new kakao.maps.Size(1666, 168),
        spriteOrigin: new kakao.maps.Point(705, 114),
        offset: new kakao.maps.Point(13, 46)
      }
    ),
    position: mapCenter,
    draggable: true
  });

  // 로드뷰 위치 변경 시 마커 동기화
  kakao.maps.event.addListener(rv, 'position_changed', function () {
    const pos = rv.getPosition();
    if (overlayOn) rvMarker.setPosition(pos);
  });

  // 지도 클릭 시 로드뷰 이동
  kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
    if (!overlayOn) return;
    const latlng = mouseEvent.latLng;
    rvMarker.setPosition(latlng);
    rvClient.getNearestPanoId(latlng, 50, function (panoId) {
      if (panoId) rv.setPanoId(panoId, latlng);
    });
  });

  function toggleOverlay(active) {
    if (active) {
      overlayOn = true;
      document.getElementById('container').classList.add('view_roadview');
      rvMarker.setMap(map);
      rvMarker.setPosition(map.getCenter());
      rvClient.getNearestPanoId(map.getCenter(), 50, function (panoId) {
        if (panoId) rv.setPanoId(panoId, map.getCenter());
      });
    } else {
      overlayOn = false;
      document.getElementById('container').classList.remove('view_roadview');
      rvMarker.setMap(null);
    }
  }

  // 토글 버튼
  window.setRoadviewRoad = function () {
    const c = document.getElementById('roadviewControl');
    if (c.classList.contains('active')) {
      c.classList.remove('active');
      toggleOverlay(false);
    } else {
      c.classList.add('active');
      toggleOverlay(true);
    }
  };

  // 닫기 버튼
  window.closeRoadview = function () {
    const c = document.getElementById('roadviewControl');
    c.classList.remove('active');
    toggleOverlay(false);
  };
}
// roadview.js 마지막에 추가
document.getElementById("roadviewControl").addEventListener("click", setRoadviewRoad);
