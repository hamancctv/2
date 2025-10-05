// markers-handler.js (v2025-10-05-RV-SAFE-FINAL)
// ✅ 기존 기능 유지 + 로드뷰시 마커 클릭 비활성 + 동동이보다 항상 아래
(function () {
  console.log("[markers-handler] loaded v2025-10-05-RV-SAFE-FINAL");

  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover{
      padding:2px 6px;
      background:rgba(255,255,255,0.85);
      border:1px solid #ccc;
      border-radius:5px;
      font-size:14px;
      white-space:nowrap;
      user-select:none;
      transition:transform .15s ease, border .15s ease, background .15s ease;
      transform:translateZ(0);
      will-change:transform, border;
    }
  `;
  document.head.appendChild(style);

  const Z = { BASE: 1, FRONT: 999999 }; // 기본 zIndex 낮춤 (동동이보다 항상 아래)
  const Z_WALKER = 2147483647;

  let selectedMarker = null;
  let selectedOverlay = null;
  let hoverMarker = null;
  let normalImage, hoverImage, jumpImage;
  let clickStartTime = 0;

  const normalH = 42, hoverH = 50.4, gap = 2;
  const baseY = -(normalH + gap);
  const hoverY = -(hoverH + gap);
  const jumpY = -(70 + gap);

  // ==== 로드뷰 상태 감지 ====
  const isRoadviewActive = () => {
    const container = document.getElementById("container");
    return container && container.classList.contains("view_roadview");
  };

  function setDefaultZ(marker, overlay) {
    marker?.setZIndex(Z.BASE);
    overlay?.setZIndex(Z.BASE);
  }

  function setFrontZ(marker, overlay) {
    // 동동이보다 항상 아래 유지
    const safeTop = Math.min(Z_WALKER - 1, Z.FRONT);
    marker?.setZIndex(safeTop);
    overlay?.setZIndex(safeTop + 1);
  }

  // 지도 클릭 시 선택 해제
  function bindMapClick(map) {
    kakao.maps.event.addListener(map, "click", function () {
      if (selectedOverlay) {
        selectedOverlay.setZIndex(Z.BASE);
        selectedOverlay.holder.style.border = "1px solid #ccc";
      }
      selectedMarker = null;
      selectedOverlay = null;
    });
  }

  // name1 tail → 검색창 반영
  function extractAfterSecondHyphen(s) {
    s = (s || "").toString().trim();
    const i1 = s.indexOf("-");
    if (i1 < 0) return s;
    const i2 = s.indexOf("-", i1 + 1);
    return (i2 >= 0 ? s.slice(i2 + 1) : s.slice(i1 + 1)).trim();
  }
  function fillSearchInputWithTail(baseText) {
    const tail = extractAfterSecondHyphen(baseText);
    const input = document.querySelector(".gx-input") || document.getElementById("keyword");
    if (input) {
      input.value = tail;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  // ====== 마커 초기화 ======
  window.initMarkers = function (map, positions) {
    bindMapClick(map);

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

    const markers = [];
    const overlays = [];

    positions.forEach(pos => {
      const marker = new kakao.maps.Marker({
        map,
        position: pos.latlng,
        image: normalImage,
        zIndex: Z.BASE
      });
      marker.group = pos.group || null;
      marker.__name1 = pos.name1 || "";
      marker.__pos = pos.latlng;
      marker.__lat = pos.latlng.getLat();
      marker.__lng = pos.latlng.getLng();

      const el = document.createElement("div");
      el.className = "overlay-hover";
      el.textContent = pos.content;
      el.style.transform = `translateY(${baseY}px)`;

      const overlay = new kakao.maps.CustomOverlay({
        position: pos.latlng,
        content: el,
        yAnchor: 1,
        map: null,
        zIndex: Z.BASE
      });
      overlay.holder = el;

      // --- 마우스 오버 ---
      kakao.maps.event.addListener(marker, "mouseover", function () {
        if (isRoadviewActive()) return; // 로드뷰 중엔 비활성
        marker.setImage(hoverImage);
        overlay.setMap(map);
        setFrontZ(marker, overlay);
        el.style.transform = `translateY(${hoverY}px)`;
      });

      // --- 마우스 아웃 ---
      kakao.maps.event.addListener(marker, "mouseout", function () {
        if (isRoadviewActive()) return;
        marker.setImage(normalImage);
        setDefaultZ(marker, overlay);
        el.style.transform = `translateY(${baseY}px)`;
      });

      // --- 마커 클릭 ---
      kakao.maps.event.addListener(marker, "click", function (mouseEvent) {
        // 로드뷰 중엔 지도 클릭으로 대체
        if (isRoadviewActive()) {
          kakao.maps.event.trigger(map, "click", mouseEvent);
          return;
        }

        if (selectedMarker === marker) {
          // 같은 마커 다시 클릭 시 해제
          overlay.setMap(null);
          selectedMarker = null;
          selectedOverlay = null;
          return;
        }

        // 이전 선택 해제
        if (selectedOverlay) {
          selectedOverlay.setMap(null);
          selectedOverlay.holder.style.border = "1px solid #ccc";
        }

        selectedMarker = marker;
        selectedOverlay = overlay;
        marker.setImage(jumpImage);
        overlay.setMap(map);
        setFrontZ(marker, overlay);

        el.style.border = "2px solid blue";
        el.style.transform = `translateY(${jumpY}px)`;

        // 좌표 갱신
        const g = document.getElementById("gpsyx");
        if (g) g.value = `${marker.__lat}, ${marker.__lng}`;
        fillSearchInputWithTail(marker.__name1);

        setTimeout(() => {
          marker.setImage(normalImage);
          el.style.transform = `translateY(${baseY - 2}px)`;
        }, 150);
      });

      markers.push(marker);
      overlays.push(overlay);
    });

    window.markers = markers;
    window.overlays = overlays;

    // ==== idle: 확대레벨별 오버레이 제어 ====
    kakao.maps.event.addListener(map, "idle", function () {
      const level = map.getLevel();
      for (const m of markers) {
        const o = m.__overlay || overlays.find(v => v.holder.textContent === m.__name1);
        if (!o) continue;
        if (level <= 3) {
          o.setMap(map);
        } else {
          o.setMap(null);
        }
        setDefaultZ(m, o);
      }
    });
  };
})();
