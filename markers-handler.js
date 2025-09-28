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
      transition: transform 0.2s ease;
    }
    .overlay-hover.active {
      transform: scale(1.2);
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

  let zCounter = 100; // zIndex 관리용

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
        const overlayContent = document.createElement("div");
        overlayContent.className = "overlay-hover";
        overlayContent.style.transform = `translateY(-${markerHeight}px)`;
        overlayContent.innerText = positions[i].content;

        const overlay = new kakao.maps.CustomOverlay({
          position: positions[i].latlng,
          content: overlayContent,
          yAnchor: 1,
          map: null
        });

        // click overlay
        const clickOverlay = new kakao.maps.CustomOverlay({
          position: positions[i].latlng,
          content: `<div class="overlay-click" style="transform:translateY(-${markerHeight}px)">${positions[i].content}</div>`,
          yAnchor: 1,
          map: null
        });

        // hover 활성화
        function activateHover() {
          zCounter++;
          marker.setImage(hoverImage);
          marker.setZIndex(zCounter);

          overlay.setZIndex(zCounter);
          overlay.setMap(map);
          overlayContent.classList.add("active");
        }

        // hover 해제
        function deactivateHover() {
          if (marker !== selectedMarker) {
            marker.setImage(normalImage);
          }
          overlayContent.classList.remove("active");

          if (map.getLevel() > 3) {
            overlay.setMap(null); // 레벨 4 이상에서는 마우스 아웃 시 자동 숨김
          }
        }

        // 마커 이벤트
        kakao.maps.event.addListener(marker, "mouseover", activateHover);
        kakao.maps.event.addListener(marker, "mouseout", deactivateHover);

        // 오버레이도 hover 적용
        overlayContent.addEventListener("mouseover", activateHover);
        overlayContent.addEventListener("mouseout", deactivateHover);

        // click 이벤트 (mousedown + mouseup 분리)
        kakao.maps.event.addListener(marker, "mousedown", function() {
          if (selectedMarker && selectedMarker !== marker) {
            selectedMarker.setImage(normalImage);
          }

          clickOverlays.forEach(ov => ov.setMap(null));
          clickOverlays.length = 0;

          marker.setImage(clickImage);
          selectedMarker = marker;
          clickStartTime = Date.now();
        });

        kakao.maps.event.addListener(marker, "mouseup", function() {
          const elapsed = Date.now() - clickStartTime;
          const delay = Math.max(0, 100 - elapsed);

          setTimeout(function() {
            if (marker === selectedMarker) {
              if (marker.__isMouseOver) {
                marker.setImage(hoverImage);
              } else {
                marker.setImage(normalImage);
              }
              clickOverlay.setMap(map);
              clickOverlays.push(clickOverlay);

              document.getElementById("gpsyx").value =
                positions[i].latlng.getLat() + ", " + positions[i].latlng.getLng();
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

    // 지도 클릭 → 선택 해제 (레벨 3 이하일 때만 리셋)
    kakao.maps.event.addListener(map, "click", function() {
      const level = map.getLevel();

      if (selectedMarker) {
        selectedMarker.setImage(normalImage);
        selectedMarker = null;
      }
      clickOverlays.forEach(ov => ov.setMap(null));
      clickOverlays.length = 0;

      if (level <= 3) {
        overlays.forEach(o => {
          const content = o.getContent();
          if (content && content.classList) {
            content.classList.remove("active");
          }
        });
        markers.forEach(m => {
          m.setImage(normalImage);
        });
      }
    });

    // 🔑 전역 등록 (그룹 선 연결 항상 가능)
    window.markers = markers;

    return markers;
  };
})();
