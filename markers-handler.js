// ✅ 전역 변수 선언 (로드뷰 등 외부 스크립트에서도 접근 가능)
window.isMarkerInteractionEnabled = true;
(function () {
    console.log("[markers-handler] loaded v2025-10-06 FINAL-FIXED + white-bg-only + hover-restore (Roadview Integration)");

    /* ==================== 1. 스타일 정의 ==================== */
    const style = document.createElement("style");
    style.textContent = `
        .overlay-hover {
            padding: 2px 6px;
            background: #fff; /* white-bg-only 유지 */
            border: 1px solid #ccc;
            border-radius: 5px;
            font-size: 14px;
            white-space: nowrap;
            user-select: auto;
            cursor: default;
            pointer-events: none !important;
            transition: transform .15s ease, border .15s ease, background .15s ease;
            will-change: transform, border;
            transform: translateZ(0);
            backface-visibility: hidden;
            z-index: 101;
        }
    `;
    document.head.appendChild(style);


    /* ==================== 2. 상수 및 전역 변수 정의 ==================== */
    // Z-Index 상수
    const Z = { BASE: 100, FRONT: 100000 };

    // 마커/오버레이 상태 변수
    let selectedMarker = null;   // 클릭하여 선택된 마커
    let selectedOverlayEl = null; // 선택된 마커의 오버레이 DOM 엘리먼트
    let selectedOverlayObj = null; // 선택된 마커의 CustomOverlay 객체
    let frontMarker = null;     // 최상단에 있는 (Hover/Click) 마커
    let frontOverlay = null;    // 최상단에 있는 오버레이
    let frontReason  = null;    // 최상단으로 온 이유 ('hover', 'clickMarker')
    let clickStartTime = 0;     // mousedown 시작 시간

    // 마커 이미지 객체 (initMarkers 함수에서 정의)
    let normalImage, hoverImage, jumpImage;

    // 마커 위치 및 이동 관련 상수
    const normalH = 42, hoverH = 50.4, gap = 2;
    const baseY  = -(normalH + gap);   // 기본 위치
    const hoverY = -(hoverH  + gap);   // 마우스 오버 시 위치
    const jumpY  = -(70      + gap);   // 클릭 시 순간 위치


    /* ==================== 3. 헬퍼 함수 정의 ==================== */

    // Z-Index 설정
    function setDefaultZ(marker, overlay){
        if (marker) marker.setZIndex(Z.BASE + 1);
        if (overlay) overlay.setZIndex(Z.BASE);
    }
    function setFrontZ(marker, overlay){
        if (marker) marker.setZIndex(Z.FRONT);
        if (overlay) overlay.setZIndex(Z.FRONT + 1);
    }

    // 마커를 최상단으로 올림 (Z-Index 및 맵 표시/비표시 제어)
    function bringToFront(map, marker, overlay, reason){
        if (!marker || !overlay) return;

        // 기존의 최상단 마커 초기화
        if (frontMarker && frontOverlay && (frontMarker !== marker || frontOverlay !== overlay)) {
            setDefaultZ(frontMarker, frontOverlay);
            // 줌 레벨이 높고 (레벨 > 3) 클릭된 상태가 아니면 오버레이를 숨김
            if (map.getLevel() > 3 && frontMarker !== selectedMarker && frontReason !== 'clickMarker') {
                frontOverlay.setMap(null);
            }
        }

        // 새로운 마커를 최상단으로 설정
        overlay.setMap(map);
        setFrontZ(marker, overlay);
        frontMarker = marker; frontOverlay = overlay; frontReason = reason;
    }

    // 텍스트에서 두 번째 하이픈 이후의 문자열 추출 (검색용)
    function extractAfterSecondHyphen(s){
        s = (s || "").toString().trim();
        const i1 = s.indexOf("-");
        if (i1 < 0) return s;
        const i2 = s.indexOf("-", i1 + 1);
        return (i2 >= 0 ? s.slice(i2 + 1) : s.slice(i1 + 1)).trim();
    }

    // 검색 입력 필드에 텍스트 채우기
    function fillSearchInputWithTail(baseText){
        const tail = extractAfterSecondHyphen(baseText || "");
        if (!tail) return;
        const input = document.querySelector(".gx-input") || document.getElementById("keyword");
        if (!input) return;
        input.value = tail;
        // `input` 이벤트를 발생시켜 연결된 로직 (예: 검색 제안)을 트리거
        try { input.dispatchEvent(new Event("input", { bubbles:true })); } catch {}
    }

    // 맵 클릭 시 마커 선택 해제 로직 바인딩
    function bindMapClickToClearSelection(map){
        kakao.maps.event.addListener(map, "click", function(){
            if (selectedMarker) {
                // 선택 해제 시 스타일 초기화
                selectedOverlayEl.style.border = "1px solid #ccc";
                selectedOverlayEl.style.transform = `translateY(${baseY}px)`;
                selectedMarker.setImage(normalImage);
                setDefaultZ(selectedMarker, selectedOverlayObj);
                // 줌 레벨이 높으면 오버레이 숨김
                if (map.getLevel() > 3 && selectedOverlayObj) {
                    selectedOverlayObj.setMap(null);
                }
            }
            // 상태 변수 초기화
            selectedMarker = null; selectedOverlayEl = null; selectedOverlayObj = null;
            frontMarker = null; frontOverlay = null; frontReason = null;
        });
    }


    /* ==================== 4. 메인 초기화 함수 ==================== */

    window.initMarkers = function (map, positions) {
        // 4-1. 전역 이벤트 바인딩
        bindMapClickToClearSelection(map);

        // 4-2. 마커 이미지 객체 생성
        const markerIconUrl = "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png";
        
        normalImage = new kakao.maps.MarkerImage(
            markerIconUrl, new kakao.maps.Size(30, normalH), { offset: new kakao.maps.Point(15, normalH) }
        );
        hoverImage = new kakao.maps.MarkerImage(
            markerIconUrl, new kakao.maps.Size(36, hoverH),   { offset: new kakao.maps.Point(18, hoverH) }
        );
        jumpImage = new kakao.maps.MarkerImage(
            markerIconUrl, new kakao.maps.Size(30, normalH), { offset: new kakao.maps.Point(15, 70) }
        );

        // 4-3. 마커 생성 및 이벤트 바인딩 (Batch 처리)
        const markers = [];
        const batchSize = 50;
        let idx = 0;

        function createBatch(){
            const end = Math.min(positions.length, idx + batchSize);
            
            for (let i = idx; i < end; i++){
                (function(pos){
                    // 마커 생성
                    const marker = new kakao.maps.Marker({
                        map, position: pos.latlng, image: normalImage, clickable: true, zIndex: Z.BASE + 1
                    });
                    // 마커 데이터 속성 설정
                    marker.group = pos.group ? String(pos.group) : (pos.line ? String(pos.line) : null);
                    marker.__pos = pos.latlng;
                    marker.__lat = pos.latlng.getLat(); marker.__lng = pos.latlng.getLng();
                    marker.__name1 = (pos.__name1 || pos.content || "");

                    // 커스텀 오버레이 (Hover 툴팁) 생성
                    const el = document.createElement("div");
                    el.className = "overlay-hover";
                    el.style.transform = `translateY(${baseY}px)`;
                    el.textContent = pos.content;
                    // white-bg-only 스타일 적용
                    el.style.backgroundColor = "#fff";
                    el.style.background = "#fff";
                    el.style.opacity = "1";

                    const overlay = new kakao.maps.CustomOverlay({
                        position: pos.latlng, content: el, yAnchor: 1, map: null, zIndex: Z.BASE
                    });
                    
                    marker.__overlay = overlay;
                    overlay.__marker = marker;

                    // === 이벤트 리스너 정의 ===
                    function onOver(){
  if (!window.isMarkerInteractionEnabled) return; // 🚫 hover 차단
  if (window.isDistanceMode) return; // ✅ 거리재기 중이면 hover 무시

                        marker.setImage(hoverImage);
                        bringToFront(map, marker, overlay, 'hover');
                        // 선택된 마커인 경우와 아닌 경우의 오버레이 위치 조정
                        el.style.transform = (marker === selectedMarker)
                            ? `translateY(${hoverY - 2}px)`
                            : `translateY(${hoverY}px)`;
                    }

                    function onOut(){
    if (!window.isMarkerInteractionEnabled) return; // 🚫 hover 차단
        if (window.isDistanceMode) return; // ✅ 거리재기 중이면 out도 무시

                        marker.setImage(normalImage);
                        
                        // Hover로 전면에 나온 마커가 사라질 때, 원래 선택된 마커를 전면으로 복원
                        if (frontMarker === marker && frontReason === 'hover'){
                            setDefaultZ(marker, overlay);
                            if (selectedMarker && selectedOverlayObj){
                                bringToFront(map, selectedMarker, selectedOverlayObj, 'clickMarker');
                                selectedOverlayEl.style.border = "2px solid blue";
                                selectedOverlayEl.style.transform = `translateY(${baseY - 2}px)`;
                            } else {
                                frontMarker = null; frontOverlay = null; frontReason = null;
                            }
                        }

                        // 마우스 아웃 시 오버레이 스타일 및 위치 복원/유지
                        if (marker === selectedMarker){
                            el.style.transform = `translateY(${baseY - 2}px)`; // 선택됨: 살짝 올리고 파란 테두리
                            el.style.border = "2px solid blue";
                        } else {
                            el.style.transform = `translateY(${baseY}px)`; // 미선택: 기본 위치, 회색 테두리
                            el.style.border = "1px solid #ccc";
                        }
                        
                        // 줌 레벨이 높고 선택되지 않은 마커는 오버레이 숨김
                        if (map.getLevel() > 3 && marker !== selectedMarker && frontMarker !== marker) {
                            overlay.setMap(null);
                        }
                    }

                    // 마우스 이벤트 바인딩
                    kakao.maps.event.addListener(marker, "mouseover", onOver);
                    kakao.maps.event.addListener(marker, "mouseout",  onOut);

                    // mousedown: 클릭 시작 및 시각적 효과
                    kakao.maps.event.addListener(marker, "mousedown", function(){
    if (!window.isMarkerInteractionEnabled) return; // 🚫 click 차단

                        marker.setImage(jumpImage); // 마커를 아래로 누른 듯한 이미지
                        clickStartTime = Date.now();
                        
                        // 이전 선택 마커의 테두리 초기화
                        if (selectedOverlayEl) selectedOverlayEl.style.border = "1px solid #ccc";

                        // 현재 마커를 선택 상태로 설정
                        selectedMarker = marker; selectedOverlayEl = el; selectedOverlayObj = overlay;
                        bringToFront(map, marker, overlay, 'clickMarker');
                        
                        // 클릭 중 스타일
                        el.style.border = "2px solid blue";
                        el.style.transform = `translateY(${jumpY - 2}px)`; // 오버레이를 더 아래로
                    });

                    // mouseup: 클릭 완료 및 최종 액션
                    kakao.maps.event.addListener(marker, "mouseup", function(){
                        const elapsed = Date.now() - clickStartTime;
                        const delay = Math.max(0, 100 - elapsed); // 최소 100ms 유지

                        setTimeout(function(){
                            // 스타일 복원 및 최종 선택 효과
                            marker.setImage(normalImage);
                            el.style.border = "2px solid blue";
                            el.style.transition = "transform .2s ease, border .2s ease"; // 복귀 시 애니메이션 적용
                            el.style.transform = `translateY(${baseY - 2}px)`;

                            bringToFront(map, marker, overlay, 'clickMarker');

                            // GPS 좌표 및 검색 필드 업데이트
                            const g = document.getElementById("gpsyx");
                            if (g) g.value = `${marker.__lat}, ${marker.__lng}`;
                            fillSearchInputWithTail(marker.__name1);

                            // ✅ 로드뷰 통합 로직: 로드뷰가 켜져 있으면 동동이 이동
                            if (window.overlayOn && typeof window.setRoadviewAt === 'function') {
                                const pos = marker.getPosition();
                                window.setRoadviewAt(pos); // 동동이 및 로드뷰 화면 이동
                                console.log("[로드뷰 통합] 마커 클릭 → 로드뷰/동동이 이동:", pos.toString());
                            }
                            
                            // transition 복원 (마우스 아웃 시 자연스러운 움직임을 위해)
                            setTimeout(()=>{ el.style.transition = "transform .15s ease, border .15s ease"; }, 200);
                        }, delay);
                    });
                    
                    markers.push(marker);
                    // overlays.push(overlay); // 오버레이는 배열에 저장할 필요 없음
                })(positions[i]);
            }

            idx = end;
            // 다음 배치 처리
            if (idx < positions.length) {
                setTimeout(createBatch, 0);
            } else {
                // 최종 완료 후
                window.markers = markers;
                // MST 버튼 초기화는 마커 배열이 완성된 후에 호출 (drawGroupLinesMST.js 의존)
                if (typeof window.initMSTButton === 'function') {
                    window.initMSTButton();
                }
            }
        }
        createBatch(); // 배치 생성 시작

        // 4-4. 지도 Idle 이벤트 리스너 (줌 레벨에 따른 오버레이 표시/숨김)
        kakao.maps.event.addListener(map, "idle", function(){
            const level = map.getLevel();
            const list = window.markers || [];
            
            for (const m of list){
                const o = m.__overlay;
                if (!o) continue;
                
                const isFront = (frontOverlay && o === frontOverlay);
                const isSelected = (selectedOverlayObj && o === selectedOverlayObj);
                
                // 레벨 3 이하, 또는 전면/선택된 마커는 항상 표시
                if (level <= 3 || isFront || isSelected) {
                    o.setMap(map);
                } else {
                    o.setMap(null);
                }

                // Z-Index 재설정
                if (isFront || isSelected) {
                    setFrontZ(m, o);
                } else {
                    setDefaultZ(m, o);
                }
            }
        });
    };
})();
