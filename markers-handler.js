// markers-handler.js
(function () {
  // ====== 스타일 (오버레이 20% 확대 + 글자 14px) ======
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover {
      padding: 2px 6px;
      background: rgba(255,255,255,0.9);
      border: 1px solid #ccc;
      border-radius: 5px;
      font-size: 14px;
      white-space: nowrap;
      user-select: none;
      transition: transform 0.15s ease;
      /* 기본 확대 값 (JS에서도 동일 scale을 유지해서 깜박임 방지) */
      transform: scale(1.2);
    }
  `;
  document.head.appendChild(style);

  // ====== 전역 상태 ======
  let zCounter = 100;
  let selectedMarker = null;
  let clickStartTime = 0;

  // menu_wrap 필터: 앞 5글자(prefix)로 .sel_txt만 필터링 (검색창은 건드리지 않음)
  function filterMenuWrapByPrefix(prefix) {
    const items = document.getElementsByClassName("sel_txt");
    for (let j = 0; j < items.length; j++) {
      const text = items[j].innerText.toUpperCase().replace(/\s+/g, "");
      items[j].style.display = text.indexOf(prefix) > -1 ? "flex" : "none";
    }
  }

  // ====== 초기화 함수 ======
  window.initMarkers = function (map, positions) {
    const markers = [];
    const overlays = [];

    const normalHeight = 42;
    const hoverHeight = 50.4;
    const baseY  = -(normalHeight + 2); // -44px
    const hoverY = -(hoverHeight  + 2); // -54.4px

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
    // 클릭 점프: 크기는 normal, offset만 더 아래(점프 느낌)
    const jumpImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(30, 42),
      { offset: new kakao.maps.Point(15, 70) }
    );

    for (let i = 0; i < positions.length; i++) {
      (function (i) {
        // ---- 마커 ----
        const marker = new kakao.maps.Marker({
          map,
          position: positions[i].latlng,
          image: normalImage,
          clickable: true,
        });
        marker.group = positions[i].group ? String(positions[i].group) : null;

        // ---- 오버레이(hover용; 클릭 오버레이 없음) ----
        const overlayContent = document.createElement("div");
        overlayContent.className = "overlay-hover";
        // transform은 항상 scale(1.2) 포함해서 일관성 유지
        overlayContent.style.transform = `translateY(${baseY}px) scale(1.2)`;
        // content에 HTML이 올 수 있으므로 innerHTML 사용
        overlayContent.innerHTML = positions[i].content;

        const overlay = new kakao.maps.CustomOverlay({
          position: positions[i].latlng,
          content: overlayContent,
          yAnchor: 1,
          map: null,
        });

        // ---- 유틸: 좌표 입력 갱신 & prefix 계산 ----
        function updateGpsyx() {
          const gpsyx = document.getElementById("gpsyx");
          if (gpsyx) {
            gpsyx.value =
              positions[i].latlng.getLat() + ", " + positions[i].latlng.getLng();
          }
        }
        function getNamePrefix5() {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = positions[i].content;
          const nameText = (tempDiv.textContent || tempDiv.innerText || "").trim();
          return nameText.substring(0, 5).toUpperCase();
        }

        // ---- Hover 동작 ----
        function activateHover() {
          marker.__isMouseOver = true;
          zCounter++;
          marker.setZIndex(zCounter);
          overlay.setZIndex(zCounter);

          if (marker !== selectedMarker) marker.setImage(hoverImage);

          // 레벨 조건에 따라 표시
          if (!overlay.getMap()) overlay.setMap(map);
          overlayContent.style.transform = `translateY(${hoverY}px) scale(1.2)`;
        }

        function deactivateHover() {
          marker.__isMouseOver = false;
          if (marker !== selectedMarker) marker.setImage(normalImage);

          overlayContent.style.transform = `translateY(${baseY}px) scale(1.2)`;
          // 레벨 > 3이면 자동 숨김
          if (map.getLevel() > 3) overlay.setMap(null);
        }

        kakao.maps.event.addListener(marker, "mouseover", activateHover);
        kakao.maps.event.addListener(marker, "mouseout",  deactivateHover);
        overlayContent.addEventListener("mouseover", activateHover);
        overlayContent.addEventListener("mouseout",  deactivateHover);

        // ---- 클릭(마커/오버레이 동일): 오버레이 효과는 숨기고 menu_wrap만 필터 ----
        kakao.maps.event.addListener(marker, "mousedown", function () {
          marker.setImage(jumpImage);
          clickStartTime = Date.now();
        });
        kakao.maps.event.addListener(marker, "mouseup", function () {
          const elapsed = Date.now() - clickStartTime;
          const delay = Math.max(0, 100 - elapsed);

          setTimeout(function () {
            selectedMarker = marker;
            marker.setImage(normalImage);   // 크기 원래대로

            // 🔹 오버레이 효과 제거(숨김)
            overlay.setMap(null);
            overlayContent.style.transform = `translateY(${baseY}px) scale(1.2)`;
            overlayContent.style.border = "1px solid #ccc";

            // 좌표 + menu_wrap 필터만 수행
            updateGpsyx();
            filterMenuWrapByPrefix(getNamePrefix5());
          }, delay);
        });

        // 오버레이 클릭도 동일 처리
        overlayContent.addEventListener("click", function () {
          selectedMarker = marker;
          marker.setImage(normalImage);

          // 🔹 오버레이 효과 제거(숨김)
          overlay.setMap(null);
          overlayContent.style.transform = `translateY(${baseY}px) scale(1.2)`;
          overlayContent.style.border = "1px solid #ccc";

          updateGpsyx();
          filterMenuWrapByPrefix(getNamePrefix5());
        });

        markers.push(marker);
        overlays.push(overlay);
      })(i);
    }

    // ---- 지도 레벨 변화: 3 이하 자동표시 / 초과 숨김 ----
    kakao.maps.event.addListener(map, "idle", function () {
      const level = map.getLevel();
      overlays.forEach((o) => {
        if (level <= 3) {
          if (!o.getMap()) o.setMap(map);
          const el = o.getContent();
          if (el && el.style) el.style.transform = `translateY(${baseY}px) scale(1.2)`;
        } else {
          o.setMap(null);
        }
      });
    });

    // ---- 지도 클릭: 선택만 해제 (오버레이는 레벨 규칙에 따름) ----
    kakao.maps.event.addListener(map, "click", function () {
      if (selectedMarker) {
        selectedMarker.setImage(normalImage);
        selectedMarker = null;
      }
      const level = map.getLevel();
      overlays.forEach((o) => {
        const el = o.getContent();
        if (el && el.style) el.style.transform = `translateY(${baseY}px) scale(1.2)`;
        if (level > 3) o.setMap(null);
      });
    });

    // 외부(MST 등)에서 접근
    window.markers = markers;
    return markers;
  };
})();
