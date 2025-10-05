// markers-handler.js (v2025-10-05-FINAL-RV-PROTECTED)
(function () {
  console.log("[markers-handler] loaded v2025-10-05-FINAL-RV-PROTECTED");

  /* ==================== 스타일 ==================== */
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
      will-change:transform, border;
      transform:translateZ(0);
      backface-visibility:hidden;
    }
  `;
  document.head.appendChild(style);

  /* ==================== 상수 / 상태 ==================== */
  const Z = { BASE: 100, FRONT: 100000 };
  let selectedMarker = null, selectedOverlayEl = null, selectedOverlayObj = null;
  let frontMarker = null, frontOverlay = null, frontReason = null;
  let normalImage, hoverImage, jumpImage;
  let clickStartTime = 0;

  const normalH = 42, hoverH = 50.4, gap = 2;
  const baseY  = -(normalH + gap);
  const hoverY = -(hoverH  + gap);
  const jumpY  = -(70 + gap);

  const isRVOn = () => !!window.overlayOn;

  /* ==================== Z 인덱스 제어 ==================== */
  function setDefaultZ(marker, overlay){
    const baseZ = isRVOn() ? 2147483645 : Z.BASE;
    if (marker)  marker.setZIndex(baseZ + 1);
    if (overlay) overlay.setZIndex(baseZ);
  }
  function setFrontZ(marker, overlay){
    const frontZ = isRVOn() ? 2147483645 : Z.FRONT;
    if (marker)  marker.setZIndex(frontZ);
    if (overlay) overlay.setZIndex(frontZ - 1);
  }
  function bringToFront(map, marker, overlay, reason){
    if (!marker || !overlay) return;
    if (frontMarker && frontOverlay && (frontMarker !== marker || frontOverlay !== overlay)) {
      setDefaultZ(frontMarker, frontOverlay);
      if (map.getLevel() > 3 && frontMarker !== selectedMarker) frontOverlay.setMap(null);
    }
    overlay.setMap(map);
    if (isRVOn()){
      marker.setZIndex(2147483645);
      overlay.setZIndex(2147483644);
    } else setFrontZ(marker, overlay);
    frontMarker = marker; frontOverlay = overlay; frontReason = reason;
  }

  function fillSearchInputWithTail(baseText){
    const s = (baseText || "").toString();
    const i1 = s.indexOf("-"), i2 = s.indexOf("-", i1+1);
    const tail = (i2 >= 0 ? s.slice(i2+1) : s.slice(i1+1)).trim();
    if (!tail) return;
    const input = document.querySelector(".gx-input") || document.getElementById("keyword");
    if (!input) return;
    input.value = tail;
    try { input.dispatchEvent(new Event("input",{bubbles:true})); } catch {}
  }

  /* ==================== 마커 초기화 ==================== */
  window.initMarkers = function (map, positions) {
    kakao.maps.event.addListener(map, "click", function(){
      if (selectedOverlayEl) selectedOverlayEl.style.border = "1px solid #ccc";
      selectedMarker = null; selectedOverlayEl = null; selectedOverlayObj = null;
    });

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

    const markers = [], overlays = [];
    const batchSize = 50; let idx = 0;

    function createBatch(){
      const end = Math.min(positions.length, idx + batchSize);
      for (let i = idx; i < end; i++){
        (function(i){
          const pos = positions[i];
          const marker = new kakao.maps.Marker({
            map, position: pos.latlng, image: normalImage, clickable: true, zIndex: Z.BASE+1
          });
          marker.group = pos.group || null;
          marker.__pos = pos.latlng;
          marker.__lat = pos.latlng.getLat();
          marker.__lng = pos.latlng.getLng();
          marker.__name1 = pos.name1 || pos.content || "";

          const el = document.createElement("div");
          el.className = "overlay-hover";
          el.style.transform = `translateY(${baseY}px)`;
          el.textContent = pos.content;

          const overlay = new kakao.maps.CustomOverlay({
            position: pos.latlng, content: el, yAnchor: 1, map: null
          });
          overlay.setZIndex(Z.BASE);
          marker.__overlay = overlay; overlay.__marker = marker;

          /* ===== Hover in/out ===== */
          function onOver(){
            if (window.isInteractionLocked && window.isInteractionLocked()) return;
            marker.setImage(hoverImage);
            bringToFront(map, marker, overlay, 'hover');
            el.style.transform = (marker===selectedMarker)
              ? `translateY(${hoverY-2}px)` : `translateY(${hoverY}px)`;
          }
          function onOut(){
            if (window.isInteractionLocked && window.isInteractionLocked()) return;
            marker.setImage(normalImage);
            el.style.transform = (marker===selectedMarker)
              ? `translateY(${baseY-2}px)` : `translateY(${baseY}px)`;
            setDefaultZ(marker, overlay);
          }
          kakao.maps.event.addListener(marker, "mouseover", onOver);
          kakao.maps.event.addListener(marker, "mouseout", onOut);

          /* ===== Marker 클릭 ===== */
          kakao.maps.event.addListener(marker, "mousedown", function(){
            if (isRVOn()){
              try {
                if (typeof window.setRoadviewAt === "function")
                  window.setRoadviewAt(marker.getPosition());
                else map.setCenter(marker.getPosition());
              } catch {}
              return;
            }
            if (window.isInteractionLocked && window.isInteractionLocked()) return;
            marker.setImage(jumpImage);
            clickStartTime = Date.now();
            if (selectedOverlayEl) selectedOverlayEl.style.border="1px solid #ccc";
            selectedMarker = marker; selectedOverlayEl = el; selectedOverlayObj = overlay;
            bringToFront(map, marker, overlay, 'clickMarker');
            el.style.border="2px solid blue";
            el.style.transform=`translateY(${jumpY-2}px)`;
          });
          kakao.maps.event.addListener(marker, "mouseup", function(){
            if (isRVOn()) return;
            if (window.isInteractionLocked && window.isInteractionLocked()) return;
            const elapsed = Date.now() - clickStartTime;
            const delay = Math.max(0, 100 - elapsed);
            setTimeout(()=>{
              marker.setImage(normalImage);
              el.style.border="2px solid blue";
              el.style.transition="transform .2s ease,border .2s ease";
              el.style.transform=`translateY(${baseY-2}px)`;
              bringToFront(map, marker, overlay, 'clickMarker');
              const g=document.getElementById("gpsyx");
              if(g) g.value=`${marker.__lat}, ${marker.__lng}`;
              fillSearchInputWithTail(marker.__name1);
              setTimeout(()=>{ el.style.transition="transform .15s ease,border .15s ease"; },200);
            }, delay);
          });

          /* ===== Overlay 클릭 (RV 중 비활성) ===== */
          el.addEventListener("click", function(){
            if (isRVOn()) return;
            if (window.isInteractionLocked && window.isInteractionLocked()) return;
            if (selectedOverlayEl) selectedOverlayEl.style.border="1px solid #ccc";
            selectedMarker = marker; selectedOverlayEl = el; selectedOverlayObj = overlay;
            bringToFront(map, marker, overlay, 'clickOverlay');
            el.style.border="2px solid blue";
            el.style.transform=`translateY(${baseY-2}px)`;
            const g=document.getElementById("gpsyx");
            if(g) g.value=`${marker.__lat}, ${marker.__lng}`;
            fillSearchInputWithTail(marker.__name1);
          });

          markers.push(marker); overlays.push(overlay);
        })(i);
      }
      idx = end;
      if (idx < positions.length) setTimeout(createBatch, 0);
      else window.markers = markers;
    }
    createBatch();

    /* ===== idle 오버레이 표시 ===== */
    kakao.maps.event.addListener(map,"idle",function(){
      const level=map.getLevel(); const list=window.markers||[];
      for(const m of list){
        const o=m.__overlay; if(!o) continue;
        if ((frontOverlay&&o===frontOverlay)||(selectedOverlayObj&&o===selectedOverlayObj))
          o.setMap(map);
        else o.setMap(level<=3?map:null);
        setDefaultZ(m,o);
      }
      if(frontMarker&&frontOverlay) setFrontZ(frontMarker,frontOverlay);
    });
  };
})();
