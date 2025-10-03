// roadview.js
function initRoadview(map, mapCenter) {
  const style = document.createElement("style");
  style.textContent = `
  #rvWrapper {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 0;
    display: none;
  }
  .view_roadview #rvWrapper { display: block; z-index: 1; }
  .view_roadview #mapWrapper {
    position: absolute;
    bottom: 0; left: 0;
    width: 25%; height: 25%;
    min-width: 200px; min-height: 150px;
    z-index: 2;
    border: 2px solid #ccc;
    border-radius: 6px;
    background: #fff;
  }
  #roadviewControl {
    position:absolute;top:2px;left:115px;width:42px;height:42px;
    z-index: 1;cursor: pointer;
    background: url(https://t1.daumcdn.net/localimg/localimages/07/2018/pc/common/img_search.png) 0 -450px no-repeat;
  }
  #roadviewControl.active { background-position:0 -350px; }
  #close {
    position: absolute;padding: 4px;top: 49px;left: 5px;cursor: pointer;
    background: #fff;border-radius: 4px;border: 1px solid #c8c8c8;box-shadow: 0px 1px #888;
  }
  #close .img {
    display: block;
    background: url(https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/rv_close.png) no-repeat;
    width: 14px;height: 14px;
  }
  `;
  document.head.appendChild(style);

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

  kakao.maps.event.addListener(rv, 'position_changed', () => {
    const pos = rv.getPosition();
    if (overlayOn) rvMarker.setPosition(pos);
  });

  kakao.maps.event.addListener(map, 'click', (mouseEvent) => {
    if (!overlayOn) return;
    const latlng = mouseEvent.latLng;
    rvMarker.setPosition(latlng);
    rvClient.getNearestPanoId(latlng, 50, (panoId) => {
      if (panoId) rv.setPanoId(panoId, latlng);
    });
  });

  function toggleOverlay(active) {
    if (active) {
      overlayOn = true;
      document.getElementById('container').classList.add('view_roadview');
      rvMarker.setMap(map);
      rvMarker.setPosition(map.getCenter());
      rvClient.getNearestPanoId(map.getCenter(), 50, (panoId) => {
        if (panoId) rv.setPanoId(panoId, map.getCenter());
      });
    } else {
      overlayOn = false;
      document.getElementById('container').classList.remove('view_roadview');
      rvMarker.setMap(null);
    }
  }

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

  window.closeRoadview = function () {
    toggleOverlay(false);
  };
}
