// markers-handler.js (v2025-10-05-STABLE-RV-STRICT)
// ✅ 로드뷰시 마커 완전 비활성 + 커서 제거 + 오버레이 숨김
(function () {
  console.log("[markers-handler] loaded v2025-10-05-STABLE-RV-STRICT");

  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover {
      padding:2px 6px;
      background:rgba(255,255,255,0.85);
      border:1px solid #ccc;
      border-radius:5px;
      font-size:14px;
      white-space:nowrap;
      user-select:none;
      transition:transform .15s ease, border .15s ease;
      pointer-events:none; /* 커서통과 */
    }
  `;
  document.head.appendChild(style);

  const Z = { BASE: 1, FRONT: 999999 };
  const Z_WALKER = 2147483647; // 동동이보다 항상 아래
  const baseY = -44, hoverY = -52.4, jumpY = -72;

  let selectedMarker = null;
  let selectedOverlay = null;

  // ===== 유틸 =====
  const isRoadviewActive = () => {
    const c = document.getElementById("container");
    return c && c.classList.contains("view_roadview");
  };

  const fillSearchInputWithTail = (s) => {
    s = (s || "").toString().trim();
    const i1 = s.indexOf("-");
    const i2 = s.indexOf("-", i1 + 1);
    const tail = (i2 >= 0 ? s.slice(i2 + 1) : s.slice(i1 + 1)).trim();
    const input = document.querySelector(".gx-input") || document.getElementById("keyword");
    if (input && tail) {
      input.value = tail;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  // ====== 초기화 ======
  window.initMarkers = function (map, positions) {
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

    const markers = [];
    const overlays = [];

    // 지도 클릭 시 선택 해제
    kakao.maps.event.addListener(map, "click", function () {
      if (selectedOverlay) {
        selectedOverlay.setMap(null);
        selectedOverlay.holder.style.border = "1px solid #ccc";
      }
      selectedMarker = null;
      selectedOverlay = null;
    });

    for (const pos of positions) {
      const marker = new kakao.maps.Marker({
        map,
        position: pos.latlng,
        image: normalImage,
        zIndex: Z.BASE,
        clickable: true
      });

      marker.__name1 = pos.name1 || "";
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
      marker.__overlay = overlay;

      // ===== Hover (로드뷰 아닐 때만) =====
      kakao.maps.event.addListener(marker, "mouseover", function () {
        if (isRoadviewActive()) return; // 로드뷰 중엔 무시
        marker.setImage(hoverImage);
        overlay.setMap(map);
        overlay.setZIndex(Z_WALKER - 2);
        el.style.transform = `translateY(${hoverY}px)`;
      });

      kakao.maps.event.addListener(marker, "mouseout", function () {
        if (isRoadviewActive()) return;
        marker.setImage(normalImage);
        overlay.setMap(null);
        el.style.transform = `translateY(${baseY}px)`;
      });

      // ===== Click =====
      kakao.maps.event.addListener(marker, "click", function (mouseEvent) {
        // 로드뷰 중엔 지도 클릭처럼 동작 (커서 없음)
        if (isRoadviewActive()) {
          kakao.maps.event.trigger(map, "click", mouseEvent);
          return;
        }

        if (selectedMarker === marker) {
          overlay.setMap(null);
          selectedMarker = null;
          selectedOverlay = null;
          return;
        }

        if (selectedOverlay) {
          selectedOverlay.setMap(null);
          selectedOverlay.holder.style.border = "1px solid #ccc";
        }

        selectedMarker = marker;
        selectedOverlay = overlay;
        marker.setImage(jumpImage);
        overlay.setMap(map);
        overlay.setZIndex(Z_WALKER - 2);
        el.style.border = "2px solid blue";
        el.style.transform = `translateY(${jumpY}px)`;

        const g = document.getElementById("gpsyx");
        if (g) g.value = `${marker.__lat}, ${marker.__lng}`;
        fillSearchInputWithTail(marker.__name1);

        setTimeout(() => {
          marker.setImage(normalImage);
          el.style.transform = `translateY(${baseY - 2}px)`;
        }, 200);
      });

      markers.push(marker);
      overlays.push(overlay);
    }

    window.markers = markers;

    // ===== Idle (오버레이 표시 제어) =====
    kakao.maps.event.addListener(map, "idle", function () {
      const level = map.getLevel();
      const rvOn = isRoadviewActive();

      for (const m of markers) {
        const o = m.__overlay;
        if (!o) continue;

        if (rvOn) {
          // 로드뷰 중엔 모든 오버레이 숨김
          o.setMap(null);
          continue;
        }

        if (level <= 3) {
          o.setMap(map);
          o.setZIndex(Z_WALKER - 3);
        } else {
          o.setMap(null);
        }
      }
    });

    // ===== 로드뷰 전환 시 즉시 반응 =====
    const container = document.getElementById("container");
    if (container) {
      const obs = new MutationObserver(() => {
        const rvOn = isRoadviewActive();
        markers.forEach(m => {
          m.setClickable(!rvOn);
          m.setCursor(rvOn ? "default" : "pointer");
          if (rvOn && m.__overlay) m.__overlay.setMap(null);
        });
      });
      obs.observe(container, { attributes: true, attributeFilter: ["class"] });
    }
  };
})();
