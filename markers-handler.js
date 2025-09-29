(function () {
    console.log("[markers-handler] loaded v2025-09-30-FINAL-FIXED");

    // === Z 레이어 및 상태 변수 ===
    const Z = { BASE:100, FRONT:100000 };
    let selectedMarker = null; let selectedOverlayObj = null; 
    let frontMarker = null; let frontOverlay = null; 
    let normalImage, hoverImage, jumpImage; let clickStartTime = 0;
    const normalH = 42, hoverH = 50.4, gap = 2;
    const baseY = -(normalH + gap); const hoverY = -(hoverH + gap); const jumpY = -(70 + gap);

    // ❌ extractSearchQuery 함수 제거됨 (이전에 문제의 원인이었습니다)

// === 순수 한글 첫 단어만 추출 ===
function extractPureHangul(str){
  // HTML 태그 가능성 대비
  const tmp = document.createElement("div");
  tmp.innerHTML = String(str ?? "");
  const plain = tmp.textContent || tmp.innerText || "";

  // ✅ 문자열에서 첫 번째 한글 덩어리만 추출
  const m = plain.match(/[가-힣]+/);
  return m ? m[0] : "";
}


    // === Z-Index 및 상태 관리 유틸 ===
    function setDefaultZ(marker, overlay){
        if (marker) {
            marker.setImage(normalImage);
            marker.setZIndex(Z.BASE + 1);
        }
        if (overlay) {
            overlay.setMap(null);
            overlay.setZIndex(Z.BASE);
            const el = overlay.getContent();
            el.style.border = "1px solid #ccc";
            el.style.transform = `translateY(${baseY}px)`;
        }
    }
    function setFrontZ(marker, overlay){
        if (marker) marker.setZIndex(Z.FRONT + 1);
        if (overlay) overlay.setZIndex(Z.FRONT);
    }
    function bringToFront(map, marker, overlay, reason){
        if (frontMarker && frontMarker !== marker) {
            setDefaultZ(frontMarker, frontOverlay);
            if (frontMarker !== selectedMarker) frontOverlay.setMap(null);
        }

        if (selectedMarker && selectedMarker !== marker) {
            setDefaultZ(selectedMarker, selectedOverlayObj);
            selectedMarker = null; selectedOverlayObj = null;
        }

        if (reason === 'clickMarker') {
            selectedMarker = marker; selectedOverlayObj = overlay;
            overlay.setMap(map);
            setFrontZ(marker, overlay);
        }
        // 전면으로 가져오기
        overlay.setMap(map);
        setFrontZ(marker, overlay);

        frontMarker = marker; frontOverlay = overlay; frontReason = reason;
    }

    // markers-handler.js 내부, pushToSearchUI 함수 (유지)
    function pushToSearchUI(query) {
        const kw = document.querySelector('.gx-suggest-search .gx-input');
        if (kw) {
            kw.value = query;
            kw.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    function bindMapClickToClearSelection(map){
        kakao.maps.event.addListener(map, 'click', function(mouseEvent) {   
            if (selectedMarker) {
                setDefaultZ(selectedMarker, selectedOverlayObj);
                selectedOverlayObj.setMap(null);
                selectedMarker = null; selectedOverlayObj = null;
            }
            if (frontMarker) {
                setDefaultZ(frontMarker, frontOverlay);
                frontMarker = null; frontOverlay = null; frontReason = null;
            }
        });
    }

    // === 마커 초기화 ===
    window.initMarkers = function (map, positions) {
        bindMapClickToClearSelection(map);
        // ... (Image 생성 로직) ...
        normalImage = new kakao.maps.MarkerImage("https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png", new kakao.maps.Size(30,42), { offset:new kakao.maps.Point(15,42) });
        hoverImage = new kakao.maps.MarkerImage("https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png", new kakao.maps.Size(36,50.4), { offset:new kakao.maps.Point(18,50.4) });
        jumpImage = new kakao.maps.MarkerImage("https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png", new kakao.maps.Size(30,42), { offset:new kakao.maps.Point(15,70) });


        const markers = [];
        const batchSize = 50; let idx = 0;

        function createBatch(){
            const end = Math.min(positions.length, idx + batchSize);
            for (let i=idx;i<end;i++){
                (function(i){
                    const pos = positions[i];

                    // --- Marker & Overlay 생성 로직 ---
                    const marker = new kakao.maps.Marker({
                        map, position: pos.latlng, image: normalImage, clickable:true, zIndex: Z.BASE+1
                    });
                    marker.group = pos.group;
                    const el = document.createElement("div");
                    el.className = "overlay-hover";
                    el.style.transform = `translateY(${baseY}px)`;
                    el.textContent = extractOverlayName(pos.content); 
                    const overlay = new kakao.maps.CustomOverlay({
                        position: pos.latlng, content: el, yAnchor:1, map:null
                    });
                    overlay.setZIndex(Z.BASE);

                    marker.__overlay = overlay; overlay.__marker = marker;
                    marker.__lat = pos.latlng.getLat(); marker.__lng = pos.latlng.getLng();
                    marker.__searchName = pos.searchName; 
                    
                    // --- 이벤트 리스너 (mouseover, mouseout, mousedown) ---
                    function onOver(){
                        if (selectedMarker === marker) return;
                        marker.setImage(hoverImage);
                        overlay.setMap(map);
                        el.style.transform = `translateY(${hoverY}px)`;
                        bringToFront(map, marker, overlay, 'hoverMarker');
                    }
                    function onOut(){
                        if (selectedMarker === marker) return;
                        if (frontMarker === marker && frontReason === 'hoverMarker') {
                            setDefaultZ(marker, overlay);
                            overlay.setMap(null);
                            frontMarker = null; frontOverlay = null; frontReason = null;
                        }
                    }
                    kakao.maps.event.addListener(marker, "mouseover", onOver);
                    kakao.maps.event.addListener(marker, "mouseout",  onOut);
                    el.addEventListener("mouseover", onOver);
                    el.addEventListener("mouseout",  onOut);

                    kakao.maps.event.addListener(marker, "mousedown", function(){
                        marker.setImage(jumpImage);
                        clickStartTime = Date.now();
                    });

                    // 🌟 마우스 업 이벤트 리스너 (수정된 부분)
                    kakao.maps.event.addListener(marker, "mouseup", function(){
                        const elapsed=Date.now()-clickStartTime; const delay=Math.max(0,100-elapsed);
                        setTimeout(function(){
                            // 클릭 상태 복구 및 선택 상태 설정
                            marker.setImage(normalImage);
                            el.style.border="2px solid blue";
                            el.style.transition="transform .2s ease, border .2s ease";
                            el.style.transform=`translateY(${baseY-2}px)`;
                            bringToFront(map, marker, overlay, 'clickMarker');

                            // ① 좌표 input 업데이트
                            const g = document.getElementById("gpsyx");
                            if (g) g.value = `${marker.__lat}, ${marker.__lng}`;

                            // 🌟 ② 수정: 오버레이의 간소화된 name1을 검색어로 주입
                            // el.textContent는 이미 extractOverlayName(pos.content) 결과입니다.
                            const newQuery = el.textContent || "";

                            pushToSearchUI(newQuery); 

                            setTimeout(()=>{ el.style.transition="transform .15s ease, border .15s ease"; }, 200);
                        }, delay);
                    });
                    
                    el.addEventListener("click", function(){
                        // 오버레이 클릭 시 마커 클릭 이벤트와 동일하게 처리
                        kakao.maps.event.trigger(marker,"mousedown");
                        kakao.maps.event.trigger(marker,"mouseup");
                    });

                    markers.push(marker);
                })(i);
            }
            idx=end;
            if (idx<positions.length) setTimeout(createBatch, 0);
            else window.markers=markers;
        }
        createBatch();

        // idle: 오버레이 표시/숨김 로직 (기존과 동일)
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

    // 오버레이 스타일 (markers-handler.js 내부 CSS)
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
})();
