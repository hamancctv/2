<script>
    // markers-handler.js (v2025-09-29d-FINAL-QUERY-V3)
    (function () {
        console.log("[markers-handler] loaded v2025-09-29d-FINAL-QUERY-V3");

        // === Z 레이어 ===
        const Z = { BASE:100, FRONT:100000 };

        // === 전역 상태 (생략)...
        let selectedMarker = null;       
        let selectedOverlayEl = null;
        let selectedOverlayObj = null;

        let frontMarker = null;          
        let frontOverlay = null;
        let frontReason = null;          

        let normalImage, hoverImage, jumpImage;
        let clickStartTime = 0;

        // === 위치/높이 (생략)...
        const normalH = 42, hoverH = 50.4, gap = 2;
        const baseY  = -(normalH + gap);  
        const hoverY = -(hoverH  + gap);  
        const jumpY  = -(70      + gap);  

        // === z-index 유틸 (생략)...
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
          overlay.setMap(map);         
          setFrontZ(marker, overlay);
          frontMarker = marker; frontOverlay = overlay; frontReason = reason;
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

              // input 이벤트를 발생시켜 search-suggest.js의 리스너가 반응하도록 유도 (자동 제안창 표시)
              kw.dispatchEvent(new Event('input',  { bubbles: true })); 
              kw.dispatchEvent(new Event('change', { bubbles: true }));
            } catch(e){
              console.error("[markers-handler] pushToSearchUI error:", e);
            }
          }, 0);
        }

        // === 지도 클릭: 파란 테두리만 해제 (생략)...
        function bindMapClickToClearSelection(map){
          kakao.maps.event.addListener(map, "click", function(){
            if (selectedOverlayEl) selectedOverlayEl.style.border = "1px solid #ccc";
            selectedMarker = null; selectedOverlayEl = null; selectedOverlayObj = null;
          });
        }

        // === 마커 초기화 (생략)...
        window.initMarkers = function (map, positions) {
          bindMapClickToClearSelection(map);

          normalImage = new kakao.maps.MarkerImage("https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png", new kakao.maps.Size(30,42), { offset:new kakao.maps.Point(15,42) });
          hoverImage = new kakao.maps.MarkerImage("https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png", new kakao.maps.Size(36,50.4), { offset:new kakao.maps.Point(18,50.4) });
          jumpImage = new kakao.maps.MarkerImage("https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png", new kakao.maps.Size(30,42), { offset:new kakao.maps.Point(15,70) });

          const markers = []; const overlays = [];
          const batchSize = 50; let idx = 0;

          function createBatch(){
            const end = Math.min(positions.length, idx + batchSize);
            for (let i=idx;i<end;i++){
              (function(i){
                const pos = positions[i];
                // Marker / Overlay 생성 및 이벤트 리스너 바인딩 로직 (생략)...
                const marker = new kakao.maps.Marker({
                  map, position: pos.latlng, image: normalImage, clickable:true, zIndex: Z.BASE+1
                });
                marker.group = pos.group ? String(pos.group) : (pos.line ? String(pos.line) : null);

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
                
                // 마우스 이벤트 바인딩 (생략)...
                kakao.maps.event.addListener(marker, "mouseover", function(){
                    marker.setImage(hoverImage);
                    bringToFront(map, marker, overlay, 'hover');
                    el.style.transform = (marker===selectedMarker) ? `translateY(${hoverY-2}px)` : `translateY(${hoverY}px)`;
                });
                kakao.maps.event.addListener(marker, "mouseout",  function(){
                    marker.setImage(normalImage);
                    const wasHoverFront = (frontMarker===marker && frontReason==='hover');
                    if (wasHoverFront && selectedMarker!==marker) { el.style.transform=`translateY(${baseY}px)`; }
                    if (selectedMarker===marker) {
                        el.style.transform=`translateY(${baseY-2}px)`; 
                        el.style.border="2px solid blue";
                    }
                    if (map.getLevel()>3 && overlay!==frontOverlay && overlay!==selectedOverlayObj) {
                        if (selectedMarker!==marker) overlay.setMap(null);
                    }
                });
                el.addEventListener("mouseover", function(){
                    marker.setImage(hoverImage);
                    bringToFront(map, marker, overlay, 'hover');
                    el.style.transform = (marker===selectedMarker) ? `translateY(${hoverY-2}px)` : `translateY(${hoverY}px)`;
                });
                el.addEventListener("mouseout", function(){
                    marker.setImage(normalImage);
                    if (selectedMarker===marker) {
                        el.style.transform=`translateY(${baseY-2}px)`; 
                        el.style.border="2px solid blue";
                    } else {
                        el.style.transform=`translateY(${baseY}px)`;
                        if (map.getLevel()>3 && overlay!==frontOverlay && overlay!==selectedOverlayObj) overlay.setMap(null);
                    }
                });

                kakao.maps.event.addListener(marker, "mousedown", function(){
                  marker.setImage(jumpImage); clickStartTime=Date.now();
                  if (selectedOverlayEl) selectedOverlayEl.style.border="1px solid #ccc";
                  selectedMarker=marker; selectedOverlayEl=el; selectedOverlayObj=overlay;
                  bringToFront(map, marker, overlay, 'clickMarker');
                  el.style.border="2px solid blue"; el.style.transform=`translateY(${jumpY-2}px)`;
                });
                
                // === Marker mouseup: 복귀 + 좌표/검색 주입 (최종 수정된 로직) ===
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

                    // 💥 ② 마커 표시명에서 '순수 시설명'만 추출하여 주입
                    const fullContent = String(pos.content ?? "").trim();
                    let facilityName = fullContent;

                    // 1. **앞부분의 모든 코드 제거**
                    // 정규식: (문자 또는 숫자)-(숫자)-(문자 또는 숫자) 패턴이나 (문자 또는 숫자)- 숫자 패턴을 모두 포함하여
                    // 첫 한글이 나오기 전까지의 모든 코드와 하이픈, 공백을 제거합니다.
                    // 예: "도-012-칠북덕남01" -> "칠북덕남01"
                    // 예: "도-002 칠북덕남01" -> "칠북덕남01"
                    // 이 로직이 가장 강력하게 앞 코드를 제거합니다.
                    facilityName = facilityName.replace(/^[^가-힣]*([가-힣].*)/, '$1').trim();
                    
                    // 2. **끝의 괄호와 내용 제거**
                    // 예: "칠북덕남(회전)" -> "칠북덕남"
                    facilityName = facilityName.replace(/\s*\(.*\)$/, '').trim();
                    
                    // 3. **끝의 숫자와 공백 제거 (버전 번호 제거)**
                    // 예: "칠북덕남01" -> "칠북덕남"
                    facilityName = facilityName.replace(/(\s*[0-9]+)$/, '').trim();


                    console.log("[markers-handler] facilityName:", facilityName);
                    pushToSearchUI(facilityName);

                    setTimeout(()=>{ el.style.transition="transform .15s ease, border .15s ease"; }, 200);
                  }, delay);
                });

                // Overlay click, idle 로직 (생략)...

                markers.push(marker); overlays.push(overlay);
              })(i);
            }
            idx=end;
            if (idx<positions.length) setTimeout(createBatch, 0);
            else window.markers=markers;
          }
          createBatch();

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
</script>
