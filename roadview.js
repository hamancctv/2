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

  kakao.maps.event.addListener(rv, 'position_changed', function () {
    const pos = rv.getPosition();
    if (overlayOn) rvMarker.setPosition(pos);
  });

  // 로드뷰 토글 함수
  window.setRoadviewRoad = function () {
    const c = document.getElementById('roadviewControl');
    if (c.classList.contains('active')) {
      c.classList.remove('active');
      overlayOn = false;
      rvMarker.setMap(null);
    } else {
      c.classList.add('active');
      overlayOn = true;
      rvMarker.setMap(map);
      rvMarker.setPosition(map.getCenter());
      rvClient.getNearestPanoId(map.getCenter(), 50, function (panoId) {
        if (panoId) rv.setPanoId(panoId, map.getCenter());
      });
    }
  };

  window.closeRoadview = function () {
    overlayOn = false;
    document.getElementById('roadviewControl').classList.remove('active');
    rvMarker.setMap(null);
  };
}
