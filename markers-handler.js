// markers-handler.js (v2025-10-05-STABLE-RV-WALKERFRONT)
// ✅ 동동이 항상 위, 로드뷰시 마커 클릭 무효 + hover만 작동, 오버레이는 항상 동동이 뒤
(function () {
  console.log("[markers-handler] loaded v2025-10-05-STABLE-RV-WALKERFRONT");

  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover {
      padding:2px 6px;
      background:rgba(255,255,255,0.88);
      border:1px solid #ccc;
      border-radius:5px;
      font-size:14px;
      white-space:nowrap;
      user-select:none;
      transition:transform .15s ease, border .15s ease;
      pointer-events:none; /* hover는 marker에서만 */
    }
  `;
  document.head.appendChild(style);

  const Z = { BASE: 100, FRONT: 200 };
  const Z_WALKER = 9999; // 동동이는 이보다 높음
  const baseY = -44, hoverY = -52.4, jumpY = -72;

  let selectedMarker = null;
  let selectedOverlay = null;

  const isRV = () => {
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

      kakao.maps.event.addListener(marker, "mouseover", function () {
        marker.setImage(hoverImage);
        overlay.setMap(map);
        overlay.setZIndex(Z_WALKER - 2); // 항상 동동이보다 뒤
        el.style.transform = `translateY(${hoverY}px)`;
      });

      kakao.maps.event.addListener(marker, "mouseout", function () {
        marker.setImage(normalImage);
        overlay.setMap(null);
        el.style.transform = `translateY(${baseY}px)`;
      });

      kakao.maps.event.addListener(marker, "click", function (mouseEvent) {
        if (isRV()) {
          // 로드뷰일 때 클릭은 지도 클릭으로 대체
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

    // 지도 초기 레벨 3 이하 → 오버레이 자동 표시
    if (map.getLevel() <= 3) {
      overlays.forEach(o => {
        o.setMap(map);
        o.setZIndex(Z_WALKER - 3); // 동동이보다 항상 아래
      });
    }

    // idle 시 업데이트
    kakao.maps.event.addListener(map, "idle", function () {
      const level = map.getLevel();
      const rvOn = isRV();
      for (const o of overlays) {
        if (rvOn) { o.setMap(null); continue; }
        if (level <= 3) {
          o.setMap(map);
          o.setZIndex(Z_WALKER - 3);
        } else {
          o.setMap(null);
        }
      }
    });

    // 로드뷰 토글 감시
    const container = document.getElementById("container");
    if (container) {
      const obs = new MutationObserver(() => {
        const rvOn = isRV();
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
