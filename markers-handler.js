// markers-handler.js
(function () {
  // === 기본 스타일 ===
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
  const Z = { BASE:100, FRONT:100000 }; // FRONT를 전면 고정에 사용

  // === 전역 상태 ===
  let selectedMarker = null;       // 마커 클릭 선택(파란 테두리) 쌍
  let selectedOverlayEl = null;
  let selectedOverlayObj = null;

  let frontMarker = null;          // 마지막 상호작용(호버/클릭)으로 전면 고정된 쌍
  let frontOverlay = null;
  let frontReason = null;          // 'hover' | 'clickMarker' | 'clickOverlay'

  let clickStartTime = 0;

  // === sel_txt 캐시 기반 필터(있으면 사용, 없으면 폴백) ===
  if (!window.__selTxtItems) window.__selTxtItems = [];
  if (typeof window.cacheSelTxt !== "function") {
    window.cacheSelTxt = function () {
      const nodes = document.getElementsByClassName("sel_txt");
      window.__selTxtItems = Array.from(nodes).map(el => {
        const nameEl = el.querySelector(".name");
        const text = ((nameEl ? nameEl.innerText : el.innerText) || "")
          .toUpperCase().replace(/\s+/g,"");
        return { root: el, text };
      });
    };
  }
  if (typeof window.filterSelTxt !== "function") {
    window.filterSelTxt = function (val) {
      const q = (val||"").toUpperCase().replace(/\s+/g,"");
      if (!window.__selTxtItems.length) window.cacheSelTxt();
      for (const it of window.__selTxtItems) {
        it.root.style.display = it.text.indexOf(q) > -1 ? "flex" : "none";
      }
    };
  }
  let _pendingFilterVal = "", _idleFlag = false, _rafId = null;
  function scheduleFilterSelTxt(val){
    _pendingFilterVal = val||"";
    if (typeof window.filterSelTxt !== "function") {
      if (typeof window.filter === "function") window.filter(); // 폴백
      return;
    }
    if ("requestIdleCallback" in window) {
      if (_idleFlag) return;
      _idleFlag = true;
      requestIdleCallback(()=>{ _idleFlag=false; window.filterSelTxt(_pendingFilterVal); }, {timeout:200});
    } else {
      if (_rafId) return;
      _rafId = requestAnimationFrame(()=>{ _rafId=null; window.filterSelTxt(_pendingFilterVal); });
    }
  }

  // === Z 유틸 ===
  function setDefaultZ(marker, overlay){ // 기본: 마커 > 오버레이
    if (marker) marker.setZIndex(Z.BASE + 1);
    if (overlay) overlay.setZIndex(Z.BASE);
  }
  function setFrontZ(marker, overlay){   // 전면: 오버레이 > 마커
    if (marker) marker.setZIndex(Z.FRONT);
    if (overlay) overlay.setZIndex(Z.FRONT + 1);
  }
  function bringToFront(map, marker, overlay, reason){
    if (!marker || !overlay) return;
    // 이전 전면 쌍 강등
    if (frontMarker && frontOverlay && (frontMarker !== marker || frontOverlay !== overlay)) {
      setDefaultZ(frontMarker, frontOverlay);
      if (map.getLevel() > 3 && frontMarker !== selectedMarker) frontOverlay.setMap(null);
    }
    // 새 전면 쌍 고정
    overlay.setMap(map);       // 전면은 항상 표시
    setFrontZ(marker, overlay);
    frontMarker = marker;
    frontOverlay = overlay;
    frontReason = reason;      // 'hover' | 'clickMarker' | 'clickOverlay'
  }
  function clearFront(map){
    if (frontMarker && frontOverlay) {
      setDefaultZ(frontMarker, frontOverlay);
      if (map.getLevel()>3 && frontMarker !== selectedMarker) frontOverlay.setMap(null);
    }
    frontMarker = frontOverlay = frontReason = null;
  }
  function clearSelection(map){
    if (selectedMarker) {
      selectedMarker.setImage(normalImage);
      // 선택 해제 시 기본 z로
      setDefaultZ(selectedMarker, selectedOverlayObj);
      selectedMarker = null;
    }
    if (selectedOverlayEl){
      selectedOverlayEl.style.border = "1px solid #ccc";
      selectedOverlayEl = null;
    }
    if (selectedOverlayObj){
      if (map.getLevel()>3 && (!frontOverlay || selectedOverlayObj !== frontOverlay)) {
        selectedOverlayObj.setMap(null);
      }
      selectedOverlayObj = null;
    }
  }

  // === 이미지/치수 ===
  let normalImage, hoverImage, jumpImage;
  const normalHeight = 42;
  const hoverHeight  = 50.4;
  const baseGap = 2;
  const baseY  = -(normalHeight + baseGap); // -44
  const hoverY = -(hoverHeight  + baseGap); // -52.4
  const jumpY  = -(70           + baseGap); // -72

  // === 마커 초기화 ===
  window.initMarkers = function (map, positions) {
    const markers = [];
    const overlays = [];

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

    const batchSize = 50;
    let idx = 0;

    function createBatch(){
      const end = Math.min(positions.length, idx + batchSize);
      for (let i=idx;i<end;i++){
        (function(i){
          const pos = positions[i];

          // 마커
          const marker = new kakao.maps.Marker({
            map, position: pos.latlng, image: normalImage, clickable:true, zIndex: Z.BASE + 1
          });

          // 오버레이
          const el = document.createElement("div");
          el.className = "overlay-hover";
          el.style.transform = `translateY(${baseY}px)`;
          el.textContent = pos.content;

          const overlay = new kakao.maps.CustomOverlay({
            position: pos.latlng, content: el, yAnchor:1, map:null
          });
          overlay.setZIndex(Z.BASE);

          // 서로 참조
          marker.__overlay = overlay;
          overlay.__marker = marker;

          // 사전 계산
          marker.__lat = pos.latlng.getLat();
          marker.__lng = pos.latlng.getLng();
          const t = document.createElement('div');
          t.innerHTML = pos.content;
          marker.__prefix = ((t.textContent||t.innerText||"").trim().substring(0,5)||"").toUpperCase();

          // === Hover in (전면 고정: hover) ===
          function onOver(){
            marker.setImage(hoverImage);
            // 호버는 일시 전면
            bringToFront(map, marker, overlay, 'hover');
            el.style.transform = (marker === selectedMarker)
              ? `translateY(${hoverY - 2}px)`   // 선택 마커 호버: gap=4
              : `translateY(${hoverY}px)`;
          }

          // === Hover out (⭐ 선택 쌍이 있다면 전면을 선택 쌍으로 즉시 복귀) ===
          function onOut(){
            marker.setImage(normalImage);

            const isCurrentFrontHover =
              (frontMarker === marker && frontOverlay === overlay && frontReason === 'hover');

            if (isCurrentFrontHover) {
              // 호버 비주얼만 원복
              el.style.transform = `translateY(${baseY}px)`;

              // 🔑 파란 테두리(선택)가 존재하면 전면을 즉시 선택 쌍으로 되돌림
              if (selectedMarker && selectedOverlayObj) {
                bringToFront(map, selectedMarker, selectedOverlayObj, 'clickMarker');
                if (selectedOverlayEl) {
                  selectedOverlayEl.style.border = "2px solid blue";
                  selectedOverlayEl.style.transform = `translateY(${baseY - 2}px)`; // gap=4 유지
                }
              }
              // 선택이 없으면(파란 테두리 없음) 이전 규칙대로: 마지막 호버 전면 유지
              return;
            }

            if (marker === selectedMarker) {
              // 선택 마커의 mouseout: 선택 비주얼 유지 + 전면 보증
              el.style.transform = `translateY(${baseY - 2}px)`;
              el.style.border = "2px solid blue";
              bringToFront(map, selectedMarker, selectedOverlayObj||overlay, 'clickMarker');
            } else {
              // 비선택 일반 복귀
              el.style.transform = `translateY(${baseY}px)`;
              if (map.getLevel()>3 && overlay !== frontOverlay && overlay !== selectedOverlayObj) {
                overlay.setMap(null);
              }
              if (!(frontMarker===marker && frontOverlay===overlay)) setDefaultZ(marker, overlay);
              if (frontMarker && frontOverlay) setFrontZ(frontMarker, frontOverlay);
            }
          }

          kakao.maps.event.addListener(marker, "mouseover", onOver);
          kakao.maps.event.addListener(marker, "mouseout",  onOut);
          el.addEventListener("mouseover", onOver);
          el.addEventListener("mouseout",  onOut);

          // === 마커 클릭 (mousedown → 전면+점프, mouseup → 테두리/필터) ===
          kakao.maps.event.addListener(marker, "mousedown", function(){
            marker.setImage(jumpImage);
            clickStartTime = Date.now();

            // 이전 선택 외형 정리
            if (selectedOverlayEl) selectedOverlayEl.style.border = "1px solid #ccc";

            // 선택 교체
            selectedMarker = marker;
            selectedOverlayEl = el;
            selectedOverlayObj = overlay;

            // 전면 고정(클릭)
            bringToFront(map, marker, overlay, 'clickMarker');

            // 점프 (gap=4)
            el.style.border = "2px solid blue";
            el.style.transform = `translateY(${jumpY - 2}px)`;
          });

          kakao.maps.event.addListener(marker, "mouseup", function(){
            const elapsed = Date.now() - clickStartTime;
            const delay = Math.max(0, 100 - elapsed);
            setTimeout(function(){
              // 좌표/필터
              const lat = marker.__lat, lng = marker.__lng, prefix = marker.__prefix;
              const g = document.getElementById("gpsyx");
              const k = document.getElementById("keyword");
              if (g) g.value = `${lat}, ${lng}`;
              if (k) k.value = prefix;
              scheduleFilterSelTxt(prefix);

              // 비주얼 복귀(선택 유지)
              marker.setImage(normalImage);
              el.style.border = "2px solid blue";
              el.style.transition = "transform .2s ease, border .2s ease";
              el.style.transform = `translateY(${baseY - 2}px)`;

              // 전면 유지(선택)
              bringToFront(map, marker, overlay, 'clickMarker');

              setTimeout(()=>{ el.style.transition = "transform .15s ease, border .15s ease"; },200);
            }, delay);
          });

          // === 오버레이 클릭: 전면만, 테두리/입력/필터 X (sticky) ===
          el.addEventListener("click", function(){
            bringToFront(map, marker, overlay, 'clickOverlay');
            el.style.border = "1px solid #ccc";              // 테두리 금지
            el.style.transform = `translateY(${baseY}px)`;    // 호버 아님 → 기본 위치
          });

          markers.push(marker);
          overlays.push(overlay);
        })(i);
      }
      idx = end;
      if (idx < positions.length) setTimeout(createBatch, 0);
      else { window.markers = markers; }
    }
    createBatch();

    // === idle: 전면/선택은 항상 표시, 나머지는 level<=3에서만 ===
    kakao.maps.event.addListener(map, "idle", function(){
      const level = map.getLevel();
      overlays.forEach(o=>{
        const m = o.__marker;
        if (!m) return;
        if ((frontOverlay && o===frontOverlay) || (selectedOverlayObj && o===selectedOverlayObj)) {
          o.setMap(map);
        } else {
          if (level<=3) o.setMap(map); else o.setMap(null);
        }
        // z정리: 전면쌍은 전면, 그 외는 기본
        if (frontOverlay && o===frontOverlay) setFrontZ(m,o);
        else setDefaultZ(m,o);
      });
      if (frontMarker && frontOverlay) setFrontZ(frontMarker, frontOverlay);
    });

    // === 지도 클릭: 선택/전면 모두 초기화 (이 기준 버전 유지) ===
    kakao.maps.event.addListener(map, "click", function(){
      clearSelection(map);
      clearFront(map);
    });
  };
})();
