// markers-handler.js (v2025-09-29e-FIXED-FINAL)
      (function () {
          console.log("[markers-handler] loaded v2025-09-29e-FIXED-FINAL");

          // === 오버레이 이름 추출 함수 (간소화) ===
          function extractOverlayName(fullContent) {
            if (!fullContent) return "";
            let name = String(fullContent).trim();
            // 정규식: 뒤에 붙은 숫자, 괄호 등 (예: 01(회전))을 제거
            // "쓰-001-가야함안01(회전)" -> "쓰-001-가야함안"
            const regex = /(\s*[\(\[].*?[\)\]])?(\s*[-_]?\s*\d+)?$/;
            name = name.replace(regex, '');
            return name.trim();
          }

          // === 검색어 추출 함수 (순수 한글만 추출) ===
          function extractFacilityName(fullContent) {
            if (!fullContent) return "";
            const hangulMatches = String(fullContent).match(/[가-힣]+/g); 
            return hangulMatches ? hangulMatches.join('').trim() : "";
          }
          
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

          // === 전역 상태 및 위치/높이 ===
          let selectedMarker = null;     
          let selectedOverlayEl = null;
          let selectedOverlayObj = null;
          let frontMarker = null;        
          let frontOverlay = null;
          let frontReason = null;        
          let normalImage, hoverImage, jumpImage;
          let clickStartTime = 0;
          const normalH = 42, hoverH = 50.4, gap = 2;
          const baseY  = -(normalH + gap);  
          const hoverY = -(hoverH  + gap);  
          const jumpY  = -(70      + gap);  

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
            overlay.setMap(map);        
            setFrontZ(marker, overlay);
            frontMarker = marker; frontOverlay = overlay; frontReason = reason;
          }
        
          // === 검색창/제안 UI 주입 (수정 없음) ===
          function pushToSearchUI(query) {
            if (!query) { console.warn("[markers-handler] empty query; skip"); return; }
            const kw = document.querySelector('.gx-suggest-search .gx-input');
            if (!kw) {  console.warn("[markers-handler] .gx-suggest-search .gx-input not found");  return;  }

            setTimeout(() => {
              try {
                kw.value = query;
                kw.dispatchEvent(new Event('input',  { bubbles: true }));
                kw.dispatchEvent(new Event('change', { bubbles: true }));
              } catch(e){
                console.error("[markers-handler] pushToSearchUI error:", e);
              }
            }, 0);
          }

          // === 지도 클릭: 파란 테두리만 해제 ===
          function bindMapClickToClearSelection(map){
            kakao.maps.event.addListener(map, "click", function(){
              if (selectedOverlayEl) selectedOverlayEl.style.border = "1px solid #ccc";
              selectedMarker = null; selectedOverlayEl = null; selectedOverlayObj = null;
            });
          }

          // === 마커 초기화 ===
          window.initMarkers = function (map, positions) {
            bindMapClickToClearSelection(map);

            // 이미지 정의 (수정 없음)
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

                  // --- Marker ---
                  const marker = new kakao.maps.Marker({
                    map, position: pos.latlng, image: normalImage, clickable:true, zIndex: Z.BASE+1
                  });
                  marker.group = pos.group ? String(pos.group) : (pos.line ? String(pos.line) : null);

                  // --- Overlay ---
                  const el = document.createElement("div");
                  el.className = "overlay-hover";
                  el.style.transform = `translateY(${baseY}px)`;
                  // 🚀 오버레이 텍스트 설정: 간소화된 이름을 사용합니다.
                  el.textContent = extractOverlayName(pos.content);

                  const overlay = new kakao.maps.CustomOverlay({
                    position: pos.latlng, content: el, yAnchor:1, map:null
                  });
                  overlay.setZIndex(Z.BASE);

                  marker.__overlay = overlay; overlay.__marker = marker;
                  marker.__lat = pos.latlng.getLat(); marker.__lng = pos.latlng.getLng();

                  // === 이벤트 리스너 (수정 없음) ===
                  function onOver(){
                    marker.setImage(hoverImage);
                    bringToFront(map, marker, overlay, 'hover');
                    el.style.transform = (marker===selectedMarker) ? `translateY(${hoverY-2}px)` : `translateY(${hoverY}px)`;
                  }
                  function onOut(){
                    marker.setImage(normalImage);
                    const wasHoverFront = (frontMarker===marker && frontOverlay===overlay && frontReason==='hover');
                    if (wasHoverFront){
                      el.style.transform=`translateY(${baseY}px)`;
                      if (selectedMarker && selectedOverlayObj){
                        bringToFront(map, selectedMarker, selectedOverlayObj, 'clickMarker');
                        if (selectedOverlayEl){ selectedOverlayEl.style.border="2px solid blue"; selectedOverlayEl.style.transform=`translateY(${baseY-2}px)`; }
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
                  kakao.maps.event.addListener(marker, "mouseout",  onOut);
                  el.addEventListener("mouseover", onOver);
                  el.addEventListener("mouseout",  onOut);
                  kakao.maps.event.addListener(marker, "mousedown", function(){
                    marker.setImage(jumpImage); clickStartTime=Date.now();
                    if (selectedOverlayEl) selectedOverlayEl.style.border="1px solid #ccc";
                    selectedMarker=marker; selectedOverlayEl=el; selectedOverlayObj=overlay;
                    bringToFront(map, marker, overlay, 'clickMarker');
                    el.style.border="2px solid blue"; el.style.transform=`translateY(${jumpY-2}px)`;
                  });
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

                      // 🚀 ② 마커 표시명에서 '순수 시설명'만 추출하여 주입
                      const facilityName = extractFacilityName(pos.content); 
                      pushToSearchUI(facilityName);

                      setTimeout(()=>{ el.style.transition="transform .15s ease, border .15s ease"; }, 200);
                    }, delay);
                  });
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

            // === idle (수정 없음) ===
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
