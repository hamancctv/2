// markers-handler.js
(function () {
  // === 기본 스타일 정의 ===
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover {
      padding:2px 6px;
      background:rgba(255,255,255,0.80);
      border:1px solid #ccc;
      border-radius:5px;
      font-size:14px;
      white-space: nowrap;
      user-select: none;
      transition: transform 0.15s ease, border 0.15s ease;
    }
    .overlay-click {
      padding:5px 8px;
      background:rgba(255,255,255,0.90);
      border:1px solid #666;
      border-radius:5px;
      font-size:14px;
      white-space: nowrap;
      user-select: none;
      transition: transform 0.15s ease, border 0.15s ease;
    }
  `;
  document.head.appendChild(style);

  // === Z-Index 레이어 정의 ===
  const Z = {
    BASE: 100,        // 일반 마커/오버레이
    SELECT: 100000,   // 선택(클릭)된 마커/오버레이
    HOVER: 100010     // 호버 중(선택보다 위)
  };

  // === 전역 상태 ===
  let selectedMarker = null;
  let selectedOverlayEl = null;   // DOM element (content)
  let selectedOverlayObj = null;  // kakao.maps.CustomOverlay
  let clickStartTime = 0;

  // === 마커 초기화 함수 ===
  window.initMarkers = function (map, positions) {
    const markers = [];
    const overlays = [];

    const normalHeight = 42;
    const hoverHeight  = 50.4;
    const baseGap = 2;

    // Y 위치 계산
    const baseY  = -(normalHeight + baseGap); // -44px
    const hoverY = -(hoverHeight  + baseGap); // -52.4px
    const jumpY  = -(70           + baseGap); // -72px

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

    // === 마커 생성 배치 ===
    const batchSize = 50;
    let markerIndex = 0;

    function createMarkerBatch() {
      const start = markerIndex;
      const end = Math.min(positions.length, start + batchSize);

      for (let i = start; i < end; i++) {
        (function (i) {

          // --- 마커 생성 ---
          const marker = new kakao.maps.Marker({
            map,
            position: positions[i].latlng,
            image: normalImage,
            clickable: true,
            zIndex: Z.BASE
          });
          marker.group = positions[i].group ? String(positions[i].group) : null;

          // --- 오버레이 생성 ---
          const overlayContent = document.createElement("div");
          overlayContent.className = "overlay-hover";
          overlayContent.style.transform = `translateY(${baseY}px)`;
          overlayContent.textContent = positions[i].content;

          const overlay = new kakao.maps.CustomOverlay({
            position: positions[i].latlng,
            content: overlayContent,
            yAnchor: 1,
            map: null
          });
          overlay.setZIndex(Z.BASE);

          // 저장(복구용) z-index 슬롯
          marker.__prevZ = Z.BASE;
          overlay.__prevZ = Z.BASE;

          // === Hover 핸들러 ===
          function activateHover() {
            // 호버 시 이미지/표시
            marker.setImage(hoverImage);
            overlay.setMap(map);

            if (marker === selectedMarker) {
              // 선택 마커 호버: gap=4 유지
              overlayContent.style.transform = `translateY(${hoverY - 2}px)`;
              // z는 선택 레이어 유지
              setSelectZ(marker, overlay);
            } else {
              // 비선택 마커 호버: 선택보다 위(HOVER 레이어)
              overlayContent.style.transform = `translateY(${hoverY}px)`;

              marker.__prevZ = marker.getZIndex();
              overlay.__prevZ = overlay.getZIndex();

              marker.setZIndex(Z.HOVER + 1);
              overlay.setZIndex(Z.HOVER);
            }
          }

          function deactivateHover() {
            marker.setImage(normalImage);

            if (marker === selectedMarker) {
              // 선택 마커: gap=4 유지 + 선택 레이어로 복귀 확보
              overlayContent.style.transform = `translateY(${baseY - 2}px)`;
              overlayContent.style.border = "2px solid blue";
              setSelectZ(marker, overlay);
            } else {
              // 비선택 마커: 원래 위치/표시로 복구
              overlayContent.style.transform = `translateY(${baseY}px)`;

              // 줌 조건에 따라 숨김
              if (map.getLevel() > 3) overlay.setMap(null);

              // zIndex 복원
              marker.setZIndex(marker.__prevZ ?? Z.BASE);
              overlay.setZIndex(overlay.__prevZ ?? Z.BASE);

              // 선택된 마커가 있으면 다시 최상위 보장
              if (selectedMarker && selectedOverlayObj) {
                setSelectZ(selectedMarker, selectedOverlayObj);
              }
            }
          }

          kakao.maps.event.addListener(marker, "mouseover", activateHover);
          kakao.maps.event.addListener(marker, "mouseout",  deactivateHover);
          overlayContent.addEventListener("mouseover", activateHover);
          overlayContent.addEventListener("mouseout",  deactivateHover);

          // === Click (mousedown) ===
          kakao.maps.event.addListener(marker, "mousedown", function () {
            marker.setImage(jumpImage);
            clickStartTime = Date.now();

            // 이전 선택 해제(외형만)
            if (selectedOverlayEl) {
              selectedOverlayEl.style.border = "1px solid #ccc";
            }
            if (selectedMarker && selectedMarker !== marker) {
              // 이전 선택 z를 BASE로 내려놓기
              selectedMarker.setZIndex(Z.BASE);
              if (selectedOverlayObj) selectedOverlayObj.setZIndex(Z.BASE);
            }

            // 현재 선택 지정
            selectedMarker     = marker;
            selectedOverlayEl  = overlayContent;
            selectedOverlayObj = overlay;

            // 선택 스타일 + gap=4
            overlayContent.style.border = "2px solid blue";
            overlayContent.style.transform = `translateY(${baseY - 2}px)`;
            overlay.setMap(map);

            // 선택 레이어로 고정
            setSelectZ(marker, overlay);

            // 점프 시에도 gap=4 유지
            overlayContent.style.transform = `translateY(${jumpY - 2}px)`;
          });

          // === Click (mouseup) ===
          kakao.maps.event.addListener(marker, "mouseup", function () {
            const elapsed = Date.now() - clickStartTime;
            const delay = Math.max(0, 100 - elapsed);

            setTimeout(function () {
              // 좌표/필터 갱신 (기존 로직 유지)
              const lat = positions[i].latlng.getLat();
              const lng = positions[i].latlng.getLng();
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = positions[i].content;
              const nameText = (tempDiv.textContent || tempDiv.innerText || "").trim();
              const prefix = nameText.substring(0, 5).toUpperCase();

              const gpsyx  = document.getElementById("gpsyx");
              const keyword= document.getElementById("keyword");
              if (gpsyx)   gpsyx.value   = `${lat}, ${lng}`;
              if (keyword) keyword.value = prefix;
              if (typeof filter === 'function') filter();

              // 선택 상태 유지: normal 이미지 + gap=4 + 최상위 보장
              marker.setImage(normalImage);
              overlayContent.style.border = "2px solid blue";
              overlayContent.style.transition = "transform 0.2s ease, border 0.2s ease";
              overlayContent.style.transform = `translateY(${baseY - 2}px)`;

              setSelectZ(marker, overlay);
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

    // 지도 레벨 이벤트: 비선택 오버레이는 level<=3에서만 표시
    kakao.maps.event.addListener(map, "idle", function () {
      const level = map.getLevel();
      overlays.forEach((o) => {
        if (o.getContent && o.getContent() === selectedOverlayEl) {
          o.setMap(map); // 선택은 항상 표시
          setSelectZ(selectedMarker, o);
        } else {
          level <= 3 ? o.setMap(map) : o.setMap(null);
        }
      });
    });

    // 지도 클릭 → 선택 해제
    kakao.maps.event.addListener(map, "click", function () {
      clearSelection();
    });

    // === 유틸: 선택 레이어 고정 ===
    function setSelectZ(marker, overlay) {
      if (!marker || !overlay) return;
      marker.setZIndex(Z.SELECT + 1);
      overlay.setZIndex(Z.SELECT);
    }

    // === 유틸: 선택 해제 ===
    function clearSelection() {
      if (selectedMarker) {
        selectedMarker.setImage(normalImage);
        selectedMarker.setZIndex(Z.BASE);
        selectedMarker = null;
      }
      if (selectedOverlayEl) {
        selectedOverlayEl.style.border = "1px solid #ccc";
        selectedOverlayEl = null;
      }
      if (selectedOverlayObj) {
        // 줌 레벨에 따라 표시/숨김 재적용
        if (map.getLevel() > 3) selectedOverlayObj.setMap(null);
        selectedOverlayObj.setZIndex(Z.BASE);
        selectedOverlayObj = null;
      }
    }
  };
})();
