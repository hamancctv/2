// markers-handler.js (v2025-10-05-FULL-INTEGRATED)
// 기존 hover/click/overlay 동기화 + 점프 + z-index 관리 + 클릭테두리/해제 통합
(function () {
  console.log("[markers-handler] loaded v2025-10-05-FULL-INTEGRATED");

  // === 오버레이 스타일 정의 ===
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover{
      padding:2px 6px;
      background:#fff !important;
      border:1px solid rgba(204,204,204,1);
      border-radius:5px;
      font-size:14px;
      white-space:nowrap;
      user-select:none;
      cursor:default;
      opacity:0.8;
      pointer-events:none; /* ✅ 기본은 클릭 막기 */
      transition:transform .15s ease, border .15s ease, background .15s ease;
      transform:translateZ(0);
      backface-visibility:hidden;
      z-index:150;
    }
    .overlay-hover.front {
      pointer-events:auto;
      border-color:#4a90e2 !important;
      z-index:160 !important;
    }
    .overlay-hover.selected {
      pointer-events:auto;
      border:2px solid #007bff !important;
      z-index:170 !important;
    }
  `;
  document.head.appendChild(style);

  // === 전역 변수 ===
  const Z = { BASE: 100, FRONT: 99999 };
  let selectedMarker = null;
  let selectedOverlay = null;
  const markers = [];
  const overlays = [];

  // === 마커 생성 함수 ===
  function createMarker(lat, lng, name) {
    const pos = new kakao.maps.LatLng(lat, lng);

    const normalImg = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
      new kakao.maps.Size(24, 35)
    );
    const hoverImg = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
      new kakao.maps.Size(28, 39)
    );
    const clickImg = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
      new kakao.maps.Size(30, 42)
    );

    const marker = new kakao.maps.Marker({ position: pos, image: normalImg });
    marker.setMap(map);
    markers.push(marker);

    const overlay = new kakao.maps.CustomOverlay({
      position: pos,
      content: `<div class="overlay-hover">${name}</div>`,
      yAnchor: 1.5,
      zIndex: Z.BASE
    });
    overlay.setMap(map);
    overlays.push(overlay);

    const overlayEl = overlay.getContent().querySelector(".overlay-hover");

    // === 마커 hover ===
    kakao.maps.event.addListener(marker, "mouseover", () => {
      if (selectedMarker !== marker) {
        marker.setImage(hoverImg);
        overlayEl.classList.add("front");
      }
    });

    kakao.maps.event.addListener(marker, "mouseout", () => {
      if (selectedMarker !== marker) {
        marker.setImage(normalImg);
        overlayEl.classList.remove("front");
      }
    });

    // === 마커 클릭 ===
    kakao.maps.event.addListener(marker, "click", () => {
      // 이전 선택 해제
      if (selectedMarker && selectedMarker !== marker) {
        resetMarker(selectedMarker);
      }
      if (selectedOverlay && selectedOverlay !== overlayEl) {
        selectedOverlay.classList.remove("selected");
      }

      // 새 선택 적용
      marker.setImage(clickImg);
      overlayEl.classList.add("selected");
      overlayEl.classList.remove("front");
      selectedMarker = marker;
      selectedOverlay = overlayEl;

      // 점프 효과
      jumpMarker(marker);
    });
  }

  // === 점프 애니메이션 ===
  function jumpMarker(marker) {
    const pos = marker.getPosition();
    const originalY = pos.getLat();
    let step = 0;
    const jump = setInterval(() => {
      const yOffset = Math.sin(step / 10) * 0.0003;
      marker.setPosition(new kakao.maps.LatLng(originalY + yOffset, pos.getLng()));
      step++;
      if (step > 30) {
        marker.setPosition(pos);
        clearInterval(jump);
      }
    }, 16);
  }

  // === 마커 초기화 ===
  function resetMarker(marker) {
    marker.setImage(
      new kakao.maps.MarkerImage(
        "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
        new kakao.maps.Size(24, 35)
      )
    );
  }

  // === 지도 클릭 시 모든 선택 해제 ===
  kakao.maps.event.addListener(map, "click", () => {
    if (selectedMarker) {
      resetMarker(selectedMarker);
      selectedMarker = null;
    }
    if (selectedOverlay) {
      selectedOverlay.classList.remove("selected");
      selectedOverlay = null;
    }
  });

  // === 오버레이 hover/click 이벤트 ===
  document.addEventListener("mouseover", e => {
    const el = e.target.closest(".overlay-hover");
    if (!el) return;
    if (el.classList.contains("selected")) return;
    el.classList.add("front");
  });

  document.addEventListener("mouseout", e => {
    const el = e.target.closest(".overlay-hover");
    if (!el) return;
    if (el.classList.contains("selected")) return;
    el.classList.remove("front");
  });

  document.addEventListener("click", e => {
    const el = e.target.closest(".overlay-hover");
    if (el) {
      if (selectedOverlay && selectedOverlay !== el) {
        selectedOverlay.classList.remove("selected");
      }
      if (el.classList.contains("selected")) {
        el.classList.remove("selected");
        selectedOverlay = null;
      } else {
        el.classList.add("selected");
        selectedOverlay = el;
      }
      e.stopPropagation();
    }
  });

  // === 테스트용 마커 추가 (삭제 가능) ===
  createMarker(35.272, 128.405, "테스트1");
  createMarker(35.273, 128.406, "테스트2");
  createMarker(35.274, 128.404, "테스트3");
})();
