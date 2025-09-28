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

      clickOverlay.setContent(makeOverlayContent("click", positions[i].content, "click"));
      clickOverlay.setMap(map);
      clickOverlays.push(clickOverlay);

      document.getElementById("gpsyx").value =
        positions[i].latlng.getLat() + ", " + positions[i].latlng.getLng();

      // ⭐⭐⭐ 이곳의 필터링 로직을 수정합니다. ⭐⭐⭐
      
      const markerContent = positions[i].content;
      // 1. 마커 내용의 앞에서 5글자 추출 (필터링에 사용할 값)
      const filterKeyword = markerContent.substring(0, 5).toUpperCase(); // filter() 함수가 대문자를 사용하므로 통일
      
      // 2. #keyword input에 값을 설정하는 코드를 제거합니다. (원하는 대로)
      //    **대신, filter() 함수가 인자를 받아 필터링하도록 임시로 재정의해야 합니다.**

      // 3. 임시 filter 함수를 정의하고 호출 (기존 filter 함수를 덮어쓰지 않습니다)
      if (typeof filter === 'function') {
          // filter() 함수와 동일한 로직을 사용하되, #keyword 대신 추출된 값을 사용합니다.
          const item = document.getElementsByClassName("sel_txt");
          for(let j=0; j<item.length; j++){
            // markerContent.substring(0, 5)와 비교
            const text = item[j].innerText.toUpperCase().replace(/\s+/g,"");
            item[j].style.display = (text.indexOf(filterKeyword) > -1) ? "flex" : "none";
          }
      }
      
      // ⭐⭐⭐ 수정된 로직 끝 ⭐⭐⭐
    }
  }, delay);
});

            // 기존 강조 해제
            if (selectedOverlay) {
              selectedOverlay.style.border = "1px solid #ccc";
              selectedOverlay = null;
            }

            // hover 오버레이 숨김
            overlay.setMap(null);

            // 현재 오버레이 강조 (테두리만 파랗게)
            overlay.setMap(map);
            overlayContent.style.border = "2px solid blue";
            overlayContent.style.transition = "transform 0.2s ease";
            overlayContent.style.transform = `translateY(${baseY}px)`;

            setTimeout(() => {
              overlayContent.style.transition = "transform 0.15s ease";
            }, 200);

            selectedOverlay = overlayContent;
          }, delay);
        });

        // === Overlay Click → 마커와 동일 효과 ===
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
          filter();

          // 클릭 효과 동일 적용
          if (selectedOverlay) {
            selectedOverlay.style.border = "1px solid #ccc";
          }
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
