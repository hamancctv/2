// markers-handler.js
(function () {
  // === 기본 스타일 ===
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
      transition: transform 0.15s ease, border 0.15s ease;
    }
  `;
  document.head.appendChild(style);

  // === Z 레이어 ===
  const Z = {
    BASE:   100,      // 기본
    SELECT: 100000,   // 선택(클릭) 고정 최상위
    HOVER:  100010    // 호버 시 일시 최상위 (선택보다 위)
  };

  // === 전역 상태 ===
  let selectedMarker = null;
  let selectedOverlayEl = null;   // DOM (content)
  let selectedOverlayObj = null;  // kakao.maps.CustomOverlay
  let clickStartTime = 0;

  // === sel_txt 캐싱 ===
  let selTxtItems = [];
  window.cacheSelTxt = function () {
    selTxtItems = Array.from(document.getElementsByClassName("sel_txt")).map(el => ({
      root: el,
      name: (el.querySelector(".name") ? el.querySelector(".name").innerText : el.innerText || "").toUpperCase()
    }));
  };
  window.filterSelTxt = function (value) {
    const upperValue = value.toUpperCase();
    selTxtItems.forEach(item => {
      item.root.style.display = item.name.indexOf(upperValue) > -1 ? "flex" : "none";
    });
  };

  // === 유틸: 선택 레이어 고정 (마커 > 오버레이) ===
  function setSelectZ(marker, overlay) {
    if (!marker || !overlay) return;
    marker.setZIndex(Z.SELECT + 2);  // 마커 항상 오버레이보다 위
    overlay.setZIndex(Z.SELECT);
  }

  // === 마커 초기화 ===
  let normalImage, hoverImage, jumpImage;
  window.initMarkers = function (map, positions) {
    const markers = [];
    const overlays = [];

    // 높이/갭
    const normalHeight = 42;
    const hoverHeight  = 50.4;
    const baseGap = 2;

    // Y 위치
    const baseY  = -(normalHeight + baseGap); // -44px
    const hoverY = -(hoverHeight  + baseGap); // -52.4px
    const jumpY  = -(70           + baseGap); // -72px

    // 마커 이미지
    normalImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(30, 42),
      { offset: new kakao.maps.Point(15, 42) }
    );
    hoverImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(36, 50.4),
      { offset: new kakao.maps.Point(18, 50.4) }
    );
    jumpImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(30, 42),
      { offset: new kakao.maps.Point(15, 70) }
    );

    // 배치 생성
    const batchSize = 50;
    let markerIndex = 0;

    function createMarkerBatch() {
      const start = markerIndex;
      const end = Math.min(positions.length, start + batchSize);

      for (let i = start; i < end; i++) {
        (function (i) {
          // 마커 (기본: 오버레이보다 앞)
          const marker = new kakao.maps.Marker({
            map,
            position: positions[i].latlng,
            image: normalImage,
            clickable: true,
            zIndex: Z.BASE + 1
          });

          // 오버레이
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

          // 복원용
          marker.__prevZ  = Z.BASE + 1;
          overlay.__prevZ = Z.BASE;

          // === Hover in ===
          function activateHover() {
            marker.setImage(hoverImage);
            overlay.setMap(map);

            if (marker === selectedMarker) {
              overlayContent.style.transform = `translateY(${hoverY - 2}px)`; // gap=4
              setSelectZ(marker, overlay);
            } else {
              overlayContent.style.transform = `translateY(${hoverY}px)`;
              marker.__prevZ  = marker.getZIndex();
              overlay.__prevZ = overlay.getZIndex();
              marker.setZIndex(Z.HOVER + 2);   // hover 시 마커 > 오버레이
              overlay.setZIndex(Z.HOVER);
            }
          }

          // === Hover out ===
          function deactivateHover() {
            marker.setImage(normalImage);
            if (marker === selectedMarker) {
              overlayContent.style.transform = `translateY(${baseY - 2}px)`;
              overlayContent.style.border = "2px solid blue";
              setSelectZ(marker, overlay);
            } else {
              overlayContent.style.transform = `translateY(${baseY}px)`;
              if (map.getLevel() > 3) overlay.setMap(null);
              marker.setZIndex(marker.__prevZ ?? Z.BASE + 1);
              overlay.setZIndex(overlay.__prevZ ?? Z.BASE);
              // hover 끝나면 선택 마커 다시 최상위 복귀
              if (selectedMarker && selectedOverlayObj) {
                setSelectZ(selectedMarker, selectedOverlayObj);
              }
            }
          }

          kakao.maps.event.addListener(marker, "mouseover", activateHover);
          kakao.maps.event.addListener(marker, "mouseout",  deactivateHover);
          overlayContent.addEventListener("mouseover", () => kakao.maps.event.trigger(marker, "mouseover"));
          overlayContent.addEventListener("mouseout",  () => kakao.maps.event.trigger(marker, "mouseout"));

          // === Click (mousedown) ===
          kakao.maps.event.addListener(marker, "mousedown", function () {
            marker.setImage(jumpImage);
            clickStartTime = Date.now();

            if (selectedOverlayEl) selectedOverlayEl.style.border = "1px solid #ccc";
            if (selectedMarker && selectedMarker !== marker) {
              selectedMarker.setZIndex(Z.BASE + 1);
              if (selectedOverlayObj) selectedOverlayObj.setZIndex(Z.BASE);
            }

            selectedMarker     = marker;
            selectedOverlayEl  = overlayContent;
            selectedOverlayObj = overlay;

            overlayContent.style.border = "2px solid blue";
            overlayContent.style.transform = `translateY(${baseY - 2}px)`;
            overlay.setMap(map);

            setSelectZ(marker, overlay);
            overlayContent.style.transform = `translateY(${jumpY - 2}px)`;
          });

          // === Click (mouseup) ===
          kakao.maps.event.addListener(marker, "mouseup", function () {
            const elapsed = Date.now() - clickStartTime;
            const delay = Math.max(0, 100 - elapsed);

            setTimeout(function () {
              const lat = positions[i].latlng.getLat();
              const lng = positions[i].latlng.getLng();
              const gpsyx = document.getElementById("gpsyx");
              if (gpsyx) gpsyx.value = `${lat}, ${lng}`;

              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = positions[i].content;
              const nameText = (tempDiv.textContent || tempDiv.innerText || "").trim();
              const prefix = nameText.substring(0, 5).toUpperCase();

              const keyword = document.getElementById("keyword");
              if (keyword) keyword.value = prefix;

              if (selTxtItems.length === 0) cacheSelTxt();
              filterSelTxt(prefix);

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

          // === 오버레이 클릭 (테두리 없음, 전면만) ===
          overlayContent.addEventListener("click", function () {
            marker.setZIndex(Z.SELECT + 2);
            overlay.setZIndex(Z.SELECT);
            overlay.setMap(map);
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
      }
    }

    createMarkerBatch();

    // === 지도 idle ===
    kakao.maps.event.addListener(map, "idle", function () {
      const level = map.getLevel();
      overlays.forEach((o) => {
        if (o.getContent && o.getContent() === selectedOverlayEl) {
          o.setMap(map);
          setSelectZ(selectedMarker, o);
        } else {
          level <= 3 ? o.setMap(map) : o.setMap(null);
        }
      });
    });

    // 지도 클릭 시 해제 없음
  };
})();
