// markers-handler.js (v2025-09-30-FINAL-6CUT)
(function () {
  console.log("[markers-handler] loaded v2025-09-30-FINAL-6CUT");

  // === 오버레이 기본 스타일 ===
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover{
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

  // === Z 레이어 ===
  const Z = { BASE:100, FRONT:100000 };

  // === 전역 상태 ===
  let selectedMarker = null;       // 선택된 마커
  let selectedOverlayEl = null;    // 선택된 오버레이 엘리먼트
  let selectedOverlayObj = null;   // 선택된 오버레이 객체

  let frontMarker = null;          // 전면에 있는 마커
  let frontOverlay = null;         // 전면에 있는 오버레이
  let frontReason = null;          // 전면 이유

  let normalImage, hoverImage, jumpImage;
  let clickStartTime = 0;

  // === 위치/높이 ===
  const normalH = 42, hoverH = 50.4, gap = 2;
  const baseY  = -(normalH + gap);  // -44
  const hoverY = -(hoverH  + gap);  // -52.4
  const jumpY  = -(70      + gap);  // -72

  // === z-index 유틸 ===
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
      if (map.getLevel() > 3 && frontMarker !== selectedMarker) frontOverlay.setMap(null);
    }
    overlay.setMap(map); // 전면은 항상 표시
    setFrontZ(marker, overlay);
    frontMarker = marker; frontOverlay = overlay; frontReason = reason;
  }

  // === 순수 한글 추출 (앞 6자리 제거 후) ===
  function extractPureHangulFrom6(str){
    const tmp = document.createElement("div");
    tmp.innerHTML = String(str ?? "");
    const plain = tmp.textContent || tmp.innerText || "";
    const sliced = plain.slice(6); // 앞 6자리 제거
    const m = sliced.match(/[가-힣]+/);
    return m ? m[0] : "";
  }

  // === 검색창/제안 UI 주입 ===
  function pushToSearchUI(query) {
    if (!query) { console.warn("[markers-handler] empty query; skip"); return; }
    const kw = document.querySelector('.gx-suggest-search .gx-input');
    if (!kw) { 
      console.warn("[markers-handler] .gx-suggest-search .gx-input not found"); 
      return; 
    }
    setTimeout(() => {
      try {
        kw.value = query;
        console.log("[markers-handler] injected query:", query);
        kw.dispatchEvent(new Event('input',  { bubbles: true }));
        kw.dispatchEvent(new Event('change', { bubbles: true }));
      } catch(e){
        console.error("[markers-handler] pushToSearchUI error:", e);
      }
    }, 0);
  }

  // === 지도 클릭 시 선택 해제 ===
  function bindMapClickToClearSelection(map){
    kakao.maps.event.addListener(map, "click", function(){
      if (selectedOverlayEl) selectedOverlayEl.style.border = "1px solid #ccc";
      selectedMarker = null; selectedOverlayEl = null; selectedOverlayObj = null;
    });
  }

  // === 마커 초기화 ===
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

    const markers = []; const overlays = [];
    const batchSize = 50; let idx = 0;

    function createBatch(){
      const end = Math.min(positions.length, idx + batchSize);
      for (let i=idx;i<end;i++){
        (function(i){
          const pos = positions[i];

          // --- Marker ---
          const marker = new kakao.maps.Marker({
            map, position: pos.latlng, image: normalImage, clickable:true, zIndex: Z.BASE+1
          });
          marker.group = pos.group ? String(pos.group) : (pos.line ? String(pos.line) : null);

          // --- Overlay ---
          const el = document.createElement("div");
          el.className = "overlay-hover";
          el.style.transform = `translateY(${baseY}px)`;
          el.textContent = pos.content;

          const overlay = new kakao.maps.CustomOverlay({
            position: pos.latlng, content: el, yAnchor:1, map:null
          });
          overlay.setZIndex(Z.BASE);

          marker.__overlay = overlay; overlay.__marker = marker;
          marker.__lat = pos.latlng.getLat(); marker.__lng = pos.latlng.getLng();

          // === Hover in ===
          function onOver(){
            marker.setImage(hoverImage);
            bringToFront(map, marker, overlay, 'hover');
            el.style.transform = (marker===selectedMarker) ? `translateY(${hoverY-2}px)` : `translateY(${hoverY}px)`;
          }
          // === Hover out ===
          function onOut(){
            marker.setImage(normalImage);
            const wasHoverFront = (frontMarker===marker && frontOverlay===overlay && frontReason==='hover');
            if (wasHoverFront){
              el.style.transform=`translateY(${baseY}px)`;
              if (selectedMarker && selectedOverlayObj){
                bringToFront(map, selectedMarker, selectedOverlayObj, 'clickMarker');
                if (selectedOverlayEl){
                  selectedOverlayEl.style.border="2px solid blue";
                  selectedOverlayEl.style.transform=`translateY(${baseY-2}px)`;
                }
              }
              return;
            }
            if (marker===selectedMarker){
              el.style.transform=`translateY(${baseY-2}px)`; el.style.border="2px solid blue";
              bringToFront(map, selectedMarker, selectedOverlayObj||overlay, 'clickMarker');
            } else {
              el.style.transform=`translateY(${baseY}px)`;
              if (map.getLevel()>3 && overlay!==frontOverlay && overlay!==selectedOverlayObj) overlay.setMap(null);
              if (!(frontMarker===marker && frontOverlay===overlay)) setDefaultZ(marker, overlay);
              if (frontMarker && frontOverlay) setFrontZ(frontMarker, frontOverlay);
            }
          }

          kakao.maps.event.addListener(marker, "mouseover", onOver);
          kakao.maps.event.addListener(marker, "mouseout",  onOut);
          el.addEventListener("mouseover", onOver);
          el.addEventListener("mouseout",  onOut);

          // === Marker mousedown ===
          kakao.maps.event.addListener(marker, "mousedown", function(){
            marker.setImage(jumpImage); clickStartTime=Date.now();
            if (selectedOverlayEl) selectedOverlayEl.style.border="1px solid #ccc";
            selectedMarker=marker; selectedOverlayEl=el; selectedOverlayObj=overlay;
            bringToFront(map, marker, overlay, 'clickMarker');
            el.style.border="2px solid blue"; el.style.transform=`translateY(${jumpY-2}px)`;
          });

          // === Marker mouseup ===
          kakao.maps.event.addListener(marker, "mouseup", function(){
            const elapsed=Date.now()-clickStartTime; const delay=Math.max(0,100-elapsed);
            setTimeout(function(){
              marker.setImage(normalImage);
              el.style.border="2px solid blue";
              el.style.transition="transform .2s ease, border .2s ease";
              el.style.transform=`translateY(${baseY-2}px)`;
              bringToFront(map, marker, overlay, 'clickMarker');

              // ① 좌표 input 업데이트
              const g = document.getElementById("gpsyx");
              if (g) g.value = `${marker.__lat}, ${marker.__lng}`;

              // ② pos.content 앞에서 6자리 제외 후 순수 한글 추출
              let pure = extractPureHangulFrom6(pos.content);
              if (!pure) pure = extractPureHangulFrom6(el.textContent || "");
              pushToSearchUI(pure);

              setTimeout(()=>{ el.style.transition="transform .15s ease, border .15s ease"; }, 200);
            }, delay);
          });

          // === Overlay click ===
          el.addEventListener("click", function(){
            bringToFront(map, marker, overlay, 'clickOverlay');
            el.style.border="1px solid #ccc";
            el.style.transform=`translateY(${baseY}px)`;
          });

          markers.push(marker); overlays.push(overlay);
        })(i);
      }
      idx=end;
      if (idx<positions.length) setTimeout(createBatch, 0);
      else window.markers=markers;
    }
    createBatch();

    // === idle 시 오버레이 표시/숨김 ===
    kakao.maps.event.addListener(map, "idle", function(){
      const level = map.getLevel();
      const list = window.markers || [];
      for (const m of list){
        const o = m.__overlay; if (!o) continue;
        if ((frontOverlay && o===frontOverlay) || (selectedOverlayObj && o===selectedOverlayObj)) {
          o.setMap(map);
        } else {
          level<=3 ? o.setMap(map) : o.setMap(null);
        }
        if (frontOverlay && o===frontOverlay) setFrontZ(m,o); else setDefaultZ(m,o);
      }
      if (frontMarker && frontOverlay) setFrontZ(frontMarker, frontOverlay);
    });
  };
})();
