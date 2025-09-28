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

    // === 마커 생성 루프 ===
    for (let i = 0; i < positions.length; i++) {
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

          marker.setImage(hoverImage); // 선택된 마커일지라도 호버 시 hoverImage 적용

          overlay.setMap(map);
          overlayContent.style.transform = `translateY(${hoverY}px)`; // 호버 위치로 이동 (-52.4px)
        }

        function deactivateHover() {
          marker.__isMouseOver = false;

          if (marker === selectedMarker) {
            // 선택된 마커일 경우: normalImage로만 복귀시키고, 오버레이는 baseY 위치 유지 (선택 스타일 유지)
            marker.setImage(normalImage);
            overlayContent.style.transform = `translateY(${baseY}px)`; // 정상 위치로 복귀 (-44px)
          } else {
            // 미선택 마커일 경우: normalImage로 복귀, 오버레이는 baseY 위치로 이동, 줌 레벨에 따라 숨김
            marker.setImage(normalImage);
            overlayContent.style.transform = `translateY(${baseY}px)`; // 정상 위치로 복귀 (-44px)
            if (map.getLevel() > 3) overlay.setMap(null);
          }
        }

        kakao.maps.event.addListener(marker, "mouseover", activateHover);
        kakao.maps.event.addListener(marker, "mouseout", deactivateHover);
        overlayContent.addEventListener("mouseover", activateHover);
        overlayContent.addEventListener("mouseout", deactivateHover);

        // === Click ===
        kakao.maps.event.addListener(marker, "mousedown", function () {
          marker.setImage(jumpImage); // 점프 시작
          clickStartTime = Date.now();

          // 오버레이도 점프 위치 (-72px)
          overlayContent.style.transform = `translateY(${jumpY}px)`;
        });

        kakao.maps.event.addListener(marker, "mouseup", function () {
          const elapsed = Date.now() - clickStartTime;
          const delay = Math.max(0, 100 - elapsed);

          setTimeout(function () {
            // 1. 기존 강조 해제
            if (selectedOverlay) {
              selectedOverlay.style.border = "1px solid #ccc";
            }

            // ⭐ 복구된 필터링 로직 시작 ⭐
            // 좌표 input 갱신
            const lat = positions[i].latlng.getLat();
            const lng = positions[i].latlng.getLng();
            document.getElementById("gpsyx").value = lat + ", " + lng;

            // menu_wrap 필터 적용
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = positions[i].content;
            const nameText = (tempDiv.textContent || tempDiv.innerText || "").trim();
            const prefix = nameText.substring(0, 5).toUpperCase();
            document.getElementById("keyword").value = prefix;
            if (typeof filter === 'function') {
                filter();
            }
            // ⭐ 복구된 필터링 로직 끝 ⭐

            // 2. 현재 마커를 선택 상태로 지정 및 이미지 복귀
            selectedMarker = marker;
            marker.setImage(normalImage);

            // 3. 오버레이를 정상 위치 (baseY: -44px)로 이동 및 강조
            overlay.setMap(map);
            overlayContent.style.border = "2px solid blue";

            overlayContent.style.transition = "transform 0.2s ease, border 0.2s ease";
            overlayContent.style.transform = `translateY(${baseY}px)`; // 정상 위치로 복귀 (-44px)

            selectedOverlay = overlayContent;

            // 4. zIndex 재조정 (선택된 요소 맨 앞으로)
            zCounter++;
            marker.setZIndex(zCounter + 1);
            overlay.setZIndex(zCounter);

            setTimeout(() => {
              // 원래의 transition 설정으로 복구
              overlayContent.style.transition = "transform 0.15s ease, border 0.15s ease";
            }, 200);
          }, delay);
        });

        // === Overlay Click → 마커와 동일 효과 (이곳은 이미 필터링 로직이 있었음) ===
        overlayContent.addEventListener("click", function () {
          // 좌표 input 갱신
          const lat = positions[i].latlng.getLat();
          const lng = positions[i].latlng.getLng();
          document.getElementById("gpsyx").value = lat + ", " + lng;

          // menu_wrap 필터 적용
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
          overlayContent.style.transform = `translateY(${baseY}px)`; // 정상 위치로 복귀 (-44px)

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

    // 지도 레벨 이벤트
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

    // 전역 등록
    window.markers = markers;
    return markers;
  };
})();
