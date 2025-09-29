// markers-handler.js
(function () {
  // === 기본 스타일 정의 ===
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover {
      padding:2px 6px;
      background:rgba(255,255,255,0.70);
      border:1px solid #ccc;
      border-radius:5px;
      font-size:14px;
      white-space: nowrap;
      user-select: none;
      transition: transform 0.15s ease;
    }
    .overlay-click {
      padding:5px 8px;
      background:rgba(255,255,255,0.70);
      border:1px solid #666;
      border-radius:5px;
      font-size:14px;
      white-space: nowrap;
      user-select: none;
      transition: transform 0.15s ease;
    }
  `;
  document.head.appendChild(style);

  // === 전역 상태 ===
  let zCounter = 100;
  let selectedMarker = null;
  let selectedOverlay = null;
  let clickStartTime = 0;

  // === 마커 초기화 함수 ===
  window.initMarkers = function (map, positions) {
    const markers = [];
    const overlays = [];

    const normalHeight = 42;
    const hoverHeight = 50.4;
    const baseGap = 2;

    // Y 위치 계산
    const baseY = -(normalHeight + baseGap); // -44px
    const hoverY = -(hoverHeight + baseGap); // -52.4px
    const jumpY = -(70 + baseGap);           // -72px

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
      new kakao.maps.Size(30, 42),
      { offset: new kakao.maps.Point(15, 70) }
    );

    // === 마커 생성 루프 (비동기 배치 처리) ===
    const batchSize = 50; 
    let markerIndex = 0;

    function createMarkerBatch() {
      const start = markerIndex;
      const end = Math.min(positions.length, start + batchSize);

      for (let i = start; i < end; i++) {
        (function (i) {
          const marker = new kakao.maps.Marker({
            map,
            position: positions[i].latlng,
            image: normalImage,
            clickable: true,
            zIndex: zCounter + 1,
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

          // === Hover ===
          function activateHover() {
            marker.__isMouseOver = true;
            zCounter++;
            marker.setZIndex(zCounter + 1);
            overlay.setZIndex(zCounter);

            marker.setImage(hoverImage);
            overlay.setMap(map);
            overlayContent.style.transform = `translateY(${hoverY}px)`;
          }

          function deactivateHover() {
            marker.__isMouseOver = false;
            if (marker === selectedMarker) {
              marker.setImage(normalImage);
              overlayContent.style.transform = `translateY(${baseY - 1}px)`; // 선택된 마커 gap=3 유지
            } else {
              marker.setImage(normalImage);
              overlayContent.style.transform = `translateY(${baseY}px)`;
              if (map.getLevel() > 3) overlay.setMap(null);
            }
          }

          kakao.maps.event.addListener(marker, "mouseover", activateHover);
          kakao.maps.event.addListener(marker, "mouseout", deactivateHover);
          overlayContent.addEventListener("mouseover", activateHover);
          overlayContent.addEventListener("mouseout", deactivateHover);

          // === Click (mousedown) ===
          kakao.maps.event.addListener(marker, "mousedown", function () {
            marker.setImage(jumpImage);
            clickStartTime = Date.now();

            // 기존 선택 해제
            if (selectedOverlay) {
              selectedOverlay.style.border = "1px solid #ccc";
            }

            // 현재 선택
            selectedMarker = marker;
            selectedOverlay = overlayContent;

            // ✅ 테두리 즉시 적용 + gap=3
            overlayContent.style.border = "2px solid blue";
            overlayContent.style.transform = `translateY(${baseY - 1}px)`;

            overlay.setMap(map);

            // 점프 시에도 gap=3 유지
            overlayContent.style.transform = `translateY(${jumpY - 1}px)`;
          });

          // === Click (mouseup) ===
          kakao.maps.event.addListener(marker, "mouseup", function () {
            const elapsed = Date.now() - clickStartTime;
            const delay = Math.max(0, 100 - elapsed);

            setTimeout(function () {
              // 좌표 input 갱신 및 필터링 로직
              const lat = positions[i].latlng.getLat();
              const lng = positions[i].latlng.getLng();
              document.getElementById("gpsyx").value = lat + ", " + lng;

              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = positions[i].content;
              const nameText = (tempDiv.textContent || tempDiv.innerText || "").trim();
              const prefix = nameText.substring(0, 5).toUpperCase();
              document.getElementById("keyword").value = prefix;
              if (typeof filter === 'function') {
                filter();
              }

              // ✅ 테두리 유지 + gap=3 복귀
              marker.setImage(normalImage);
              overlayContent.style.border = "2px solid blue";
              overlayContent.style.transition = "transform 0.2s ease, border 0.2s ease";
              overlayContent.style.transform = `translateY(${baseY - 1}px)`;

              zCounter++;
              marker.setZIndex(zCounter + 1);
              overlay.setZIndex(zCounter);

              setTimeout(() => {
                overlayContent.style.transition = "transform 0.15s ease, border 0.15s ease";
              }, 200);
            }, delay);
          });

          markers.push(marker);
          overlays.push(overlay);
        })(i);
      }

      markerIndex = end;
      if (markerIndex < positions.length) {
        setTimeout(createMarkerBatch, 0);
      } else {
        window.markers = markers;
        console.log("All markers created.");
      }
    }

    createMarkerBatch();

    // 지도 레벨 이벤트
    kakao.maps.event.addListener(map, "idle", function () {
      const level = map.getLevel();
      overlays.forEach((o) => {
        if (o.getContent() === selectedOverlay) {
          o.setMap(map);
        } else {
          level <= 3 ? o.setMap(map) : o.setMap(null);
        }
      });
    });

    // 지도 클릭 → 선택 해제
    kakao.maps.event.addListener(map, "click", function () {
      if (selectedMarker) {
        selectedMarker.setImage(normalImage);
        selectedMarker = null;
      }
      if (selectedOverlay) {
        selectedOverlay.style.border = "1px solid #ccc";
        selectedOverlay = null;
      }
    });
  };
})();
