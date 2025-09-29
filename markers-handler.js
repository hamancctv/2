// markers-handler.js
(function () {
  // === 기본 스타일 정의 ===
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover {
      padding:2px 6px;
      background:rgba(255,255,255,0.90);
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

  // === 전역 상태 ===
  const Z = {
    BASE: 100,
    SELECT: 100000,
    HOVER: 100010
  };
  let selectedMarker = null;
  let selectedOverlayEl = null;
  let selectedOverlayObj = null;
  let clickStartTime = 0;

  // === sel_txt 캐싱 배열 ===
  let selTxtItems = [];

  // menu_wrap 안의 sel_txt들을 캐싱
  window.cacheSelTxt = function () {
    selTxtItems = Array.from(document.getElementsByClassName("sel_txt")).map(el => ({
      root: el,
      name: el.querySelector(".name")
        ? el.querySelector(".name").innerText.toUpperCase()
        : ""
    }));
  };

  // 캐싱된 배열을 이용한 필터링
  function filterSelTxt(value) {
    const upperValue = value.toUpperCase();
    selTxtItems.forEach(item => {
      item.root.style.display = item.name.indexOf(upperValue) > -1 ? "flex" : "none";
    });
  }

  // === 마커 초기화 함수 ===
  window.initMarkers = function (map, positions) {
    const markers = [];
    const overlays = [];

    const normalHeight = 42;
    const hoverHeight = 50.4;
    const baseGap = 2;

    const baseY = -(normalHeight + baseGap);
    const hoverY = -(hoverHeight + baseGap);
    const jumpY = -(70 + baseGap);

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
            zIndex: Z.BASE
          });

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

          // === Hover ===
          function activateHover() {
            marker.setImage(hoverImage);
            overlay.setMap(map);

            if (marker === selectedMarker) {
              overlayContent.style.transform = `translateY(${hoverY - 2}px)`; // gap=4
              setSelectZ(marker, overlay);
            } else {
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
              overlayContent.style.transform = `translateY(${baseY - 2}px)`;
              overlayContent.style.border = "2px solid blue";
              setSelectZ(marker, overlay);
            } else {
              overlayContent.style.transform = `translateY(${baseY}px)`;
              if (map.getLevel() > 3) overlay.setMap(null);
              marker.setZIndex(marker.__prevZ ?? Z.BASE);
              overlay.setZIndex(overlay.__prevZ ?? Z.BASE);
              if (selectedMarker && selectedOverlayObj) {
                setSelectZ(selectedMarker, selectedOverlayObj);
              }
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

            if (selectedOverlayEl) selectedOverlayEl.style.border = "1px solid #ccc";
            if (selectedMarker && selectedMarker !== marker) {
              selectedMarker.setZIndex(Z.BASE);
              if (selectedOverlayObj) selectedOverlayObj.setZIndex(Z.BASE);
            }

            selectedMarker = marker;
            selectedOverlayEl = overlayContent;
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
              document.getElementById("gpsyx").value = lat + ", " + lng;

              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = positions[i].content;
              const nameText = (tempDiv.textContent || tempDiv.innerText || "").trim();
              const prefix = nameText.substring(0, 5).toUpperCase();
              document.getElementById("keyword").value = prefix;

              // ✅ filterSelTxt 사용 (버벅임 개선)
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

    kakao.maps.event.addListener(map, "click", function () {
      clearSelection();
    });

    function setSelectZ(marker, overlay) {
      if (!marker || !overlay) return;
      marker.setZIndex(Z.SELECT + 1);
      overlay.setZIndex(Z.SELECT);
    }

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
        if (map.getLevel() > 3) selectedOverlayObj.setMap(null);
        selectedOverlayObj.setZIndex(Z.BASE);
        selectedOverlayObj = null;
      }
    }
  };
})();
