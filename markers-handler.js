// markers-handler.js (v2025-10-05-LITE-HOVERRESET-DESELECT)
// ✅ 마커 hover/click만 작동, 클릭 해제/중복 클릭/지도 클릭 시 선택 해제
(function () {
  console.log("[markers-handler] loaded v2025-10-05-LITE-HOVERRESET-DESELECT");

  /* ==================== 스타일 ==================== */
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover {
      padding:2px 6px;
      background:rgba(255,255,255,0.80);
      border:1px solid #ccc;
      border-radius:5px;
      font-size:14px;
      white-space:nowrap;
      user-select:none;
      transition:transform .15s ease, border .15s ease, background .15s ease;
      will-change:transform, border;
      transform:translateZ(0);
      backface-visibility:hidden;
    }
  `;
  document.head.appendChild(style);

  /* ==================== 상수 / 상태 ==================== */
  const Z = { BASE:100, FRONT:100000 };
  const normalH = 42, hoverH = 50.4, gap = 2;
  const baseY  = -(normalH + gap);   // -44
  const hoverY = -(hoverH  + gap);   // -52.4
  const jumpY  = -(70      + gap);   // -72

  let normalImage, hoverImage, jumpImage;
  let selectedMarker = null;
  let selectedOverlayEl = null;
  let selectedOverlayObj = null;

  function resetZ(marker, overlay) {
    if (marker) marker.setZIndex(Z.BASE + 1);
    if (overlay) overlay.setZIndex(Z.BASE);
  }
  function frontZ(marker, overlay) {
    if (marker) marker.setZIndex(Z.FRONT);
    if (overlay) overlay.setZIndex(Z.FRONT + 1);
  }

  /* ==================== 초기화 ==================== */
  window.initMarkers = function(map, positions) {
    normalImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(30,42),
      {offset:new kakao.maps.Point(15,42)}
    );
    hoverImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(36,50.4),
      {offset:new kakao.maps.Point(18,50.4)}
    );
    jumpImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(30,42),
      {offset:new kakao.maps.Point(15,70)}
    );

    const markers = [];

    /* === 지도 클릭 시 선택 해제 === */
    kakao.maps.event.addListener(map, "click", function(){
      if (selectedMarker && selectedOverlayEl && selectedOverlayObj) {
        selectedOverlayEl.style.border = "1px solid #ccc";
        selectedOverlayEl.style.transform = `translateY(${baseY}px)`;
        resetZ(selectedMarker, selectedOverlayObj);
        selectedMarker = null;
        selectedOverlayEl = null;
        selectedOverlayObj = null;
      }
    });

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
      marker.__lat = pos.latlng.getLat();
      marker.__lng = pos.latlng.getLng();

      /* ===== Hover In ===== */
      kakao.maps.event.addListener(marker, "mouseover", function(){
        if (window.isInteractionLocked && window.isInteractionLocked()) return;
        if (marker === selectedMarker) return; // 선택된 마커는 hover 무시
        marker.setImage(hoverImage);
        frontZ(marker, overlay);
        el.style.transform = `translateY(${hoverY}px)`;
      });

      /* ===== Hover Out ===== */
      kakao.maps.event.addListener(marker, "mouseout", function(){
        if (window.isInteractionLocked && window.isInteractionLocked()) return;
        if (marker === selectedMarker) return; // 선택된 마커는 유지
        marker.setImage(normalImage);
        resetZ(marker, overlay);
        el.style.border = "1px solid #ccc";
        el.style.transform = `translateY(${baseY}px)`;
      });

      /* ===== Marker Click ===== */
      kakao.maps.event.addListener(marker, "click", function(){
        if (window.isInteractionLocked && window.isInteractionLocked()) return;

        // ✅ 같은 마커 다시 클릭 → 선택 해제
        if (selectedMarker === marker) {
          el.style.border = "1px solid #ccc";
          el.style.transform = `translateY(${baseY}px)`;
          resetZ(marker, overlay);
          selectedMarker = null;
          selectedOverlayEl = null;
          selectedOverlayObj = null;
          return;
        }

        // ✅ 다른 마커 클릭 시 이전 선택 해제
        if (selectedOverlayEl && selectedMarker && selectedOverlayObj) {
          selectedOverlayEl.style.border = "1px solid #ccc";
          selectedOverlayEl.style.transform = `translateY(${baseY}px)`;
          resetZ(selectedMarker, selectedOverlayObj);
        }

        // ✅ 현재 마커 선택
        selectedMarker = marker;
        selectedOverlayEl = el;
        selectedOverlayObj = overlay;

        marker.setImage(jumpImage);
        frontZ(marker, overlay);

        el.style.border = "2px solid blue";
        el.style.transform = `translateY(${jumpY}px)`;

        setTimeout(() => {
          marker.setImage(normalImage);
          el.style.transform = `translateY(${baseY-2}px)`;
        }, 150);

        const g = document.getElementById("gpsyx");
        if (g) g.value = `${marker.__lat}, ${marker.__lng}`;
      });

      markers.push(marker);
    }

    window.markers = markers;
  };
})();
