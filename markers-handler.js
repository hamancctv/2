// ... (script src 부분은 유지) ...

  <script>
      // markers-handler.js (v2025-09-29f-NAME-FIXED)
      (function () {
          console.log("[markers-handler] loaded v2025-09-29f-NAME-FIXED");
          // 이 함수는 오버레이 이름 간소화만 담당합니다. (name1 사용)
          function extractOverlayName(fullContent) {
            if (!fullContent) return "";
            let name = String(fullContent).trim();
            const regex = /(\s*[\(\[].*?[\)\]])?(\s*[-_]?\s*\d+)?$/;
            name = name.replace(regex, '');
            return name.trim();
          }

          // 이전 버전의 extractPureHangul, extractFacilityName 함수는 더 이상 필요 없습니다.
          
          // === Z 레이어, 상태 변수, 위치/높이, Z-index 유틸 등 (수정 없음) ===
          const style = document.createElement("style"); /* ... (스타일 생략) ... */
          const Z = { BASE:100, FRONT:100000 }; 
          let selectedMarker = null; let selectedOverlayEl = null; let selectedOverlayObj = null;
          let frontMarker = null; let frontOverlay = null; let frontReason = null;
          let normalImage, hoverImage, jumpImage; let clickStartTime = 0;
          const normalH = 42, hoverH = 50.4, gap = 2;
          const baseY  = -(normalH + gap); const hoverY = -(hoverH  + gap); const jumpY  = -(70  + gap);
          function setDefaultZ(marker, overlay){ /* ... */ }
          function setFrontZ(marker, overlay){ /* ... */ }
          function bringToFront(map, marker, overlay, reason){ /* ... */ }
          function pushToSearchUI(query) { /* ... (수정 없음) ... */ }
          function bindMapClickToClearSelection(map){ /* ... */ }

          // === 마커 초기화 ===
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

                  // --- Marker ---
                  const marker = new kakao.maps.Marker({
                    map, position: pos.latlng, image: normalImage, clickable:true, zIndex: Z.BASE+1
                  });
                  marker.group = pos.group ? String(pos.group) : (pos.line ? String(pos.line) : null);

                  // --- Overlay ---
                  const el = document.createElement("div");
                  el.className = "overlay-hover";
                  el.style.transform = `translateY(${baseY}px)`;
                  // name1을 기준으로 간소화된 이름을 표시합니다.
                  el.textContent = extractOverlayName(pos.content); 

                  const overlay = new kakao.maps.CustomOverlay({
                    position: pos.latlng, content: el, yAnchor:1, map:null
                  });
                  overlay.setZIndex(Z.BASE);

                  marker.__overlay = overlay; overlay.__marker = marker;
                  marker.__lat = pos.latlng.getLat(); marker.__lng = pos.latlng.getLng();
                  // 🌟 검색용 name2를 마커에 저장해둡니다.
                  marker.__searchName = pos.searchName; 
                  
                  // === 이벤트 리스너 (생략/유지) ===
                  function onOver(){ /* ... */ }
                  function onOut(){ /* ... */ }
                  kakao.maps.event.addListener(marker, "mouseover", onOver);
                  kakao.maps.event.addListener(marker, "mouseout",  onOut);
                  el.addEventListener("mouseover", onOver);
                  el.addEventListener("mouseout",  onOut);
                  kakao.maps.event.addListener(marker, "mousedown", function(){ /* ... */ });
                  kakao.maps.event.addListener(marker, "mouseup", function(){
                    const elapsed=Date.now()-clickStartTime; const delay=Math.max(0,100-elapsed);
                    setTimeout(function(){
                      // ... (마커 상태 복구 로직 생략) ...
                      marker.setImage(normalImage);
                      el.style.border="2px solid blue";
                      el.style.transition="transform .2s ease, border .2s ease";
                      el.style.transform=`translateY(${baseY-2}px)`;
                      bringToFront(map, marker, overlay, 'clickMarker');

                      // ① 좌표 input 업데이트
                      const g = document.getElementById("gpsyx");
                      if (g) g.value = `${marker.__lat}, ${marker.__lng}`;

                      // 🌟 ② 마커에 저장된 searchName (name2)을 검색창에 주입합니다.
                      console.log("[markers-handler] searchName:", marker.__searchName);
                      pushToSearchUI(marker.__searchName); 

                      setTimeout(()=>{ el.style.transition="transform .15s ease, border .15s ease"; }, 200);
                    }, delay);
                  });
                  el.addEventListener("click", function(){ /* ... */ });
                  markers.push(marker); overlays.push(overlay);
                })(i);
              }
              // ... (나머지 배치 및 idle 로직 생략/유지) ...
            }
            createBatch();
            kakao.maps.event.addListener(map, "idle", function(){ /* ... */ });
          };
      })();
  </script>
