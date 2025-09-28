// markers-handler.js
(function() {
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover {
      padding:2px 6px;
      background:rgba(255,255,255,0.9);
      border:1px solid #ccc;
      border-radius:5px;
      font-size:12px;
      white-space: nowrap;
      user-select: none;
      transition: transform 0.2s ease;
    }
    .overlay-hover.active { transform: scale(1.2) translateY(-2px); }
    .overlay-click {
      padding:5px 8px;
      background:rgba(255,255,255,0.95);
      border:1px solid #666;
      border-radius:5px;
      font-size:13px;
      white-space: nowrap;
      user-select: none;
    }
  `;
  document.head.appendChild(style);

  window.initMarkers = function(map, positions) {
    const markers = [];
    const overlays = [];
    const clickOverlays = [];
    const markerHeight = 42;
    let selectedMarker = null;
    let clickStartTime = 0;
    let zCounter = 100;

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
    const clickImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(36, 50.4),
      { offset: new kakao.maps.Point(18, 70.4) } // 점프 효과
    );

    for (let i = 0; i < positions.length; i++) {
      (function(i) {
        const marker = new kakao.maps.Marker({
          map,
          position: positions[i].latlng,
          image: normalImage,
          clickable: true
        });
        marker.group = positions[i].group;

        // hover overlay
        const overlayContent = document.createElement("div");
        overlayContent.className = "overlay-hover";
        overlayContent.style.transform = `translateY(-${markerHeight}px)`;
        overlayContent.innerText = positions[i].content;

        const overlay = new kakao.maps.CustomOverlay({
          position: positions[i].latlng,
          content: overlayContent,
          yAnchor: 1,
          map: null
        });

        const clickOverlay = new kakao.maps.CustomOverlay({
          position: positions[i].latlng,
          content: `<div class="overlay-click" style="transform:translateY(-${markerHeight}px)">${positions[i].content}</div>`,
          yAnchor: 1,
          map: null
        });

        function activateHover() {
          zCounter++;
          marker.setImage(hoverImage);
          marker.setZIndex(zCounter);
          overlay.setZIndex(zCounter);
          overlay.setMap(map);
          overlayContent.classList.add("active");
          marker.__isMouseOver = true;
        }
        function deactivateHover() {
          marker.__isMouseOver = false;
          if (marker !== selectedMarker) marker.setImage(normalImage);
          overlayContent.classList.remove("active");
          if (map.getLevel() > 3) overlay.setMap(null);
        }

        kakao.maps.event.addListener(marker, "mouseover", activateHover);
        kakao.maps.event.addListener(marker, "mouseout", deactivateHover);
        overlayContent.addEventListener("mouseover", activateHover);
        overlayContent.addEventListener("mouseout", deactivateHover);

        kakao.maps.event.addListener(marker, "mousedown", function() {
          if (selectedMarker && selectedMarker !== marker) {
            selectedMarker.setImage(normalImage);
          }
          clickOverlays.forEach(ov => ov.setMap(null));
          clickOverlays.length = 0;
          marker.setImage(clickImage);
          selectedMarker = marker;
          clickStartTime = Date.now();
        });

        kakao.maps.event.addListener(marker, "mouseup", function() {
          const elapsed = Date.now() - clickStartTime;
          const delay = Math.max(0, 100 - elapsed);
          setTimeout(function() {
            if (marker === selectedMarker) {
              marker.setImage(marker.__isMouseOver ? hoverImage : normalImage);
              clickOverlay.setMap(map);
              clickOverlays.push(clickOverlay);
              const inp = document.getElementById("gpsyx");
              if (inp) inp.value = positions[i].latlng.getLat() + ", " + positions[i].latlng.getLng();
            }
          }, delay);
        });

        markers.push(marker);
        overlays.push(overlay);
      })(i);
    }

    kakao.maps.event.addListener(map, "idle", function() {
      const level = map.getLevel();
      overlays.forEach(o => (level <= 3 ? o.setMap(map) : o.setMap(null)));
    });

    kakao.maps.event.addListener(map, "click", function() {
      const level = map.getLevel();
      if (selectedMarker) {
        selectedMarker.setImage(normalImage);
        selectedMarker = null;
      }
      clickOverlays.forEach(ov => ov.setMap(null));
      clickOverlays.length = 0;
      if (level <= 3) {
        overlays.forEach(o => {
          const c = o.getContent();
          if (c && c.classList) c.classList.remove("active");
        });
        markers.forEach(m => m.setImage(normalImage));
      }
    });

    window.markers = markers;
    return markers;
  };
})();
