// search-suggest.js (integrated, v2025-09-30-FINAL)
// 통합본: 스타일/초성/매칭/렌더/이벤트 전부 포함, badges에 line/encloser/addr/ip 포함

(function () {
    console.log("[search-suggest] loaded v2 (Integrated FINAL)");

    // --- CSS ---
    const style = document.createElement("style");
    style.textContent = `
        .gx-suggest-search{
          position:absolute; top:8px; left:50%; transform:translateX(-50%);
          display:flex; gap:8px; align-items:center;
          width:min(520px,90vw); z-index:600;
        }
        .gx-suggest-search input{
          flex:1; height:40px; padding:0 12px; border:1px solid #ccc; border-radius:10px;
          background:#fff; font-size:14px; outline:none;
        }
        .gx-suggest-search button{ display:none; }
        .gx-suggest-box{
          position:absolute; top:48px; left:50%; transform:translateX(-50%) translateY(-6px);
          width:min(520px,90vw);
          max-height:40vh; overflow-y:auto;
          border:1px solid #ccc; border-radius:10px;
          background:rgba(255,255,255,0.96);
          box-shadow:0 8px 20px rgba(0,0,0,.15);
          z-index:610;
          opacity:0; pointer-events:none; transition:opacity .18s ease, transform .18s ease;
          display:block;
        }
        .gx-suggest-box.open{ opacity:1; transform:translateX(-50%) translateY(0); pointer-events:auto; }
        .gx-suggest-item{ padding:10px 12px; cursor:pointer; display:flex; align-items:center; gap:8px; }
        .gx-suggest-item:hover, .gx-suggest-item.active{ background:#eef3ff; }
        .gx-suggest-title{ display:inline-block; max-width:60%; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-weight:600; }
        .gx-badge{ font-size:12px; color:#555; background:#f2f4f8; padding:2px 6px; border-radius:6px; }
        .gx-suggest-empty{ color:#777; padding:12px; }
        .gx-item{padding:8px 10px;cursor:pointer;line-height:1.4;transition:background .1s;}
        .gx-item .name{font-weight:bold;color:#333;}
        .gx-item .detail{color:#666;font-size:12px;margin-top:2px;display:flex;flex-wrap:wrap;}
        .gx-item .badge{display:inline-block;padding:1px 5px;margin-right:5px;margin-bottom:2px;border-radius:3px;font-size:11px;color:#fff;}
        .gx-item .badge.line{background:#007bff;}
        .gx-item .badge.encloser{background:#28a745;}
        .gx-item .badge.ip{background:#dc3545;}
        .gx-item .coord{color:#999;font-size:11px;margin-left:auto;}
    `;
    document.head.appendChild(style);

    // --- 초성 매핑 ---
    const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

    function buildKey(str) {
        if (!str) return "";
        const s = String(str).toString();
        let out = "";
        for (let i = 0; i < s.length; i++) {
            const char = s[i];
            const code = char.charCodeAt(0);
            if (code >= 0xAC00 && code <= 0xD7A3) {
                const uni = code - 0xAC00;
                const chosung = Math.floor(uni / 588);
                out += CHO[chosung];
            } else {
                if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
                    out += char.toUpperCase();
                } else if (CHO.indexOf(char) !== -1) {
                    out += char;
                }
            }
        }
        return out;
    }

    function esc(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, function(s) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
        });
    }

    // === initSuggestUI ===
    function initSuggestUI(opts) {
        const {
            map,
            data = window.SEL_SUGGEST || [],
            parent = document.getElementById('mapWrapper') || document.body,
            getMarkers = () => window.markers || [],
            badges = ['line','encloser','addr','ip'],
            maxItems = 30,
            chooseOnEnter = true,
            openOnFocus = true
        } = opts || {};

        if (!map) {
            console.error('initSuggestUI: map 필요');
            return;
        }

        let wrap = parent.querySelector('.gx-suggest-search');
        let box = parent.querySelector('.gx-suggest-box');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'gx-suggest-search';
            wrap.innerHTML = `<input type="search" class="gx-input" placeholder="예) ㅎㅇㄱㅂㄱㅅ, ㄷ032, 시설명…" autocomplete="off" /> 
                              <button type="button" class="gx-btn">검색</button>`;
            parent.appendChild(wrap);
        }
        if (!box) {
            box = document.createElement('div');
            box.className = 'gx-suggest-box';
            parent.appendChild(box);
        }

        const kw = wrap.querySelector('.gx-input');
        const btn = wrap.querySelector('.gx-btn');

        const RAW = (data || []).map((it, idx) => ({
            id: it.id || `s_${idx}`,
            name: it.name || it.name1 || "",
            line: it.line || "",
            encloser: it.encloser || "",
            addr: it.addr || "",
            lat: Number(it.lat),
            lng: Number(it.lng),
            ip: it.ip || ""
        }));

        RAW.forEach(it => {
            it.key = buildKey([it.name, it.line, it.encloser, it.addr, it.ip].filter(Boolean).join(" "));
        });

        let suggestions = [];
        let active = -1;
        let updateTimer = null;

        function match(query) {
            if (!query || String(query).trim().length === 0) return [];
            const k = buildKey(query);
            if (!k) return [];
            const res = [];
            for (const it of RAW) {
                if (it.key && it.key.indexOf(k) !== -1) res.push(it);
                if (res.length >= maxItems) break;
            }
            res.sort((a,b) => {
                const ai = a.key.indexOf(k), bi = b.key.indexOf(k);
                if (ai !== bi) return ai - bi;
                if ((a.name||"").length !== (b.name||"").length) return (a.name||"").length - (b.name||"").length;
                return (a.id||"").localeCompare(b.id || "");
            });
            return res.slice(0, maxItems);
        }

        function closeBox() {
            box.classList.remove('open');
            box.innerHTML = '';
            suggestions = [];
            active = -1;
        }

        function render(items) {
            suggestions = items || [];
            if (!items || items.length === 0) return closeBox();

            box.innerHTML = items.map((item, idx) => {
                let details = '';
                if (badges && badges.length) {
                    details += '<div class="detail">';
                    badges.forEach(field => {
                        if (item[field]) {
                            if (field === 'addr') {
                                details += `<span class="badge ${field}" title="${esc(item[field])}">${esc(item[field])}</span>`;
                            } else {
                                details += `<span class="badge ${field}">${esc(item[field])}</span>`;
                            }
                        }
                    });
                    details += `<span class="coord">${(Number.isFinite(item.lat)?item.lat.toFixed(6):'')}, ${(Number.isFinite(item.lng)?item.lng.toFixed(6):'')}</span>`;
                    details += '</div>';
                }
                return `<div class="gx-item" data-index="${idx}" data-id="${esc(item.id)}">
                            <div class="name">${esc(item.name)}</div>
                            ${details}
                        </div>`;
            }).join('');
            box.classList.add('open');
            active = -1;
        }

        function setActive(index) {
            const items = box.querySelectorAll('.gx-item');
            if (!items || items.length === 0) return;
            if (active >= 0 && items[active]) items[active].classList.remove('active');
            active = (index + items.length) % items.length;
            if (items[active]) {
                items[active].classList.add('active');
                items[active].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        function applySelection(item) {
            if (!item) return;
            kw.value = item.name || '';
            const markers = (typeof getMarkers === 'function') ? getMarkers() : (window.markers || []);
            const found = markers && markers.find && markers.find(m => {
                const p = (m && m.getPosition && m.getPosition()) || null;
                if (!p) return false;
                return Math.abs(p.getLat() - item.lat) < 1e-9 && Math.abs(p.getLng() - item.lng) < 1e-9;
            });
            if (found && window.kakao && window.kakao.maps) {
                kakao.maps.event.trigger(found, "mousedown");
                setTimeout(() => kakao.maps.event.trigger(found, "mouseup"), 0);
                map.panTo(found.getPosition());
            } else if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
                map.panTo(new kakao.maps.LatLng(item.lat, item.lng));
            }
            closeBox();
        }

        function scheduleUpdate() {
            clearTimeout(updateTimer);
            updateTimer = setTimeout(() => {
                const q = kw.value || "";
                if (!q || !String(q).trim()) {
                    closeBox();
                    return;
                }
                const results = match(q);
                render(results);
            }, 100);
        }

        // --- Events
        kw.addEventListener('input', scheduleUpdate);

        kw.addEventListener('focus', function () {
            if (openOnFocus) {
                if (suggestions.length > 0) box.classList.add('open');
                else scheduleUpdate();
            }
        });

        kw.addEventListener('blur', function () {
            setTimeout(closeBox, 150);
        });

        kw.addEventListener('keydown', function (e) {
            if (!box.classList.contains('open')) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive(active + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive(active - 1);
            } else if (e.key === 'Enter') {
                if (active >= 0 && suggestions[active]) {
                    applySelection(suggestions[active]);
                    e.preventDefault();
                } else if (chooseOnEnter) {
                    if (suggestions.length === 1) applySelection(suggestions[0]);
                    else {
                        const val = kw.value.trim();
                        if (val.includes(',')) {
                            const parts = val.split(',').map(s => s.trim());
                            const lat = parseFloat(parts[0]), lng = parseFloat(parts[1]);
                            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                                map.panTo(new kakao.maps.LatLng(lat, lng));
                            }
                        }
                        closeBox();
                    }
                }
            } else if (e.key === 'Escape') {
                closeBox();
            }
        });

        box.addEventListener('click', function (e) {
            const itemEl = e.target.closest('.gx-item');
            if (!itemEl) return;
            const idx = parseInt(itemEl.dataset.index, 10);
            if (!Number.isNaN(idx) && suggestions[idx]) applySelection(suggestions[idx]);
        });

        btn.addEventListener('click', function () {
            if (suggestions.length === 1) applySelection(suggestions[0]);
            else if (suggestions.length > 1 && active >= 0) applySelection(suggestions[active]);
            else {
                const kwValue = (kw.value || "").trim();
                if (kwValue.includes(',')) {
                    const parts = kwValue.split(',').map(s => s.trim());
                    const lat = parseFloat(parts[0]);
                    const lng = parseFloat(parts[1]);
                    if (Number.isFinite(lat) && Number.isFinite(lng)) map.panTo(new kakao.maps.LatLng(lat, lng));
                }
                closeBox();
            }
        });

        function setData(newData) {
            RAW.length = 0;
            (newData || []).forEach((it, idx) => {
                const row = {
                    id: it.id || `s_${idx}`,
                    name: it.name || it.name1 || "",
                    line: it.line || "",
                    encloser: it.encloser || "",
                    addr: it.addr || "",
                    lat: Number(it.lat),
                    lng: Number(it.lng),
                    ip: it.ip || ""
                };
                row.key = buildKey([row.name, row.line, row.encloser, row.addr, row.ip].filter(Boolean).join(" "));
                RAW.push(row);
            });
        }

        return { setData };
    }

    window.initSuggestUI = initSuggestUI;

})();
