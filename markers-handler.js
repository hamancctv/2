(function () {
        console.log("[markers-handler] loaded v2025-09-30-FINAL-NAME");
        
        // === Z 레이어 및 상태 변수 ===
        const Z = { BASE:100, FRONT:100000 }; 
        let selectedMarker = null; let selectedOverlayEl = null; 
        let frontMarker = null; let frontOverlay = null; 
        let normalImage, hoverImage, jumpImage; let clickStartTime = 0;
        const normalH = 42, hoverH = 50.4, gap = 2;
        const baseY  = -(normalH + gap); const hoverY = -(hoverH  + gap); const jumpY  = -(70  + gap);

        // === 오버레이 이름 간소화 (name1 사용) ===
        function extractOverlayName(fullContent) {
            if (!fullContent) return "";
            let name = String(fullContent).trim();
            // 괄호/대괄호 안의 내용과 하이픈/언더바 뒤의 숫자 제거
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
            if (frontMarker && frontMarker !== marker) {
                setDefaultZ(frontMarker, frontOverlay);
                if (frontMarker !== selectedMarker) frontOverlay.setMap(null); // 선택된 마커가 아니면 오버레이 숨김
            }
            
            if (selectedMarker && selectedMarker !== marker) {
                // 이전에 선택된 마커 해제
                setDefaultZ(selectedMarker, selectedOverlayObj);
                selectedMarker = null; selectedOverlayObj = null; selectedOverlayEl = null;
            }

            if (reason === 'clickMarker') {
                selectedMarker = marker; selectedOverlayObj = overlay; selectedOverlayEl = overlay.getContent();
                overlay.setMap(map);
                setFrontZ(marker, overlay);
            }

            frontMarker = marker; frontOverlay = overlay; frontReason = reason;
        }

        function pushToSearchUI(query) {
            const kw = document.querySelector('.gx-suggest-search .gx-input');
            if (kw) kw.value = query;
        }

        function bindMapClickToClearSelection(map){
            kakao.maps.event.addListener(map, 'click', function(mouseEvent) {        
                if (selectedMarker) {
                    setDefaultZ(selectedMarker, selectedOverlayObj);
                    selectedOverlayObj.setMap(null);
                    selectedMarker = null; selectedOverlayObj = null; selectedOverlayEl = null;
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

                        // --- Marker ---
                        const marker = new kakao.maps.Marker({
                            map, position: pos.latlng, image: normalImage, clickable:true, zIndex: Z.BASE+1
                        });
                        marker.group = pos.group;
                        
                        // --- Overlay ---
                        const el = document.createElement("div");
                        el.className = "overlay-hover";
                        el.style.transform = `translateY(${baseY}px)`;
                        // 🌟 name1을 기준으로 간소화된 이름을 표시합니다.
                        el.textContent = extractOverlayName(pos.content); 

                        const overlay = new kakao.maps.CustomOverlay({
                            position: pos.latlng, content: el, yAnchor:1, map:null
                        });
                        overlay.setZIndex(Z.BASE);

                        // 마커에 데이터 저장
                        marker.__overlay = overlay; overlay.__marker = marker;
                        marker.__lat = pos.latlng.getLat(); marker.__lng = pos.latlng.getLng();
                        // 🌟 검색용 name2를 마커에 저장해둡니다.
                        marker.__searchName = pos.searchName; 
                        
                        // === 이벤트 리스너 ===
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

                                // 🌟 ② 마커에 저장된 searchName (name2)을 검색창에 주입합니다.
                                pushToSearchUI(marker.__searchName); 

                                setTimeout(()=>{ el.style.transition="transform .15s ease, border .15s ease"; }, 200);
                            }, delay);
                        });
                        el.addEventListener("click", function(){
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
    </script>
    ```

---

## 4. `search-suggest.js` (검색/제안 기능)

```html
    <script>
    (function () {
        console.log("[search-suggest] loaded");
        
        // 검색 제안 UI 스타일 (search-suggest.js 내부 CSS)
        const style = document.createElement("style");
        style.textContent = `
            .gx-suggest-box{position:absolute;top:55px;left:10px;width:300px;max-height:400px;overflow-y:auto;background:#fff;border:1px solid #ccc;border-radius:0 0 6px 6px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:99999;font-size:14px;display:none;}
            .gx-suggest-box.active{display:block;}
            .gx-item{padding:8px 10px;cursor:pointer;line-height:1.4;transition:background .1s;}
            .gx-item:hover{background:#f1f1f1;}
            .gx-item.active{background:#e9e9e9;}
            .gx-item .name{font-weight:bold;color:#333;}
            .gx-item .detail{color:#666;font-size:12px;margin-top:2px;display:flex;flex-wrap:wrap;}
            .gx-item .badge{display:inline-block;padding:1px 5px;margin-right:5px;margin-bottom:2px;border-radius:3px;font-size:11px;color:#fff;}
            .gx-item .badge.line{background:#007bff;}
            .gx-item .badge.encloser{background:#28a745;}
            .gx-item .badge.ip{background:#dc3545;}
            .gx-item .coord{color:#999;font-size:11px;margin-left:auto;}
        `;
        document.head.appendChild(style);

        // 초성 매핑 데이터
        const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

        function buildKey(str) {
            if (!str) return "";
            return str.toLowerCase().split('').map(char => {
                if (char >= '가' && char <= '힣') {
                    const uni = char.charCodeAt(0) - 44032;
                    const chosung = Math.floor(uni / 588);
                    return CHO[chosung];
                }
                return char;
            }).join('');
        }

        function esc(str) {
            return String(str).replace(/[&<>"']/g, function(s) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[s];
            });
        }

        function initSuggestUI(opts){
            const { map, data = [], parent, getMarkers, badges, maxItems, chooseOnEnter, openOnFocus } = opts || {};
            if (!map) { console.error('initSuggestUI: map 필요'); return; }

            const wrap = document.createElement('div');
            wrap.className = 'gx-suggest-search';
            wrap.innerHTML = `<input type="search" class="gx-input" placeholder="예) ㅎㅇㄱㅂㄱㅅ, ㄷ032, 시설명…" autocomplete="off" /><button type="button" class="gx-btn">검색</button>`;
            const box = document.createElement('div'); box.className = 'gx-suggest-box';
            parent.appendChild(wrap); parent.appendChild(box);

            const kw = wrap.querySelector('.gx-input');
            let activeIndex = -1;
            
            // 🌟 data를 바로 사용합니다. (이미 name2로 구성되었고 중복 제거 완료됨)
            const RAW = (data||[]).filter(it => it && (it.name||it.addr||it.ip)).map((it,idx)=>({
                id: it.id||`s_${idx}`, name: it.name||"", line: it.line||"",
                encloser: it.encloser||"", addr: it.addr||"", lat: it.lat, lng: it.lng, ip: it.ip||""
            }));
            RAW.forEach(it=>{
                // 🌟 name2 기준으로 키를 생성
                it.key = buildKey([it.name, it.line, it.encloser, it.ip].filter(Boolean).join(" "));
            });
            const IDMAP = Object.fromEntries(RAW.map(it => [it.id, it]));
            let suggestions = [];

            function match(query) {
                if (query.length < 1) return [];
                const qKey = buildKey(query);
                return RAW.filter(it => it.key.includes(qKey)).slice(0, maxItems);
            }

            function closeBox() {
                box.classList.remove('active');
                box.innerHTML = '';
                activeIndex = -1;
                suggestions = [];
            }

            function render(results) {
                suggestions = results;
                if (results.length === 0) return closeBox();
                
                box.innerHTML = results.map((item, index) => {
                    let details = '';
                    if (badges && badges.length) {
                        details += '<div class="detail">';
                        badges.forEach(field => {
                            if (item[field]) {
                                details += `<span class="badge ${field}">${esc(item[field])}</span>`;
                            }
                        });
                        details += `<span class="coord">${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}</span>`;
                        details += '</div>';
                    }
                    return `<div class="gx-item" data-index="${index}" data-id="${item.id}">
                                <div class="name">${esc(item.name)}</div>
                                ${details}
                            </div>`;
                }).join('');
                box.classList.add('active');
                activeIndex = -1;
            }

            function setActive(index) {
                const items = box.querySelectorAll('.gx-item');
                if (activeIndex >= 0) items[activeIndex].classList.remove('active');
                
                activeIndex = (index + items.length) % items.length;
                if (activeIndex >= 0) {
                    items[activeIndex].classList.add('active');
                    items[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }

            function applySelection(item){
                if (!item) return;
                kw.value = item.name; // 🌟 name2 주입

                // 마커 찾기 및 이벤트 트리거
                const markers = getMarkers()||[];
                const found = markers.find(m=>{
                    const p=m.getPosition?.(); if (!p) return false;
                    return Math.abs(p.getLat()-item.lat)<1e-9 && Math.abs(p.getLng()-item.lng)<1e-9;
                });
                if (found && window.kakao && window.kakao.maps){
                    // 마커를 찾으면 마커의 mousedown/mouseup 이벤트를 직접 트리거하여 선택 상태 반영
                    kakao.maps.event.trigger(found,"mousedown");
                    setTimeout(()=>kakao.maps.event.trigger(found,"mouseup"),0);
                    map.panTo(found.getPosition());
                } else if (Number.isFinite(item.lat)&&Number.isFinite(item.lng)){
                    map.panTo(new kakao.maps.LatLng(item.lat,item.lng));
                }
                closeBox();
            }

            // === 이벤트 리스너 ===
            kw.addEventListener('input', scheduleUpdate);
            kw.addEventListener('focus', function(){
                if (openOnFocus && suggestions.length > 0) box.classList.add('active');
                else scheduleUpdate();
            });
            kw.addEventListener('blur', function(){
                // 클릭 이벤트를 위해 약간의 지연 시간 부여
                setTimeout(closeBox, 150); 
            });

            kw.addEventListener('keydown', function(e) {
                if (!box.classList.contains('active')) return;
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActive(activeIndex + 1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActive(activeIndex - 1);
                } else if (e.key === 'Enter') {
                    if (activeIndex >= 0 && suggestions[activeIndex]) {
                        applySelection(suggestions[activeIndex]);
                        e.preventDefault();
                    } else if (chooseOnEnter) {
                        // 검색 결과가 1개일 경우 바로 선택
                        if (suggestions.length === 1) applySelection(suggestions[0]);
                        else closeBox();
                    }
                } else if (e.key === 'Escape') {
                    closeBox();
                }
            });

            box.addEventListener('click', function(e) {
                const itemEl = e.target.closest('.gx-item');
                if (itemEl) {
                    const index = parseInt(itemEl.dataset.index, 10);
                    applySelection(suggestions[index]);
                }
            });

            let updateTimer;
            function scheduleUpdate() {
                clearTimeout(updateTimer);
                updateTimer = setTimeout(() => {
                    const results = match(kw.value);
                    render(results);
                }, 100);
            }

            wrap.querySelector('.gx-btn').addEventListener('click', function(){
                if (suggestions.length === 1) applySelection(suggestions[0]);
                else if (suggestions.length > 1 && activeIndex >= 0) applySelection(suggestions[activeIndex]);
                else {
                    // 지도 이동만 수행 (좌표 검색 기능)
                    const kwValue = kw.value.trim();
                    if (kwValue.includes(',')) {
                        const parts = kwValue.split(',').map(s => s.trim());
                        const lat = parseFloat(parts[0]);
                        const lng = parseFloat(parts[1]);
                        if (Number.isFinite(lat) && Number.isFinite(lng)) {
                            map.panTo(new kakao.maps.LatLng(lat, lng));
                        }
                    }
                    closeBox();
                }
            });

            window.initSuggestUI = initSuggestUI;
        }
    })();
    </script>
    ```

---

## 5. 지도 초기화 및 메인 로직

```html
    <script>
    kakao.maps.load(function() {
        // 지도 생성
        const mapContainer = document.getElementById('map'), 
            mapOption = { 
                center: new kakao.maps.LatLng(37.566826, 126.978656), // 서울 시청 기준
                level: 3 
            };
        const map = new kakao.maps.Map(mapContainer, mapOption);

        // 지도 중심 좌표 input 갱신
        kakao.maps.event.addListener(map,'center_changed',function(){
            var latlng = map.getCenter(); $('#gpsyx').val(latlng.getLat()+', '+latlng.getLng());
        });

        // 복사 버튼
        document.getElementById("btn_input_copy").onclick = function(){
            const g = document.getElementById("gpsyx"); g.select(); document.execCommand('copy');
        };

        // ===== 마커/오버레이용 positions (name1) 및 검색용 데이터 (name2) 준비 =====
        const rawData = (window.SEL_SUGGEST || [])
            .map(it => {
                const lat = parseFloat(it.lat);
                const lng = parseFloat(it.lng);
                if (!isFinite(lat) || !isFinite(lng)) return null; 
                return {
                    latlng: new kakao.maps.LatLng(lat, lng),
                    content: it.name1 || it.name,  // 👈 마커/오버레이 표시용 (name1)
                    searchName: it.name2 || it.name, // 👈 마커 클릭 시 검색창 주입용 (name2)
                    group: it.line || null,
                    searchData: { 
                        id: it.id, name: it.name2 || it.name, // 제안 창 표시 이름 (name2)
                        line: it.line, encloser: it.encloser, 
                        addr: it.addr, lat: lat, lng: lng, ip: it.ip 
                    }
                };
            })
            .filter(Boolean);

        // 1. 좌표를 기준으로 중복 제거 및 최종 마커 데이터 생성
        const uniqueCoord = new Map();
        for (const data of rawData) {
            // 정밀도를 줄여 좌표 중복 검사 (약 1cm 미만 오차 허용)
            const key = data.latlng.getLat().toFixed(6) + "," + data.latlng.getLng().toFixed(6); 
            if (!uniqueCoord.has(key)) {
                uniqueCoord.set(key, data);
            }
        }
        // 마커/오버레이를 생성할 최종 positions 배열
        const finalPositions = Array.from(uniqueCoord.values()); 
        // 검색 제안 UI에 사용할 최종 데이터 배열 (좌표 중복 제거된 것만)
        const finalSearchData = finalPositions.map(p => p.searchData);


        console.log('SEL_SUGGEST (원본):', (window.SEL_SUGGEST||[]).length, ' → Final positions (마커용):', finalPositions.length);
        
        // 마커 생성 (finalPositions 배열 사용)
        if (window.initMarkers) initMarkers(map, finalPositions); 

        // ===== 검색창 + 제안 붙이기 (finalSearchData 주입) =====
        if (window.initSuggestUI) {
            const suggestUI = initSuggestUI({
                map,
                data: finalSearchData, // 👈 name2와 중복 제거가 적용된 데이터를 주입
                parent: document.getElementById('mapWrapper'),
                getMarkers: () => window.markers,
                badges: ['line','encloser','ip'], 
                maxItems: 30,
                chooseOnEnter: true,
                openOnFocus: true
            });
        }
    }); // kakao.maps.load

    // jQuery가 정의되어 있지 않으므로 임시로 $ 함수 정의 (gpsyx input 업데이트용)
    function $(selector) { return document.querySelector(selector); }
