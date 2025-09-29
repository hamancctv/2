(function () {
    console.log("[markers-handler] loaded v2025-09-30-FINAL-SEARCH-FIX");

    // === Z 레이어 및 상태 변수 ===
    const Z = { BASE:100, FRONT:100000 };
    let selectedMarker = null; let selectedOverlayObj = null; 
    let frontMarker = null; let frontOverlay = null; 
    let normalImage, hoverImage, jumpImage; let clickStartTime = 0;
    const normalH = 42, hoverH = 50.4, gap = 2;
    const baseY = -(normalH + gap); const hoverY = -(hoverH + gap); const jumpY = -(70 + gap);

    // 🌟 새로운 검색어 추출 함수: 7번째 글자부터 마지막 한글까지 추출
    function extractSearchQuery(searchName) {
        if (!searchName || typeof searchName !== 'string') return "";
        let query = searchName.trim();

        // 1. 앞 6자리 자르기 (7번째 글자부터 시작)
        if (query.length >= 7) {
            query = query.substring(6);
        } else {
            // 6자리 미만이면 자르지 않고 전체 사용
        }

 

    // === 오버레이 이름 간소화 (name1 사용) ===
    function extractOverlayName(fullContent) {
        if (!fullContent) return "";
        let name = String(fullContent).trim();
        const regex = /(\s*[\(\[].*?[\)\]])?(\s*[-_]?\s*\d+)?$/;
        name = name.replace(regex, '');
        return name.trim();
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
        // ... (전면/선택 상태 관리 로직은 기존과 동일) ...
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
        // ... (지도 클릭 시 선택 해제 로직은 기존과 동일) ...
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
        // ... (Image 생성 로직 생략) ...
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

                    // --- Marker & Overlay 생성 로직 생략 (기존과 동일) ---
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
                    
                    // --- 이벤트 리스너 (mouseover, mouseout, mousedown) 생략 (기존과 동일) ---
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
                    kakao.maps.event.addListener(marker, "mouseout",  onOut);
                    el.addEventListener("mouseover", onOver);
                    el.addEventListener("mouseout",  onOut);

                    kakao.maps.event.addListener(marker, "mousedown", function(){
                        marker.setImage(jumpImage);
                        clickStartTime = Date.now();
                    });

                    // 🌟 마우스 업 이벤트 리스너 수정
      // markers-handler.js 내부, kakao.maps.event.addListener(marker, "mouseup", ...) 발췌 및 수정

// ... [앞부분 생략] ...

// 🌟 마우스 업 이벤트 리스너 수정
kakao.maps.event.addListener(marker, "mouseup", function(){
    const elapsed=Date.now()-clickStartTime; const delay=Math.max(0,100-elapsed);
    setTimeout(function(){
        // ... (클릭 상태 복구 및 좌표 업데이트 로직 생략) ...

        // ① 좌표 input 업데이트
        const g = document.getElementById("gpsyx");
        if (g) g.value = `${marker.__lat}, ${marker.__lng}`;

        // 🌟 ② 새로운 로직 적용: pos.content (name1)에서 7번째 글자부터 추출
        // (주의: pos.content는 createBatch 함수 내부에서만 접근 가능하므로,
        // 현재 로직을 pos.content를 사용하여 수정합니다.)
        
        // **🚨 안전한 방법:** 'pos.content'가 클로저 내부에 있으므로,
        // 여기서 직접 'extractSearchQuery(pos.content)'를 사용합니다.
        const newQuery = extractSearchQuery(pos.content); // 👈 name1을 인수로 전달!

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
