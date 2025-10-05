// markers-handler.js (v2025-10-06-STABLE-FRONTCLICK-RESET)
// ✅ 마커 클릭 시 오버레이·마커 전면 / 다른 마커·지도 클릭 시 원복
(function () {
  console.log("[markers-handler] loaded v2025-10-06-STABLE-FRONTCLICK-RESET");

  const Z = { BASE: 100, FRONT: 100000 };
  const normalH = 42, hoverH = 50.4, gap = 2;
  const baseY  = -(normalH + gap);
  const hoverY = -(hoverH  + gap);
  const jumpY  = -(70      + gap);

  let normalImage, hoverImage, jumpImage;
  let selectedMarker = null;
  let selectedOverlayEl = null;
  let selectedOverlayObj = null;

  function setDefaultZ(marker, overlay) {
    if (marker) marker.setZIndex(Z.BASE + 1);
    if (overlay) overlay.setZIndex(Z.BASE);
  }
  function setFrontZ(marker, overlay) {
    if (marker) marker.setZIndex(Z.FRONT);
    if (overlay) overlay.setZIndex(Z.FRONT + 1);
  }

  window.initMarkers = function(map, positions) {
    // ===== 마커 이미지 =====
    normalImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(30,42),
      { offset:new kakao.maps.Point(15,42) }
    );
    hoverImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(36,50.4),
      { offset:new kakao.maps.Point(18,50.4) }
    );
    jumpImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(30,42),
      { offset:new kakao.maps.Point(15,70) }
    );

    const markers = [];

    /* ===== 지도 클릭 → 선택 해제 ===== */
    kakao.maps.event.addListener(map, "click", function() {
      if (!selectedMarker) return;
      resetSelected();
    });

    /* ===== 선택 해제 공통 함수 ===== */
    function resetSelected() {
      if (!selectedMarker || !selectedOverlayEl || !selectedOverlayObj) return;
      selectedOverlayEl.style.border = "1px solid #ccc";
      selectedOverlayEl.style.transform = `translateY(${baseY}px)`;
      setDefaultZ(selectedMarker, selectedOverlayObj);
      selectedMarker = null;
      selectedOverlayEl = null;
      selectedOverlayObj = null;
    }

    /* ===== 마커 생성 ===== */
    for (const pos of positions) {
      const marker = new kakao.maps.Marker({
        map,
        position: pos.latlng,
        image: normalImage,
        clickable: true,
        zIndex: Z.BASE + 1
      });

      const el = document.createElement("div");
      el.className = "overlay-hover";
      el.style.transform = `translateY(${baseY}px)`;
      el.textContent = pos.content || "";

      const overlay = new kakao.maps.CustomOverlay({
        position: pos.latlng,
        content: el,
        yAnchor: 1,
        map: map
      });
      overlay.setZIndex(Z.BASE);

      marker.__overlay = overlay;

      /* === Hover In === */
      kakao.maps.event.addListener(marker, "mouseover", function(){
        if (window.isInteractionLocked && window.isInteractionLocked()) return;
        if (marker === selectedMarker) return;
        marker.setImage(hoverImage);
        setFrontZ(marker, overlay);
        el.style.transform = `translateY(${hoverY}px)`;
      });

      /* === Hover Out === */
      kakao.maps.event.addListener(marker, "mouseout", function(){
        if (window.isInteractionLocked && window.isInteractionLocked()) return;
        if (marker === selectedMarker) return;
        marker.setImage(normalImage);
        setDefaultZ(marker, overlay);
        el.style.transform = `translateY(${baseY}px)`;
      });

      /* === Click === */
      kakao.maps.event.addListener(marker, "click", function(){
        if (window.isInteractionLocked && window.isInteractionLocked()) return;

        // 같은 마커 재클릭 → 해제
        if (selectedMarker === marker) {
          resetSelected();
          return;
        }

        // 이전 선택 해제
        resetSelected();

        // 선택 설정
        selectedMarker = marker;
        selectedOverlayEl = el;
        selectedOverlayObj = overlay;

        setFrontZ(marker, overlay);
        marker.setImage(jumpImage);

        el.style.border = "2px solid blue";
        el.style.transform = `translateY(${jumpY}px)`;

        setTimeout(() => {
          marker.setImage(normalImage);
          el.style.transform = `translateY(${baseY-2}px)`;
        }, 120);

        const g = document.getElementById("gpsyx");
        if (g) {
          const lat = marker.getPosition().getLat();
          const lng = marker.getPosition().getLng();
          g.value = `${lat}, ${lng}`;
        }
      });

      markers.push(marker);
    }

    window.markers = markers;
  };
})();
