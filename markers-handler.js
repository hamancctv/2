// markers-handler.js
(function () {
  // === 기본 스타일 정의 ===
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover {
      padding:2px 6px;
      background:rgba(255,255,255,0.70); /* ✅ 투명도 조금 더 높임 */
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
      new kakao.maps.Size(30, 42),              // normal 크기 그대로
      { offset: new kakao.maps.Point(15, 70) }  // 점프 offset
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

        // === Click ===
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

            // 기존 강조 해제 (기존 선택된 마커와 오버레이의 Z-Index 원복)
            if (selectedOverlay) {
              selectedOverlay.style.border = "1px solid #ccc";
              // 마커가 있다면 마커의 zIndex도 낮춰야 하지만, 여기서는 selectedOverlay만 관리
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
    
    // ⭐ 수정: transition을 먼저 설정하여 부드럽게 움직이도록 함
    overlayContent.style.transition = "transform 0.2s ease, border 0.2s ease"; 
    
    // ⭐ 수정: baseY (-44px)로 명시적으로 위치 설정하여 2px 간격 유지
    overlayContent.style.transform = `translateY(${baseY}px)`; 

    setTimeout(() => {
      overlayContent.style.transition = "transform 0.15s ease, border 0.15s ease"; // 오버레이 클릭 시 부드러움 유지
    }, 200);

    selectedOverlay = overlayContent;
  }, delay);
});

        // 클릭이벤트 좌표 넣기 및 멘 필터 적용
// markers-handler.js 파일 내 'overlayContent.addEventListener("click")' 리스너 전체 교체

        // === Overlay Click → 마커 클릭과 동일한 효과 및 애니메이션 적용 ===
        overlayContent.addEventListener("click", function () {
            // 마커 클릭 시 발생하는 '점프' 효과를 시뮬레이션합니다.
            
            // 1. mousedown 로직 실행 (점프 시작)
            marker.setImage(jumpImage); 
            clickStartTime = Date.now();
            overlayContent.style.transform = `translateY(${jumpY}px)`; // 오버레이 점프 위치
            
            // 2. mouseup 로직 실행 (강조 및 착지)
            const elapsed = Date.now() - clickStartTime;
            const delay = Math.max(0, 100 - elapsed);

            setTimeout(function () {
                // 기존 강조 해제
                if (selectedOverlay) {
                    selectedOverlay.style.border = "1px solid #ccc";
                    selectedOverlay = null;
                }

                // ⭐ Z-Index 최상위로 설정 (강조 효과)
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

                // 3. 좌표 input 갱신 및 필터 적용 (기존 로직 유지)
                const lat = positions[i].latlng.getLat();
                const lng = positions[i].latlng.getLng();
                document.getElementById("gpsyx").value = lat + ", " + lng;
                
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = positions[i].content;
                const nameText = (tempDiv.textContent || tempDiv.innerText || "").trim();
                const prefix = nameText.substring(0, 5).toUpperCase();
                
                // 검색창에 값 넣지 않고 필터링 (이전 요청대로)
                const item = document.getElementsByClassName("sel_txt");
                for(let j=0; j<item.length; j++){
                    const text = item[j].innerText.toUpperCase().replace(/\s+/g,"");
                    item[j].style.display = (text.indexOf(prefix) > -1) ? "flex" : "none";
                }
            }, delay);
        });
       // 클릭 효과 동일 적용
  if (selectedOverlay) {
    selectedOverlay.style.border = "1px solid #ccc";
  }
  
  // ⭐ 수정: transform을 명시적으로 설정하여 2px 간격 유지
  overlayContent.style.transition = "transform 0.2s ease, border 0.2s ease"; 
  overlayContent.style.transform = `translateY(${baseY}px)`;
  
  overlayContent.style.border = "2px solid blue";
  selectedOverlay = overlayContent;
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
        selectedOverlay.style.border = "1px solid #ccc";
        selectedOverlay = null;
      }
    });

    // 전역 등록
    window.markers = markers;
    return markers;
  };
})();
