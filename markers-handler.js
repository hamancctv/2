// markers-handler.js
(function () {
  // 기본 스타일
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
    transform: scale(1.2);  /* ✅ 20% 확대 */
  }
  .overlay-click {
    padding:5px 8px;
    background:rgba(255,255,255,0.95);
    border:1px solid #666;
    border-radius:5px;
    font-size:13px;
    white-space: nowrap;
    user-select: none;
    transform: scale(1.2);  /* ✅ 클릭 오버레이도 동일하게 확대 */
  }
`;
  document.head.appendChild(style);

  // 전역 상태
  let zCounter = 100;          // zIndex 카운터
  let selectedMarker = null;   // 현재 클릭된 마커
  let selectedOverlay = null;  // 현재 강조된 오버레이
  let clickStartTime = 0;

  // 마커 초기화 함수
  window.initMarkers = function (map, positions) {
    const markers = [];
    const overlays = [];
    const clickOverlays = [];

    const normalHeight = 42;
    const hoverHeight = 50.4;
    const baseY = -(normalHeight + 2); // -44px
    const hoverY = -(hoverHeight + 2); // -54.4px

    // 마커 이미지
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
    const jumpImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(30, 42),             // normal 크기 그대로
      { offset: new kakao.maps.Point(15, 70) } // 점프 효과
    );

    for (let i = 0; i < positions.length; i++) {
      (function (i) {
        // 마커 생성
        const marker = new kakao.maps.Marker({
          map,
          position: positions[i].latlng,
          image: normalImage,
          clickable: true,
        });
        marker.group = positions[i].group ? String(positions[i].group) : null;

        // hover 오버레이
        const overlayContent = document.createElement("div");
        overlayContent.className = "overlay-hover";
        overlayContent.style.transform = `translateY(${baseY}px)`;
        overlayContent.textContent = positions[i].content;

        const overlay = new kakao.maps.CustomOverlay({
          position: positions[i].latlng,
          content: overlayContent,
          yAnchor: 1,
          map: null,
        });

        // 클릭 오버레이
        const clickOverlayContent = document.createElement("div");
        clickOverlayContent.className = "overlay-click";
        clickOverlayContent.style.transform = `translateY(${baseY}px)`;
        clickOverlayContent.textContent = positions[i].content;

        const clickOverlay = new kakao.maps.CustomOverlay({
          position: positions[i].latlng,
          content: clickOverlayContent,
          yAnchor: 1,
          map: null,
        });

        // === Hover ===
        function activateHover() {
          marker.__isMouseOver = true;
          zCounter++;
          marker.setZIndex(zCounter);
          overlay.setZIndex(zCounter);

          if (marker !== selectedMarker) marker.setImage(hoverImage);
          overlay.setMap(map);
          overlayContent.style.transform = `translateY(${hoverY}px)`;
        }

        function deactivateHover() {
          marker.__isMouseOver = false;
          if (marker !== selectedMarker) marker.setImage(normalImage);
          overlayContent.style.transform = `translateY(${baseY}px)`;
          if (map.getLevel() > 3) overlay.setMap(null);
        }

        kakao.maps.event.addListener(marker, "mouseover", activateHover);
        kakao.maps.event.addListener(marker, "mouseout", deactivateHover);
        overlayContent.addEventListener("mouseover", activateHover);
        overlayContent.addEventListener("mouseout", deactivateHover);

        // === Click ===
        kakao.maps.event.addListener(marker, "mousedown", function () {
          marker.setImage(jumpImage); // 점프 시작
          clickStartTime = Date.now();
        });

        kakao.maps.event.addListener(marker, "mouseup", function () {
          const elapsed = Date.now() - clickStartTime;
          const delay = Math.max(0, 100 - elapsed);

          setTimeout(function () {
            selectedMarker = marker;
            marker.setImage(normalImage); // normal 유지

            // 기존 강조 해제
            if (selectedOverlay) {
              selectedOverlay.style.transform = `translateY(${baseY}px)`;
              selectedOverlay.style.border = "1px solid #666";
            }

            // hover 오버레이 숨김
            overlay.setMap(null);

            // 클릭 오버레이 강조
            clickOverlay.setZIndex(zCounter);
            clickOverlay.setMap(map);
            clickOverlay.getContent().style.border = "2px solid blue";
            clickOverlay.getContent().style.transform =
              `translateY(${hoverY}px) scale(1.1)`;

            selectedOverlay = clickOverlay.getContent();

            // 좌표 input 업데이트
            const gpsyx = document.getElementById("gpsyx");
            if (gpsyx) {
              gpsyx.value =
                positions[i].latlng.getLat() + ", " + positions[i].latlng.getLng();
            }
          }, delay);
        });

        // === Overlay Click → 동일 효과 ===
        overlayContent.addEventListener("click", function () {
          // 좌표 업데이트 + 필터
          const lat = positions[i].latlng.getLat();
          const lng = positions[i].latlng.getLng();
          document.getElementById("gpsyx").value = lat + ", " + lng;

          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = positions[i].content;
          const nameText = (tempDiv.textContent || tempDiv.innerText || "").trim();
          const prefix = nameText.substring(0, 5).toUpperCase();
          document.getElementById("keyword").value = prefix;
          filter();

          // 기존 강조 해제
          if (selectedOverlay) {
            selectedOverlay.style.transform = `translateY(${baseY}px)`;
            selectedOverlay.style.border = "1px solid #666";
          }

          overlay.setMap(null);

          // 클릭 오버레이 강조
          clickOverlay.setZIndex(zCounter);
          clickOverlay.setMap(map);
          clickOverlay.getContent().style.border = "2px solid blue";
          clickOverlay.getContent().style.transform =
            `translateY(${hoverY}px) scale(1.1)`;

          selectedOverlay = clickOverlay.getContent();
        });

        markers.push(marker);
        overlays.push(overlay);
      })(i);
    }

    // 지도 레벨 이벤트
    kakao.maps.event.addListener(map, "idle", function () {
      const level = map.getLevel();
      overlays.forEach((o) => (level <= 3 ? o.setMap(map) : o.setMap(null)));
    });

    // 지도 클릭 → 선택 해제
    kakao.maps.event.addListener(map, "click", function () {
      if (selectedMarker) {
        selectedMarker.setImage(normalImage);
        selectedMarker = null;
      }
      if (selectedOverlay) {
        selectedOverlay.style.transform = `translateY(${baseY}px)`;
        selectedOverlay.style.border = "1px solid #666";
        selectedOverlay = null;
      }
    });

    window.markers = markers;
    return markers;
  };
})();
