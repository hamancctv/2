// markers-handler.js (v2025-10-05 FINAL-6CUT-NO-SEARCH + INTERLOCK + NAME1-TAIL)
(function () {
  console.log("[markers-handler] loaded v2025-10-05 FINAL + name1 tail to input");

  /* ==================== 스타일 ==================== */
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

  /* ==================== 상수 / 상태 ==================== */
  const Z = { BASE: 100, FRONT: 100000 };

  let selectedMarker = null;
  let selectedOverlayEl = null;
  let selectedOverlayObj = null;

  let frontMarker = null;
  let frontOverlay = null;
  let frontReason  = null;

  let normalImage, hoverImage, jumpImage;
  let clickStartTime = 0;

  // 마커/오버레이 수직 위치
  const normalH = 42, hoverH = 50.4, gap = 2;
  const baseY  = -(normalH + gap);   // -44
  const hoverY = -(hoverH  + gap);   // -52.4
  const jumpY  = -(70      + gap);   // -72

  /* ==================== 유틸 ==================== */
  function setDefaultZ(marker, overlay){
    if (marker)  marker.setZIndex(Z.BASE + 1);
    if (overlay) overlay.setZIndex(Z.BASE);
  }
  function setFrontZ(marker, overlay){
    if (marker)  marker.setZIndex(Z.FRONT);
    if (overlay) overlay.setZIndex(Z.FRONT + 1);
  }
  function bringToFront(map, marker, overlay, reason){
    if (!marker || !overlay) return;
    if (frontMarker && frontOverlay && (frontMarker !== marker || frontOverlay !== overlay)) {
      setDefaultZ(frontMarker, frontOverlay);
      if (map.getLevel() > 3 && frontMarker !== selectedMarker) {
        frontOverlay.setMap(null);
      }
    }
    overlay.setMap(map);          // 전면 후보는 항상 표출
    setFrontZ(marker, overlay);
    frontMarker = marker; frontOverlay = overlay; frontReason = reason;
  }

  // (구) 앞 6자리 제거 후 한글만 추출 (현재 미사용, 남겨둠)
  function extractPureHangulFrom6(str){
    const tmp = document.createElement("div");
    tmp.innerHTML = String(str ?? "");
    const plain = tmp.textContent || tmp.innerText || "";
    const sliced = plain.slice(6);
    const m = sliced.match(/[가-힣]+/);
    return m ? m[0] : "";
  }

  // ✅ name1에서 "두 번째 하이픈 뒤" 문자열 반환 (하나만 있으면 첫 하이픈 뒤)
  function extractAfterSecondHyphen(s){
    s = (s || "").toString().trim();
    const i1 = s.indexOf("-");
    if (i1 < 0) return s;
    const i2 = s.indexOf("-", i1 + 1);
    return (i2 >= 0 ? s.slice(i2 + 1) : s.slice(i1 + 1)).trim();
  }

  // ✅ 검색 입력창(.gx-input 우선, 없으면 #keyword)에 name1 tail 채우기
  function fillSearchInputWithTail(baseText){
    const tail = extractAfterSecondHyphen(baseText || "");
    if (!tail) return;
    const input = document.querySelector(".gx-input") || document.getElementById("keyword");
    if (!input) return;
    input.value = tail;
    try { input.dispatchEvent(new Event("input", { bubbles:true })); } catch {}
  }

  // 지도 클릭 시 선택 해제
  function bindMapClickToClearSelection(map){
    kakao.maps.event.addListener(map, "click", function(){
      if (selectedOverlayEl) selectedOverlayEl.style.border = "1px solid #ccc";
      selectedMarker = null; selectedOverlayEl = null; selectedOverlayObj = null;
    });
  }

  /* ==================== 마커 초기화 ==================== */
  window.initMarkers = function (map, positions) {
    bindMapClickToClearSelection(map);

    // 마커 이미지
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

    const markers = []; const overlays = [];
    const batchSize = 50; let idx = 0;

    function createBatch(){
      const end = Math.min(positions.length, idx + batchSize);
      for (let i = idx; i < end; i++){
        (function(i){
          const pos = positions[i];

          // ---------- Marker ----------
          const marker = new kakao.maps.Marker({
            map,
            position: pos.latlng,
            image: normalImage,
            clickable: true,
            zIndex: Z.BASE + 1
          });
          
          marker.group = pos.group ? String(pos.group) : (pos.line ? String(pos.line) : null);
          marker.__pos = pos.latlng;                   // (MST용) LatLng 직접 저장
          marker.__lat = pos.latlng.getLat();
          marker.__lng = pos.latlng.getLng();
          marker.__name1 = (pos.name1 || pos.content || ""); // ✅ 입력창 채움에 사용

          // ---------- Overlay ----------
          const el = document.createElement("div");
          el.className = "overlay-hover";
          el.style.transform = `translateY(${baseY}px)`;
          el.textContent = pos.content;

          const overlay = new kakao.maps.CustomOverlay({
            position: pos.latlng,
            content:  el,
            yAnchor:  1,
            map:      null
          });
          overlay.setZIndex(Z.BASE);

          marker.__overlay = overlay;
          overlay.__marker = marker;

          /* ===== Hover in ===== */
          function onOver(){
            if (window.isInteractionLocked && window.isInteractionLocked()) return; // 거리재기/로드뷰 등 인터락
            marker.setImage(hoverImage);
            bringToFront(map, marker, overlay, 'hover');
            el.style.transform = (marker === selectedMarker)
              ? `translateY(${hoverY-2}px)`
              : `translateY(${hoverY}px)`;
          }

          /* ===== Hover out ===== */
          function onOut(){
            if (window.isInteractionLocked && window.isInteractionLocked()) return;
            marker.setImage(normalImage);
            const wasHoverFront =
              (frontMarker === marker && frontOverlay === overlay && frontReason === 'hover');

            if (wasHoverFront){
              el.style.transform = `translateY(${baseY}px)`;
              if (selectedMarker && selectedOverlayObj){
                bringToFront(map, selectedMarker, selectedOverlayObj, 'clickMarker');
                if (selectedOverlayEl){
                  selectedOverlayEl.style.border = "2px solid blue";
                  selectedOverlayEl.style.transform = `translateY(${baseY-2}px)`;
                }
              }
              return;
            }

            if (marker === selectedMarker){
              el.style.transform = `translateY(${baseY-2}px)`;
              el.style.border = "2px solid blue";
              bringToFront(map, selectedMarker, selectedOverlayObj || overlay, 'clickMarker');
            } else {
              el.style.transform = `translateY(${baseY}px)`;
              // 레벨이 높으면 전면/선택 오버레이 외에는 숨김
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
          kakao.maps.event.addListener(marker, "mouseout",  onOut);
          el.addEventListener("mouseover", onOver);
          el.addEventListener("mouseout",  onOut);

          /* ===== Marker mousedown ===== */
          kakao.maps.event.addListener(marker, "mousedown", function(){
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
            if (window.isInteractionLocked && window.isInteractionLocked()) return;
            const elapsed = Date.now() - clickStartTime;
            const delay = Math.max(0, 100 - elapsed);

            setTimeout(function(){
              marker.setImage(normalImage);
              el.style.border = "2px solid blue";
              el.style.transition = "transform .2s ease, border .2s ease";
              el.style.transform = `translateY(${baseY-2}px)`;
              bringToFront(map, marker, overlay, 'clickMarker');

              // 좌표 갱신
              const g = document.getElementById("gpsyx");
              if (g) g.value = `${marker.__lat}, ${marker.__lng}`;

              // ✅ name1의 두 번째 하이픈 뒤 텍스트를 검색 입력창에 채우기
              fillSearchInputWithTail(marker.__name1);

              setTimeout(()=>{ el.style.transition = "transform .15s ease, border .15s ease"; }, 200);
            }, delay);
          });

          /* ===== Overlay click ===== */
          el.addEventListener("click", function(){
            if (window.isInteractionLocked && window.isInteractionLocked()) return;

            if (selectedOverlayEl) selectedOverlayEl.style.border = "1px solid #ccc";
            selectedMarker = marker; selectedOverlayEl = el; selectedOverlayObj = overlay;

            bringToFront(map, marker, overlay, 'clickOverlay');

            el.style.border = "2px solid blue";
            if (marker.getImage() === hoverImage) {
              el.style.transform = `translateY(${hoverY-2}px)`;
            } else {
              el.style.transform = `translateY(${baseY-2}px)`;
            }

            // 좌표 갱신
            const g = document.getElementById("gpsyx");
            if (g) g.value = `${marker.__lat}, ${marker.__lng}`;

            // ✅ 오버레이 클릭 시에도 입력창 갱신
            fillSearchInputWithTail(marker.__name1);
          });

          markers.push(marker);
          overlays.push(overlay);
        })(i);
      }
      idx = end;

      if (idx < positions.length) {
        setTimeout(createBatch, 0);
      } else {
        window.markers = markers; // 외부(검색, MST)에서 접근 가능
        // 생성 완료 알림 필요하면: document.dispatchEvent(new Event('markers:updated'));
      }
    }
    createBatch();

    /* ===== idle: 확대 수준에 따른 오버레이 표시/숨김 ===== */
    kakao.maps.event.addListener(map, "idle", function(){
      const level = map.getLevel();
      const list = window.markers || [];

      for (const m of list){
        const o = m.__overlay;
        if (!o) continue;

        if ((frontOverlay && o === frontOverlay) || (selectedOverlayObj && o === selectedOverlayObj)) {
          o.setMap(map);
        } else {
          if (level <= 3) o.setMap(map);
          else            o.setMap(null);
        }

        if (frontOverlay && o === frontOverlay) setFrontZ(m, o);
        else setDefaultZ(m, o);
      }

      if (frontMarker && frontOverlay) setFrontZ(frontMarker, frontOverlay);
    });
  };
})();
