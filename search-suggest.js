(function () {
    console.log("[search-suggest] loaded v2 (Fixed for full data search)");

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
        const { map, data = [], parent, getMarkers, badges, maxItems = 30, chooseOnEnter = true, openOnFocus = true } = opts || {};
        if (!map) { console.error('initSuggestUI: map 필요'); return; }

        const wrap = document.createElement('div');
        wrap.className = 'gx-suggest-search';
        wrap.innerHTML = `<input type="search" class="gx-input" placeholder="예) ㅎㅇㄱㅂㄱㅅ, ㄷ032, 시설명…" autocomplete="off" /><button type="button" class="gx-btn">검색</button>`;
        const box = document.createElement('div'); box.className = 'gx-suggest-box';
        parent.appendChild(wrap); parent.appendChild(box);

        const kw = wrap.querySelector('.gx-input');
        let activeIndex = -1;

        // 🌟 수정된 부분: 전달받은 'data' (이미 중복 제거된 전체 검색 데이터)를 그대로 사용합니다.
        const RAW = (data||[]).map((it,idx)=>({
            id: it.id||`s_${idx}`, name: it.name||"", line: it.line||"",
            encloser: it.encloser||"", addr: it.addr||"", lat: it.lat, lng: it.lng, ip: it.ip||""
        }));
        RAW.forEach(it=>{
            it.key = buildKey([it.name, it.line, it.encloser, it.ip].filter(Boolean).join(" "));
        });
        let suggestions = [];

        function match(query) {
            if (query.length < 1) return [];
            const qKey = buildKey(query);
            // 🌟 RAW는 전체 데이터이므로, 그룹 필터링 없이 검색 키만으로 필터링합니다.
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
            kw.value = item.name;

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
                // 좌표 검색 기능
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
