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
      transition: transform 0.15s ease, border 0.15s ease; /* transition에 border 추가 */
    }
    .overlay-click {
      padding:5px 8px;
      background:rgba(255,255,255,0.70);
      border:1px solid #666;
      border-radius:5px;
      font-size:14px;
      white-space: nowrap;
      user-select: none;
      transition: transform 0.15s ease, border 0.15s ease; /* transition에 border 추가 */
    }
  `;
  document.head.appendChild(style);

  // === 전역 상태 (추가 및 수정) ===
  let zCounter = 100;
  let selectedMarker = null;
  let selectedOverlay = null;
  let clickStartTime = 0;
  let currentPolyline = null; 
  let groupPositions = {};    

  // === 마커 초기화 함수 ===
  window.initMarkers = function (map, positions) {
    const markers = [];
    const overlays = [];

    const normalHeight = 42;
    const hoverHeight = 50.4;
    const baseGap = 2;

    // Y 위치 계산
    const baseY = -(normalHeight + baseGap);
    const hoverY = -(hoverHeight + baseGap);
    const jumpY = -(70 + baseGap);

    // 마커 이미지 (기존 코드 유지)
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

    // 1. 그룹별 위치 사전 분류
    groupPositions = {};
    positions.forEach(p => {
        const groupKey = p.group ? String(p.group) : 'NO_GROUP';
        if (!groupPositions[groupKey]) {
            groupPositions[groupKey] = [];
        }
        groupPositions[groupKey].push(p.latlng);
    });

    // === 폴리라인 관련 함수 ===
    function removePolyline() {
        if (currentPolyline) {
            currentPolyline.setMap(null);
            currentPolyline = null;
        }
    }

    function drawPolylineForGroup(groupKey) {
        removePolyline(); 

        const path = groupPositions[groupKey];

        if (path && path.length >= 2) {
            currentPolyline = new kakao.maps.Polyline({
                map: map,
                path: path, 
                strokeWeight: 3, 
                strokeColor: '#FF0000', 
                strokeOpacity: 0.8, 
                strokeStyle: 'solid' 
            });
            console.log(`Polyline drawn for group: ${groupKey}`);
        }
    }

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
                marker.group = positions[i].group ? String(positions[i].group) : 'NO_GROUP';

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

                // === Hover (기존 코드 유지) ===
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

                    // 마우스 아웃 시 border를 '1px solid #ccc'으로 복원
                    if (marker === selectedMarker) {
                        marker.setImage(normalImage);
                        overlayContent.style.transform = `translateY(${baseY}px)`;
                        // 선택된 상태는 blue border를 유지해야 하므로, 복원하지 않음
                    } else {
                        marker.setImage(normalImage);
                        overlayContent.style.transform = `translateY(${baseY}px)`;
                        overlayContent.style.border = "1px solid #ccc"; // 미선택 마커의 오버레이 복원
                        if (map.getLevel() > 3) overlay.setMap(null);
                    }
                }

                kakao.maps.event.addListener(marker, "mouseover", activateHover);
                kakao.maps.event.addListener(marker, "mouseout", deactivateHover);
                overlayContent.addEventListener("mouseover", activateHover);
                overlayContent.addEventListener("mouseout", deactivateHover);

                // === Click (mousedown) - 오버레이 테두리 적용 ⭐ 수정 부분 ⭐ ===
                kakao.maps.event.addListener(marker, "mousedown", function () {
                    marker.setImage(jumpImage);
                    clickStartTime = Date.now();
                    overlayContent.style.transform = `translateY(${jumpY}px)`;
                    // mousedown 시 임시 테두리 적용
                    overlayContent.style.border = "2px solid rgba(0, 0, 0, 0.5)"; 
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
                        
                        // 2. 폴리라인 그리기
                        drawPolylineForGroup(marker.group);

                        // 3. 좌표 input 갱신 및 menu_wrap 필터 적용 (기존 로직 유지)
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

                        // 4. 현재 마커를 선택 상태로 지정 및 이미지 복귀
                        selectedMarker = marker;
                        marker.setImage(normalImage);

                        // 5. 오버레이를 정상 위치로 이동 및 강조 (파란색 테두리 적용)
                        overlay.setMap(map);
                        overlayContent.style.border = "2px solid blue";

                        overlayContent.style.transition = "transform 0.2s ease, border 0.2s ease";
                        overlayContent.style.transform = `translateY(${baseY}px)`; 

                        selectedOverlay = overlayContent;

                        // 6. zIndex 재조정
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
                    // 1. 폴리라인 그리기
                    drawPolylineForGroup(marker.group);
                    
                    // 2. 좌표 input 갱신 및 필터링 (기존 로직 유지)
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

                    // 3. 클릭 효과 동일 적용
                    if (selectedOverlay) {
                        selectedOverlay.style.border = "1px solid #ccc";
                    }

                    // 4. 마커 상태 업데이트
                    selectedMarker = marker;
                    marker.setImage(normalImage);

                    overlayContent.style.transition = "transform 0.2s ease, border 0.2s ease";
                    overlayContent.style.transform = `translateY(${baseY}px)`; 

                    overlayContent.style.border = "2px solid blue";
                    selectedOverlay = overlayContent;

                    // 5. zIndex 재조정
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
            setTimeout(createMarkerBatch, 0);
        } else {
             window.markers = markers;
             console.log("All markers created.");
        }
    }
    
    // 마커 생성 프로세스 시작
    createMarkerBatch();

    // 지도 레벨 이벤트 (기존 코드 유지)
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

    // 지도 클릭 → 선택 해제 및 폴리라인 제거 (기존 코드 유지)
    kakao.maps.event.addListener(map, "click", function () {
      if (selectedMarker) {
        selectedMarker.setImage(normalImage);
        selectedMarker = null;
      }
      if (selectedOverlay) {
        selectedOverlay.style.border = "1px solid #ccc";
        selectedOverlay = null;
      }
      // 폴리라인 제거
      removePolyline();
    });
  };
})();
