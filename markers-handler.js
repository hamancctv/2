// markers-handler.js
(function() {
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover {
      padding:2px 6px;
      background:rgba(255,255,255,0.9);
      border:1px solid #ccc;
      border-radius:5px;
      font-size:12px;
      white-space: nowrap;
      user-select: none;
      transition: transform 0.15s ease;
    }
    .overlay-click {
      padding:5px 8px;
      background:rgba(255,255,255,0.95);
      border:1px solid #666;
      border-radius:5px;
      font-size:13px;
      white-space: nowrap;
      user-select: none;
    }
  `;
  document.head.appendChild(style);

  // 마커 초기화 함수
  window.initMarkers = function(map, positions) {
    const markers = [];
    const overlays = [];
    const clickOverlays = [];
    const markerHeight = 42;

    // 마커 이미지 (normal / hover / click)
    const normalImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(30, 42),
      { offset: new kakao.maps.Point(15, 42) }
    );
    const hoverImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(36, 50.4),
      { offset: new kakao.maps.Point(18, 50.4) }
    );
    const clickImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(36, 50.4),
      { offset: new kakao.maps.Point(18, 70.4) } // 점프 효과
    );

    let selectedMarker = null;
    let clickStartTime = 0;

    for (let i = 0; i < positions.length; i++) {
      (function(i) {
        const marker = new kakao.maps.Marker({
          map: map,
          position: positions[i].latlng,
          image: normalImage,
          clickable: true
        });

        // hover overlay
        const overlayId = `overlay-${i}`;
        const overlay = new kakao.maps.CustomOverlay({
          position: positions[i].latlng,
          content: `<div class="overlay-hover" id="${overlayId}" style="transform:translateY(-44px)">${positions[i].content}</div>`,
          yAnchor: 1,
          map: null
        });

        // click overlay
        const clickOverlay = new kakao.maps.CustomOverlay({
          position: positions[i].latlng,
          content: `<div class="overlay-click">${positions[i].content}</div>`,
          yAnchor: 1,
          map: null
        });

        // hover 이벤트
        kakao.maps.event.addListener(marker, "mouseover", function() {
          marker.__isMouseOver = true;
          if (marker !== selectedMarker) marker.setImage(hoverImage);
          if (map.getLevel() > 3 && !overlay.getMap()) overlay.setMap(map);

          // 오버레이 위치 위로 +2px (기본 -44px → -54.4px)
          const el = document.getElementById(overlayId);
          if (el) el.style.transform = "translateY(-54.4px)";
        });

        kakao.maps.event.addListener(marker, "mouseout", function() {
          marker.__isMouseOver = false;
          if (marker !== selectedMarker) marker.setImage(normalImage);
          if (map.getLevel() > 3) setTimeout(() => overlay.setMap(null), 50);

          // 오버레이 원위치 (기본 -44px)
          const el = document.getElementById(overlayId);
          if (el) el.style.transform = "translateY(-44px)";
        });

        // click 이벤트 (mousedown + mouseup 분리)
        kakao.maps.event.addListener(marker, "mousedown", function() {
          // 다른 선택 마커 초기화
          if (selectedMarker && selectedMarker !== marker) {
            selectedMarker.setImage(normalImage);
          }

          // 기존 클릭 오버레이 제거
          clickOverlays.forEach(ov => ov.setMap(null));
          clickOverlays.length = 0;

          marker.setImage(clickImage); // 점프
          selectedMarker = marker;
          clickStartTime = Date.now();
        });

        kakao.maps.event.addListener(marker, "mouseup", function() {
          const elapsed = Date.now() - clickStartTime;
          const delay = Math.max(0, 100 - elapsed); // 최소 0.1초 보장
          setTimeout(function() {
            if (marker === selectedMarker) {
              if (marker.__isMouseOver) {
                marker.setImage(hoverImage); // hover 유지
              } else {
                marker.setImage(normalImage); // 아니면 normal
              }
              // 클릭 오버레이 표시
              clickOverlay.setMap(map);
              clickOverlays.push(clickOverlay);

              // 좌표 input 업데이트
              const gpsyx = document.getElementById("gpsyx");
              if (gpsyx) {
                gpsyx.value = positions[i].latlng.getLat() + ", " + positions[i].latlng.getLng();
              }
            }
          }, delay);
        });

        markers.push(marker);
        overlays.push(overlay);
      })(i);
    }

    // 지도 레벨 이벤트 (자동 표시/숨김)
    kakao.maps.event.addListener(map, "idle", function() {
      const level = map.getLevel();
      overlays.forEach(o => {
        if (level <= 3) o.setMap(map);
        else o.setMap(null);
      });
    });

    // 지도 클릭 → 선택 해제
    kakao.maps.event.addListener(map, "click", function() {
      if (selectedMarker) {
        selectedMarker.setImage(normalImage);
        selectedMarker = null;
      }
      clickOverlays.forEach(ov => ov.setMap(null));
      clickOverlays.length = 0;

      // 모든 오버레이 위치 원래대로
      overlays.forEach((o, idx) => {
        const el = document.getElementById(`overlay-${idx}`);
        if (el) el.style.transform = "translateY(-44px)";
      });
    });

    // markers 배열 전역에 저장해서 그룹 선 연결에서 접근 가능
    window.markers = markers;

    return markers;
  };
})();
