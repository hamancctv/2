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
    const baseY = -(normalHeight + baseGap); // -44px (클릭 해제 시 최종 위치)
    const hoverY = -(hoverHeight + baseGap); // -52.4px (호버 시 오버레이 위치)
    const jumpY = -(70 + baseGap);           // -72px (클릭/점프 시 오버레이 위치)

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

                    // ⭐ 선택된 마커일지라도 호버 시 hoverImage 적용
                    marker.setImage(hoverImage);

                    overlay.setMap(map);
                    overlayContent.style.transform = `translateY(${hoverY}px)`;
                }

                function deactivateHover() {
                    marker.__isMouseOver = false;

                    if (marker === selectedMarker) {
                        // 선택된 마커: normalImage로 복귀, 오버레이는 baseY 위치 유지
                        marker.setImage(normalImage);
                        overlayContent.style.transform = `translateY(${baseY}px)`;
                    } else {
                        // 미선택 마커: normalImage로 복귀, 줌 레벨에 따라 숨김
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
                    overlayContent.style.transform = `translateY(${jumpY}px)`;
                });

                // === Click (mouseup) - 핵심 로직 및 필터링 복구 ===
                kakao.maps.event.addListener(marker, "mouseup", function () {
                    const elapsed = Date.now() - clickStartTime;
                    const delay = Math.max(0, 100 - elapsed);

                    setTimeout(function () {
                        // 1. 기존 강조 해제
                        if (selectedOverlay) {
                            selectedOverlay.style.border = "1px solid #ccc";
                        }

                        // ⭐ 좌표 input 갱신 및 menu_wrap 필터 적용 (복구) ⭐
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
                        // ⭐ 필터링 로직 끝 ⭐

                        // 2. 현재 마커를 선택 상태로 지정 및 이미지 복귀
                        selectedMarker = marker;
                        marker.setImage(normalImage);

                        // 3. 오버레이를 정상 위치로 이동 및 강조
                        overlay.setMap(map);
                        overlayContent.style.border = "2px solid blue";

                        overlayContent.style.transition = "transform 0.2s ease, border 0.2s ease";
                        overlayContent.style.transform = `translateY(${baseY}px)`; // -44px로 복귀

                        selectedOverlay = overlayContent;

                        // 4. zIndex 재조정
                        zCounter++;
                        marker.setZIndex(zCounter + 1);
                        overlay.setZIndex(zCounter);

                        setTimeout(() => {
                            overlayContent.style.transition = "transform 0.15s ease, border 0.15s ease";
                        }, 200);
                    }, delay);
                });

                // === Overlay Click ===
                overlayContent.addEventListener("click", function () {
                    // 좌표 input 갱신 및 필터링 (기존 로직 유지)
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

                    // 클릭 효과 동일 적용
                    if (selectedOverlay) {
                        selectedOverlay.style.border = "1px solid #ccc";
                    }

                    // 마커 상태 업데이트
                    selectedMarker = marker;
                    marker.setImage(normalImage);

                    overlayContent.style.transition = "transform 0.2s ease, border 0.2s ease";
                    overlayContent.style.transform = `translateY(${baseY}px)`; // -44px로 복귀

                    overlayContent.style.border = "2px solid blue";
                    selectedOverlay = overlayContent;

                    // zIndex 재조정
                    zCounter++;
                    marker.setZIndex(zCounter + 1);
                    overlay.setZIndex(zCounter);
                    overlay.setMap(map);

                    setTimeout(() => {
                        overlayContent.style.transition = "transform 0.15s ease, border 0.15s ease";
                    }, 200);
                });

                markers.push(marker);
                overlays.push(overlay);
            })(i);
        }

        markerIndex = end;
        if (markerIndex < positions.length) {
            // 다음 배치를 다음 이벤트 루프에 예약
            setTimeout(createMarkerBatch, 0);
        } else {
             // 모든 마커 생성이 완료된 후 전역 변수 등록
             window.markers = markers;
             console.log("All markers created.");
        }
    }
    
    // 마커 생성 프로세스 시작
    createMarkerBatch();

    // 지도 레벨 이벤트 (유지)
    kakao.maps.event.addListener(map, "idle", function () {
      const level = map.getLevel();
      overlays.forEach((o) => {
        // 선택된 마커의 오버레이는 레벨에 관계없이 항상 표시
        if (o.getContent() === selectedOverlay) {
          o.setMap(map);
        } else {
          level <= 3 ? o.setMap(map) : o.setMap(null);
        }
      });
    });

    // 지도 클릭 → 선택 해제 (유지)
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

    // 마커 배열을 반환하지 않고, 비동기 처리가 끝나면 window.markers에 할당됨
    // return markers; // 비동기 로직에서는 즉시 반환하지 않습니다.
  };
})();
