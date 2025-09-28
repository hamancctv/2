// markers-handler.js
/* markers-handler.js 상단 스타일 정의 부분에 추가 */
.overlay-hover, .overlay-click {
    /* 하드웨어 가속 활성화 */
    will-change: transform; 
    /* 미세한 성능 개선 */
    transform: translateZ(0); 
}
(function () {
  // === 기본 스타일 정의 ===
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover {
      padding:2px 6px;
      background:rgba(255,255,255,0.90); /* ✅ 투명도 조금 더 높임 */
      border:1px solid #ccc;
      border-radius:5px;
      font-size:14px;
      white-space: nowrap;
      user-select: none;
      transition: transform 0.15s ease;
    }
    .overlay-click {
      padding:5px 8px;
      background:rgba(255,255,255,0.90);
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
    const baseY = -(normalHeight + baseGap); // -44px (기본 위치, 2px 간격)
    const hoverY = -(hoverHeight + baseGap); // -52.4px (호버 위치, 2px 간격)
    const jumpY = -(70 + baseGap);           // -72px (점프 위치, 2px 간격)

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
      new kakao.maps.Size(30, 42),              // normal 크기 그대로
      { offset: new kakao.maps.Point(15, 70) }  // 점프 offset
    );

    // === 마커 생성 루프 ===
    for (let i = 0; i < positions.length; i++) {
      (function (i) {
        const marker = new kakao.maps.Marker({
          map,
          position: positions[i].latlng,
          image: normalImage,
          clickable: true,
          zIndex: zCounter + 1, // ✅ 초기값: 마커가 항상 오버레이보다 앞
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

        // === 마커 Click ===
        kakao.maps.event.addListener(marker, "mousedown", function () {
          marker.setImage(jumpImage); // 점프 시작
          clickStartTime = Date.now();

          // 오버레이도 점프 위치
          overlayContent.style.transform = `translateY(${jumpY}px)`;
        });

        kakao.maps.event.addListener(marker, "mouseup", function () {
          const elapsed = Date.now() - clickStartTime;
          const delay = Math.max(0, 100 - elapsed);

          setTimeout(function () {
            selectedMarker = marker;
            marker.setImage(normalImage);

            // 기존 강조 해제
            if (selectedOverlay) {
              selectedOverlay.style.border = "1px solid #ccc";
              selectedOverlay = null; 
            }
            
            // ⭐ Z-Index 최상위로 설정 (강조 효과)
            zCounter++;
            marker.setZIndex(zCounter + 1);
            overlay.setZIndex(zCounter);

            // hover 오버레이 숨김
            overlay.setMap(null);

            // 현재 오버레이 강조 (테두리만 파랗게)
            overlay.setMap(map);
            overlayContent.style.border = "2px solid blue";
            
            // 오버레이 위치 및 애니메이션 적용
            overlayContent.style.transition = "transform 0.2s ease, border 0.2s ease"; 
            overlayContent.style.transform = `translateY(${baseY}px)`;  // 2px 간격 유지

            setTimeout(() => {
              overlayContent.style.transition = "transform 0.15s ease, border 0.15s ease"; 
            }, 200);

            selectedOverlay = overlayContent;
          }, delay);
        });


        // === Overlay Click → 마커 클릭과 동일한 효과 및 애니메이션 적용 ===
        overlayContent.addEventListener("click", function () {
            // 1. mousedown 로직 실행 (점프 시작 시뮬레이션)
            marker.setImage(jumpImage); 
            clickStartTime = Date.now();
            overlayContent.style.transform = `translateY(${jumpY}px)`; 
            
            // 2. mouseup 로직 실행 (강조 및 착지)
            const elapsed = Date.now() - clickStartTime;
            const delay = Math.max(0, 100 - elapsed);

            setTimeout(function () {
                // 기존 강조 해제
                if (selectedOverlay) {
                    selectedOverlay.style.border = "1px solid #ccc";
                    selectedOverlay = null;
                }

                // Z-Index 최상위로 설정
                zCounter++;
                marker.setZIndex(zCounter + 1);
                overlay.setZIndex(zCounter);
                selectedMarker = marker;
                marker.setImage(normalImage); // 착지

                // hover 오버레이 숨김
                overlay.setMap(null); 
                
                // 현재 오버레이 강조 (테두리 파랗게 & 위치 복원)
                overlay.setMap(map);
                overlayContent.style.border = "2px solid blue";
                overlayContent.style.transition = "transform 0.2s ease, border 0.2s ease";
                overlayContent.style.transform = `translateY(${baseY}px)`; // 2px 간격 유지하며 착지

                setTimeout(() => {
                    overlayContent.style.transition = "transform 0.15s ease, border 0.15s ease";
                }, 200);

                selectedOverlay = overlayContent;

// overlayContent.addEventListener("click", ...) 내부의 setTimeout 끝 부분 수정
setTimeout(function () {
    // ... (기존 Z-Index, 이미지, 오버레이 강조 로직) ...
    
    // 3. 좌표 input 갱신
    // ... (좌표 갱신 로직) ...

    // ⭐ 필터링 로직을 밖으로 빼서 딜레이를 줌 ⭐
    const nameText = (tempDiv.textContent || tempDiv.innerText || "").trim();
    const prefix = nameText.substring(0, 5).toUpperCase();

    // 맵 애니메이션/클릭 처리가 끝난 후 필터링 시작 (10ms 지연)
    setTimeout(() => {
        const item = document.getElementsByClassName("sel_txt");
        for(let j=0; j<item.length; j++){
            const text = item[j].innerText.toUpperCase().replace(/\s+/g,"");
            item[j].style.display = (text.indexOf(prefix) > -1) ? "flex" : "none";
        }
    }, 10); // 10ms 지연
    
}, delay);

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
        selectedOverlay.style.border = "1px solid #ccc";
        selectedOverlay = null;
      }
    });

    // 전역 등록
    window.markers = markers;
    return markers;
  };
})();
