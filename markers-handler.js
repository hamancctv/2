// markers-handler.js — v2025-10-07 SIMPLE-LOCK FINAL
(function () {
  console.log("[markers-handler] loaded v2025-10-07 SIMPLE-LOCK FINAL");

  /* ==================== 스타일 ==================== */
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover {
      padding: 2px 6px;
      background: rgba(255,255,255,0.80);
      border: 1px solid #ccc;
      border-radius: 5px;
      font-size: 14px;
      white-space: nowrap;
      user-select: none;
      cursor: default;
      transition: transform .15s ease, border .15s ease, background .15s ease;
      will-change: transform, border;
      transform: translateZ(0);
      backface-visibility: hidden;
      z-index: 101;
    }
  `;
  document.head.appendChild(style);

  /* ==================== 전역 변수 및 설정 ==================== */
  const Z = { BASE: 100, FRONT: 100000 };
  let selectedMarker = null;
  let selectedOverlayEl = null;
  let selectedOverlayObj = null;
  let frontMarker = null;
  let frontOverlay = null;
  let frontReason  = null;
  let normalImage, hoverImage, jumpImage;
  let clickStartTime = 0;

  const normalH = 42, hoverH = 50.4, gap = 2;
  const baseY  = -(normalH + gap);
  const hoverY = -(hoverH  + gap);
  const jumpY  = -(70      + gap);

  function setDefaultZ(marker, overlay){
    if (marker) marker.setZIndex(Z.BASE + 1);
    if (overlay) overlay.setZIndex(Z.BASE);
  }
  function setFrontZ(marker, overlay){
    if (marker) marker.setZIndex(Z.FRONT);
    if (overlay) overlay.setZIndex(Z.FRONT + 1);
  }
  function bringToFront(map, marker, overlay, reason){
    if (!marker || !overlay) return;
    if (frontMarker && frontOverlay && (frontMarker !== marker || frontOverlay !== overlay)) {
      setDefaultZ(frontMarker, frontOverlay);
      if (map.getLevel() > 3 && frontMarker !== selectedMarker && frontReason !== 'clickMarker') {
        frontOverlay.setMap(null);
      }
    }
    overlay.setMap(map);
    setFrontZ(marker, overlay);
    frontMarker = marker; frontOverlay = overlay; frontReason = reason;
  }

  function extractAfterSecondHyphen(s){
    s = (s || "").toString().trim();
    const i1 = s.indexOf("-");
    if (i1 < 0) return s;
    const i2 = s.indexOf("-", i1 + 1);
    return (i2 >= 0 ? s.slice(i2 + 1) : s.slice(i1 + 1)).trim();
  }

  function fillSearchInputWithTail(baseText){
    const tail = extractAfterSecondHyphen(baseText || "");
    if (!tail) return;
    const input = document.querySelector(".gx-input") || document.getElementById("keyword");
    if (!input) return;
    input.value = tail;
    try { input.dispatchEvent(new Event("input", { bubbles:true })); } catch {}
  }

  function bindMapClickToClearSelection(map){
    kakao.maps.event.addListener(map, "click", function(){
      if (selectedMarker) {
        selectedOverlayEl.style.border = "1px solid #ccc";
        selectedOverlayEl.style.transform = `translateY(${baseY}px)`;
        selectedMarker.setImage(normalImage);
        setDefaultZ(selectedMarker, selectedOverlayObj);
        if (map.getLevel() > 3 && selectedOverlayObj) {
          selectedOverlayObj.setMap(null);
        }
      }
      selectedMarker = null; selectedOverlayEl = null; selectedOverlayObj = null;
      frontMarker = null; frontOverlay = null; frontReason = null;
    });
  }

  /* ==================== 마커 초기화 ==================== */
  window.initMarkers = function (map, positions) {
    bindMapClickToClearSelection(map);

    normalImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(30,42), { offset:new kakao.maps.Point(15,42) }
    );

    hoverImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(36,50.4), { offset:new kakao.maps.Point(18,50.4) }
    );
 
    jumpImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(30,42), { offset:new kakao.maps.Point(15,70) }
    );

    const markers = [];
    const batchSize = 50; 
    let idx = 0;

    function createBatch(){
      const end = Math.min(positions.length, idx + batchSize);
      for (let i = idx; i < end; i++){
        (function(i){
          const pos = positions[i];
          const marker = new kakao.maps.Marker({
            map, position: pos.latlng, image: normalImage, clickable: true, zIndex: Z.BASE + 1
          });

          marker.group = pos.group ? String(pos.group) : (pos.line ? String(pos.line) : null);
          marker.__pos = pos.latlng;
          marker.__lat = pos.latlng.getLat(); 
          marker.__lng = pos.latlng.getLng();
          marker.__name1 = (pos.__name1 || pos.content || "");

          const el = document.createElement("div");
          el.className = "overlay-hover";
          el.style.transform = `translateY(${baseY}px)`;
          el.textContent = pos.content;
          el.style.backgroundColor = "#fff";
          el.style.opacity = "1";

          const overlay = new kakao.maps.CustomOverlay({
            position: pos.latlng, content: el, yAnchor: 1, map: null
          });
          overlay.setZIndex(Z.BASE);

          marker.__overlay = overlay;
          overlay.__marker = marker;

          // 이벤트 함수 정의
          const onOver = () => {
            marker.setImage(hoverImage);
            bringToFront(map, marker, overlay, 'hover');
            el.style.transform = (marker === selectedMarker)
              ? `translateY(${hoverY-2}px)` : `translateY(${hoverY}px)`;
          };

          const onOut = () => {
            marker.setImage(normalImage);
            if (marker === selectedMarker){
              el.style.transform = `translateY(${baseY-2}px)`;
              el.style.border = "2px solid blue";
            } else {
              el.style.transform = `translateY(${baseY}px)`;
              el.style.border = "1px solid #ccc";
            }
            if (map.getLevel() > 3 && marker !== selectedMarker && frontMarker !== marker) {
              overlay.setMap(null);
            }
          };

          const onDown = () => {
            marker.setImage(jumpImage);
            clickStartTime = Date.now();
            if (selectedOverlayEl) selectedOverlayEl.style.border = "1px solid #ccc";
            selectedMarker = marker; selectedOverlayEl = el; selectedOverlayObj = overlay;
            bringToFront(map, marker, overlay, 'clickMarker');
            el.style.border = "2px solid blue";
            el.style.transform = `translateY(${jumpY-2}px)`;
          };

          const onUp = () => {
            const elapsed = Date.now() - clickStartTime;
            const delay = Math.max(0, 100 - elapsed);
            setTimeout(() => {
              marker.setImage(normalImage);
              el.style.border = "2px solid blue";
              el.style.transition = "transform .2s ease, border .2s ease";
              el.style.transform = `translateY(${baseY-2}px)`;
              bringToFront(map, marker, overlay, 'clickMarker');
              const g = document.getElementById("gpsyx");
              if (g) g.value = `${marker.__lat}, ${marker.__lng}`;
              fillSearchInputWithTail(marker.__name1);
              setTimeout(()=>{ el.style.transition = "transform .15s ease, border .15s ease"; }, 200);
            }, delay);
          };

          // 저장해두기 (후에 토글로 복구)
          marker.__overFn = onOver;
          marker.__outFn  = onOut;
          marker.__downFn = onDown;
          marker.__upFn   = onUp;

          // 등록
          kakao.maps.event.addListener(marker, "mouseover", onOver);
          kakao.maps.event.addListener(marker, "mouseout",  onOut);
          kakao.maps.event.addListener(marker, "mousedown", onDown);
          kakao.maps.event.addListener(marker, "mouseup",   onUp);

          markers.push(marker);
        })(i);
      }
      idx = end;
      if (idx < positions.length) setTimeout(createBatch, 0);
      else window.markers = markers;
    }
    createBatch();

    kakao.maps.event.addListener(map, "idle", function(){
      const level = map.getLevel();
      const list = window.markers || [];
      for (const m of list){
        const o = m.__overlay;
        if (!o) continue;
        const isFront = (frontOverlay && o === frontOverlay);
        const isSelected = (selectedOverlayObj && o === selectedOverlayObj);
        if (level <= 3 || isFront || isSelected) o.setMap(map);
        else o.setMap(null);
        if (isFront || isSelected) setFrontZ(m, o);
        else setDefaultZ(m, o);
      }
    });
  };

  /* ==================== 🔹 마커 인터랙션 잠금 제어 (거리재기·로드뷰 공용) ==================== */
  window.setMarkersInteraction = function (enabled = true) {
    const list = window.markers || [];
    list.forEach(m => {
      try {
        m.setClickable(enabled);
        if (enabled) {
          if (m.__overFn) kakao.maps.event.addListener(m, "mouseover", m.__overFn);
          if (m.__outFn)  kakao.maps.event.addListener(m, "mouseout",  m.__outFn);
          if (m.__downFn) kakao.maps.event.addListener(m, "mousedown", m.__downFn);
          if (m.__upFn)   kakao.maps.event.addListener(m, "mouseup",   m.__upFn);
        } else {
          kakao.maps.event.removeListener(m, "mouseover", m.__overFn);
          kakao.maps.event.removeListener(m, "mouseout",  m.__outFn);
          kakao.maps.event.removeListener(m, "mousedown", m.__downFn);
          kakao.maps.event.removeListener(m, "mouseup",   m.__upFn);
        }
      } catch (e) { console.warn(e); }
    });
    console.log(`[marker-interaction] ${enabled ? "ENABLED" : "DISABLED"}`);
  };
})();
