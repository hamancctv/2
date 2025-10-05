// markers-handler.js (v2025-10-06 CLICK-INTERLOCK-FINAL)
(function () {
  console.log("[markers-handler] loaded v2025-10-06 CLICK-INTERLOCK-FINAL");

  /* ==================== 스타일 ==================== */
const style = document.createElement("style");
style.textContent = `
  .overlay-hover{
    padding:2px 6px;
    background-color:#fff !important;
    background:#fff !important;
    opacity:0.8 !important;         /* ✅ 투명도 보정 */
    border:1px solid rgba(204,204,204,1) !important;
    border-radius:5px;
    font-size:14px;
    white-space:nowrap;
    user-select:none;
    cursor:default; 
    transition:transform .15s ease, border .15s ease, background .15s ease;
    will-change:transform, border;
    transform:translateZ(0);
    backface-visibility:hidden;
    z-index:101;                  /* ✅ 기본 z-index도 명시 */
  }
`;
document.head.appendChild(style);


  /* ==================== 상수 / 상태 ==================== */
  const Z = { BASE: 100, FRONT: 100000 }; 

  let selectedMarker = null;
  let selectedOverlayEl = null;
  let selectedOverlayObj = null;

  let frontMarker = null;
  let frontOverlay = null;
  let frontReason  = null;

  let normalImage, hoverImage, jumpImage;
  let clickStartTime = 0;

  // 마커/오버레이 수직 위치
  const normalH = 42, hoverH = 50.4, gap = 2;
  const baseY  = -(normalH + gap);   // -44
  const hoverY = -(hoverH  + gap);   // -52.4
  const jumpY  = -(70      + gap);   // -72

  /* ==================== 유틸 ==================== */
  function setDefaultZ(marker, overlay){
    if (marker)  {
        marker.setZIndex(Z.BASE + 1); 
    }
    if (overlay) {
        overlay.setZIndex(Z.BASE);
    }
  }
  function setFrontZ(marker, overlay){
    if (marker)  marker.setZIndex(Z.FRONT);
    if (overlay) overlay.setZIndex(Z.FRONT + 1);
  }
  function bringToFront(map, marker, overlay, reason){
    if (!marker || !overlay) return;
    
    // 이전 전면 마커 복원
    if (frontMarker && frontOverlay && (frontMarker !== marker || frontOverlay !== overlay)) {
      setDefaultZ(frontMarker, frontOverlay);
      if (map.getLevel() > 3 && frontMarker !== selectedMarker) {
        frontOverlay.setMap(null);
      }
    }
    
    // 현재 전면 후보를 전면으로 설정
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
      if (selectedOverlayEl) {
        selectedOverlayEl.style.border = "1px solid #ccc";
        selectedOverlayEl.style.transform = `translateY(${baseY}px)`;
      }
      if (selectedMarker) {
        selectedMarker.setImage(normalImage);
        setDefaultZ(selectedMarker, selectedOverlayObj);
      }
    
      // 레벨 4 이상일 때만, 선택된 오버레이를 지도에서 숨김
      if (map.getLevel() > 3 && selectedOverlayObj) {
          selectedOverlayObj.setMap(null);
      }
    
      selectedMarker = null; selectedOverlayEl = null; selectedOverlayObj = null;
      
      // 전면 마커가 남아있다면 Z-Index 재설정
      if (frontMarker && frontOverlay) {
          setFrontZ(frontMarker, frontOverlay);
      }
    });
  }

  /* ==================== 마커 초기화 ==================== */
  window.initMarkers = function (map, positions) {
    bindMapClickToClearSelection(map);

    // 마커 이미지 정의 (원본 유지)
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
      for (let i = idx; i < end; i++){
        (function(i){
          const pos = positions[i];

          // ---------- Marker / Overlay 생성 (원본 유지) ----------
          const marker = new kakao.maps.Marker({ map, position: pos.latlng, image: normalImage, clickable: true, zIndex: Z.BASE + 1 });
          marker.group = pos.group ? String(pos.group) : (pos.line ? String(pos.line) : null);
          marker.__pos = pos.latlng;                   
          marker.__lat = pos.latlng.getLat(); marker.__lng = pos.latlng.getLng();
          marker.__name1 = (pos.__name1 || pos.content || ""); 

          const el = document.createElement("div");
          el.className = "overlay-hover";
          el.style.transform = `translateY(${baseY}px)`;
          el.textContent = pos.content;

          const overlay = new kakao.maps.CustomOverlay({
            position: pos.latlng, content:  el, yAnchor:  1, map:  null
          });
          overlay.setZIndex(Z.BASE);

          marker.__overlay = overlay;
          overlay.__marker = marker;

          /* ===== Hover in (마커에만 반응) ===== */
function onOver(){
  if (window.isInteractionLocked && window.isInteractionLocked()) return;
  marker.setImage(hoverImage);
  bringToFront(map, marker, overlay, 'hover'); // ✅ 이 줄 그대로 유지
  el.style.transform = (marker === selectedMarker)
    ? `translateY(${hoverY-2}px)`
    : `translateY(${hoverY}px)`;
}


          /* ===== Hover out (마커에만 반응) ===== */
function onOut(){
  if (window.isInteractionLocked && window.isInteractionLocked()) return;

  marker.setImage(normalImage);

  // 🔽 front로 올라온 상태였다면 원래대로 돌려놓기
  const isFrontSelf = (frontMarker === marker && frontOverlay === overlay);
  if (isFrontSelf) {
    setDefaultZ(marker, overlay);       // ✅ z-index 복원
    frontMarker = null;                 // ✅ front 상태 해제
    frontOverlay = null;
    frontReason = null;
  }

  // 오버레이 시각 복원
  if (marker === selectedMarker){
    el.style.transform = `translateY(${baseY-2}px)`;
    el.style.border = "2px solid blue";
    bringToFront(map, selectedMarker, selectedOverlayObj || overlay, 'clickMarker');
  } else {
    el.style.transform = `translateY(${baseY}px)`;
    el.style.border = "1px solid #ccc";
  }
}


            if (marker === selectedMarker){
              el.style.transform = `translateY(${baseY-2}px)`;
              el.style.border = "2px solid blue";
              bringToFront(map, selectedMarker, selectedOverlayObj || overlay, 'clickMarker');
            } else {
              el.style.transform = `translateY(${baseY}px)`;
              if (map.getLevel() > 3 && overlay !== frontOverlay && overlay !== selectedOverlayObj) {
                overlay.setMap(null);
              }
              if (!(frontMarker === marker && frontOverlay === overlay)) {
                setDefaultZ(marker, overlay);
              }
              if (frontMarker && frontOverlay) setFrontZ(frontMarker, frontOverlay);
            }
          }

          kakao.maps.event.addListener(marker, "mouseover", onOver);
          kakao.maps.event.addListener(marker, "mouseout",  onOut);

          /* ===== Marker mousedown (클릭 시작) ===== */
          kakao.maps.event.addListener(marker, "mousedown", function(){
            // ⭐ [인터락 강화]: 로드뷰 ON 또는 거리재기 ON 상태에서 클릭 즉시 차단
            if (window.isInteractionLocked && window.isInteractionLocked()) return; 

            marker.setImage(jumpImage);
            clickStartTime = Date.now();
            
            if (selectedOverlayEl) selectedOverlayEl.style.border = "1px solid #ccc";
            selectedMarker = marker; selectedOverlayEl = el; selectedOverlayObj = overlay;

            bringToFront(map, marker, overlay, 'clickMarker');
            el.style.border = "2px solid blue";
            el.style.transform = `translateY(${jumpY-2}px)`;
          });

          /* ===== Marker mouseup (클릭 확정) ===== */
          kakao.maps.event.addListener(marker, "mouseup", function(){
            // ⭐ [인터락 강화]: 로드뷰 ON 또는 거리재기 ON 상태에서 클릭 즉시 차단
            if (window.isInteractionLocked && window.isInteractionLocked()) return;
            
            const elapsed = Date.now() - clickStartTime;
            const delay = Math.max(0, 100 - elapsed);

            setTimeout(function(){
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
          });

          markers.push(marker);
          overlays.push(overlay);
        })(i);
      }
      idx = end;

      if (idx < positions.length) {
        setTimeout(createBatch, 0);
      } else {
        window.markers = markers; 
      }
    }
    createBatch();

    /* ===== idle: 확대 수준에 따른 오버레이 표시/숨김 (분리 로직) ===== */
    kakao.maps.event.addListener(map, "idle", function(){
      const level = map.getLevel();
      const list = window.markers || [];

      for (const m of list){
        const o = m.__overlay;
        if (!o) continue;

        const isFrontOrSelected = (frontOverlay && o === frontOverlay) || (selectedOverlayObj && o === selectedOverlayObj);

        // 레벨 3 이하 또는 전면/선택 마커는 항상 표시
        if (level <= 3 || isFrontOrSelected) {
          o.setMap(map);
        } else {
          // 레벨 4 이상일 때 숨김
          o.setMap(null);
        }

        // Z-Index 재설정
        if (isFrontOrSelected) setFrontZ(m, o);
        else setDefaultZ(m, o);
      }

      // 전면 마커가 있었다면 Z-Index 재설정
      if (frontMarker && frontOverlay) setFrontZ(frontMarker, frontOverlay);
    });
  };
})();
