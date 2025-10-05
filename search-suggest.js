/* ===== search-suggest.js (통합 안정판, 2025-10-05)
   - "/" 핫키: 입력창 포커스 + 최근 질의 복원 + 제안 열기
   - 입력창 클릭: 전체선택 없이 제안만 열기(비어 있으면 최근 질의 복원)
   - 제안 클릭/Enter: 지도 레벨3 이동 + 빨간 써클(1초) 표시 + 입력창에 텍스트 설정
   - 지도 클릭: 제안창 닫고 키보드 내리기(blur) — 지도 이동 없음
   - 로드뷰 모드(.view_roadview): 입력창 자동 숨김
   - 마커 클릭 처리(옵션): name1의 "두 번째 하이픈 뒤"를 입력창에 채우고, 레벨3 + 써클 (중복 방지 플래그 지원)
   - 제안창 닫힘 상태는 display:none + pointer-events:none → 지도 클릭/드래그 100% 통과
   - 모바일에서 제안창 빈영역 터치 시: 닫고 같은 좌표에 pointerdown 재주입(드래그 패스스루)
   - 빠른 검색: 전처리(_needle) + 증분 캐시(__lastQ/__lastPool)
   - 배지 필드: 자유 지정(예: ['enclosure','address','ip','group'])
*/
(function () {
  const G = (typeof window !== 'undefined' ? window : globalThis);

  /* ---------- 유틸 ---------- */
  function normalizeText(s){ return (s||'').toString().trim(); }
  function escapeHTML(s){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function toNeedle(arr){ return arr.filter(Boolean).join(' ').replace(/\s+/g,'').toLowerCase(); }

  // "두 번째 하이픈 뒤"부터 반환 (하이픈 1개면 첫 하이픈 뒤부터)
  function extractAfterSecondHyphen(name, fallback){
    const src = normalizeText(name);
    let result = normalizeText(fallback || src);
    const i1 = src.indexOf('-');
    if (i1 !== -1) {
      const i2 = src.indexOf('-', i1 + 1);
      result = (i2 !== -1) ? src.substring(i2 + 1).trim()
                           : src.substring(i1 + 1).trim();
    }
    return result;
  }

  /* ---------- CSS 주입 ---------- */
  function injectCSS(){
    if(document.getElementById('gx-suggest-style')) return;
    const css = `
.gx-suggest-root{
  position:fixed; top:12px; left:50%; transform:translateX(-50%);
  width:min(520px,90vw); z-index:99999;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans KR",Arial,"Apple SD Gothic Neo","Malgun 고딕","맑은 고딕",sans-serif;
}
.gx-suggest-search{position:relative;display:flex;align-items:center;gap:8px;}
.gx-suggest-search .gx-input{
  flex:1;height:42px;padding:0 14px;border:1px solid #ccc;border-radius:12px;
  background:#fff;font-size:15px;outline:none;transition:border .2s ease,box-shadow .2s ease;
}
.gx-suggest-search .gx-input:focus{border-color:#4a90e2;box-shadow:0 0 0 2px rgba(74,144,226,.2);}
.gx-suggest-box{
  position:absolute; top:calc(100% + 2px); left:0; width:100%;
  max-height:45vh; overflow:auto; -webkit-overflow-scrolling:touch;
  background:#fff; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.15);
  opacity:0; transform:translateY(-8px);
  display:none; pointer-events:none; /* 닫힘 상태: 지도 방해 금지 */
  transition:opacity .25s ease, transform .25s ease;
}
.gx-suggest-box.open{ display:block; pointer-events:auto; opacity:1; transform:translateY(0); }
.gx-suggest-item{ padding:12px 16px; cursor:pointer; display:flex; flex-direction:column; align-items:flex-start; gap:4px; border-bottom:1px solid #f0f0f0; transition:background .2s; }
.gx-suggest-item:last-child{ border-bottom:none; }
.gx-suggest-item:hover,.gx-suggest-item.active{ background:#d9e9ff; }
.gx-suggest-title{ font-weight:600; font-size:15px; color:#222; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.gx-suggest-sub{ font-size:13px; color:#666; display:flex; flex-wrap:wrap; gap:6px; min-height:18px; }
.gx-suggest-root.is-hidden{ display:none !important; }
    `.trim();
    const st = document.createElement('style');
    st.id = 'gx-suggest-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- DOM ---------- */
  function createDOM(parent){
    if(!parent || parent.nodeType !== 1) parent = document.body;
    let root = parent.querySelector('.gx-suggest-root');
    if(root){
      return { root, input: root.querySelector('.gx-input'), box: root.querySelector('.gx-suggest-box') };
    }
    root = document.createElement('div'); root.className = 'gx-suggest-root';

    const search = document.createElement('div'); search.className = 'gx-suggest-search';
    const input  = document.createElement('input');
    input.className = 'gx-input'; input.type = 'search'; input.placeholder = '예) 시설명, 주소…'; input.autocomplete = 'off';

    input.setAttribute('role','combobox');
    input.setAttribute('aria-autocomplete','list');

    const box = document.createElement('div'); box.className = 'gx-suggest-box'; box.setAttribute('role','listbox');
    box.id = box.id || 'gx-suggest-list';
    input.setAttribute('aria-controls', box.id);

    search.appendChild(input); root.appendChild(search); root.appendChild(box);
    parent.appendChild(root);

    // 멀티터치 핀치줌 방지(사파리 대응)
    document.addEventListener('gesturestart', e=>e.preventDefault(), { passive:false });
    box.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive:false });

    return { root, input, box };
  }

  /* ---------- 공간 인덱스 (마커 근접 탐색 용) ---------- */
  function buildGeoIndex(arr, cell = 0.0005){
    const m = new Map();
    for (const o of arr) {
      const la = Number(o?.lat ?? o?.latlng?.getLat?.());
      const ln = Number(o?.lng ?? o?.latlng?.getLng?.());
      if (!isFinite(la) || !isFinite(ln)) continue;
      const ky = `${Math.floor(la/cell)}:${Math.floor(ln/cell)}`;
      const b = m.get(ky);
      if (b) b.push(o); else m.set(ky, [o]);
    }
    return { map:m, cell };
  }
  function nearestFromIndex(lat, lng, geoIndex){
    if (!geoIndex) return null;
    const {map, cell} = geoIndex;
    const gx = Math.floor(lat/cell), gy = Math.floor(lng/cell);
    let best=null, bestD=Infinity;
    for (let dx=-1; dx<=1; dx++){
      for (let dy=-1; dy<=1; dy++){
        const list = map.get(`${gx+dx}:${gy+dy}`); if (!list) continue;
        for (const o of list){
          const la = Number(o.lat ?? o.latlng?.getLat?.());
          const ln = Number(o.lng ?? o.latlng?.getLng?.());
          if (!isFinite(la)||!isFinite(ln)) continue;
          const d = (la-lat)*(la-lat) + (ln-lng)*(ln-lng);
          if (d < bestD){ bestD=d; best=o; }
        }
      }
    }
    return best;
  }
  function nearestLinear(lat, lng, data){
    let best=null, bestD=Infinity;
    for (const o of data){
      const la = Number(o.lat ?? o.latlng?.getLat?.());
      const ln = Number(o.lng ?? o.latlng?.getLng?.());
      if (!isFinite(la)||!isFinite(ln)) continue;
      const d = (la-lat)*(la-lat) + (ln-lng)*(ln-lng);
      if (d < bestD){ bestD=d; best=o; }
    }
    return best;
  }

  /* ---------- 공개 API ---------- */
  G.initSuggestUI = function initSuggestUI(opts){
    const {
      map,
      data = [],
      parent = document.body,
      getMarkers = null,
      badges = [],                // 예: ['enclosure','address','ip','group']
      maxItems = 30,
      hideOnRoadview = true,
      handleMarkerClicks = !G.__MARKER_CLICK_EXTERNALLY_HANDLED // 외부에서 마커 클릭을 처리하면 false 로
    } = opts || {};
    if(!map) return;

    injectCSS();
    const { root, input, box } = createDOM(parent);

    // 전처리(_needle)
    for (const o of data) {
      if (!o._needle) {
        o._needle = toNeedle([
          o.name, o.name1, o.name2, o.searchName,
          o.address, o.line, o.enclosure, o.ip, o.group
        ]);
      }
    }
    // 근접 인덱스(마커 ↔ 데이터 매칭)
    const geoIndex = buildGeoIndex(data, 0.0005);

    // 상태
    let activeIdx = -1, current = [];
    let __lastTypedQuery = '', __lastPickedQuery = '';
    let __pulseCircle = null, __pulseTimer = null;
    let __lastQ = "", __lastPool = null; // 증분 캐시
    let pickBlockUntil = 0;

    const items = () => Array.from(box.querySelectorAll('.gx-suggest-item'));
    const openBox = () => {
      if(!box.classList.contains('open')) box.classList.add('open');
      input.setAttribute('aria-expanded','true');
      box.style.display = 'block';
      box.style.pointerEvents = 'auto';
    };
    const closeBox = () => {
      if(box.classList.contains('open')) box.classList.remove('open');
      input.setAttribute('aria-expanded','false');
      setActive(-1);
      box.style.display = 'none';
      box.style.pointerEvents = 'none';
    };

    function setActive(i){
      const list = items();
      list.forEach(el=>{ el.classList.remove('active'); el.setAttribute('aria-selected','false'); });
      activeIdx = i;
      if(i>=0 && i<list.length){
        const el = list[i];
        el.classList.add('active'); el.setAttribute('aria-selected','true');
        try{ el.scrollIntoView({block:'nearest'}); }catch{}
      }
    }

    function badgeLine(o){
      if(!badges.length) return '';
      const spans = [];
      for(const k of badges){
        if(o && o[k]){
          const t = normalizeText(String(o[k]).replace(/^ip\s*:\s*/i,''));
          if(t) spans.push(`<span>${escapeHTML(t)}</span>`);
        }
      }
      return spans.length ? `<div class="gx-suggest-sub">${spans.join(' ')}</div>` : '';
    }
    function makeItemHTML(o){
      const title = normalizeText(o.name2 || o.name || o.name1 || o.searchName || '');
      return `
        <div class="gx-suggest-item" role="option" aria-selected="false">
          <div class="gx-suggest-title">${escapeHTML(title)}</div>
          ${badgeLine(o)}
        </div>
      `;
    }
    function render(list){
      box.innerHTML = list.map(makeItemHTML).join('');
      box.querySelectorAll('.gx-suggest-item').forEach((el,i)=>{
        el.addEventListener('mouseenter', ()=>setActive(i));
        el.addEventListener('mouseleave', ()=>setActive(-1));
        el.addEventListener('mousedown', e=>e.preventDefault()); // blur 방지
        el.addEventListener('click', ()=>pick(i));
      });
      setActive(-1);
    }

    function filterData(q){
      const n = (q||'').toString().trim().replace(/\s+/g,'').toLowerCase();
      if (!n) return [];
      const pool = (n.startsWith(__lastQ) && Array.isArray(__lastPool)) ? __lastPool : data;
      const out = [];
      for (const o of pool) {
        const key = o._needle || toNeedle([
          o.name, o.name1, o.name2, o.searchName,
          o.address, o.line, o.enclosure, o.ip, o.group
        ]);
        if (key.includes(n)) { out.push(o); if (out.length >= maxItems) break; }
      }
      __lastQ = n; __lastPool = out.length >= 10 ? out : null;
      return out;
    }

    function getLatLngFromItem(o){
      const lat = Number(o?.lat ?? o?.latlng?.getLat?.());
      const lng = Number(o?.lng ?? o?.latlng?.getLng?.());
      return { lat, lng };
    }

    // 레벨3 + panTo + 빨간 써클(1초)
    function centerWithEffect(lat, lng){
      const pt = new kakao.maps.LatLng(lat, lng);
      try { map.setLevel(3); } catch {}
      try { map.panTo(pt); } catch {}
      try {
        if (__pulseCircle) { __pulseCircle.setMap(null); __pulseCircle = null; }
        __pulseCircle = new kakao.maps.Circle({
          center: pt,
          radius: 50,
          strokeWeight: 1,
          strokeColor: '#ffa500',
          strokeOpacity: 1,
          strokeStyle: 'dashed',
          fillColor: '#FF1000',
          fillOpacity: 0.3,
          zIndex: 9999
        });
        __pulseCircle.setMap(map);
        if (__pulseTimer) clearTimeout(__pulseTimer);
        __pulseTimer = setTimeout(()=>{ if (__pulseCircle){ __pulseCircle.setMap(null); __pulseCircle=null; } }, 1000);
      } catch {}
    }

    function __rememberPicked(){
      const q = (input.value||'').trim();
      if(q){ __lastPickedQuery = q; G.__gxLastPickedQuery = q; }
    }

    // 제안 확정
    function pick(i){
      if(i<0 || i>=current.length) return;
      const now = Date.now();
      if(now < pickBlockUntil) return;
      pickBlockUntil = now + 450;

      const o = current[i];
      const t = extractAfterSecondHyphen(o.name1 || o.name2 || o.name || o.searchName);
      if(t) input.value = t;

      const {lat, lng} = getLatLngFromItem(o);
      if(isFinite(lat) && isFinite(lng)) centerWithEffect(lat, lng);

      __rememberPicked();
      closeBox(); // 포커스 유지(blur 하지 않음)
    }

    /* ===== 입력/키보드 ===== */
    input.addEventListener('input', ()=>{
      const q = (input.value||'').trim();
      if(q){ __lastTypedQuery = q; G.__gxLastTypedQuery = q; }
      if(!q){ closeBox(); box.innerHTML=''; return; }
      const list = filterData(q); current = list;
      if(!list.length){ closeBox(); box.innerHTML=''; return; }
      render(list); openBox();
    });

    input.addEventListener('focus', ()=>{
      const q = (input.value||'').trim();
      if(!q) return;
      const list = filterData(q); current = list;
      if(list.length){ render(list); openBox(); }
    });

    // ↑/↓/Esc, Enter(IME 가드)
    input.addEventListener('keydown',(e)=>{
      if(e.isComposing || e.keyCode===229) return;
      const listEls = items();
      const isOpen  = box.classList.contains('open') && listEls.length>0;

      if(!isOpen && (e.key==='ArrowDown'||e.key==='ArrowUp')){
        const q = (input.value||'').trim();
        if(q){ const l = filterData(q); current = l; if(l.length){ render(l); openBox(); } }
      }
      if(e.key==='ArrowDown' && isOpen){
        e.preventDefault(); setActive((activeIdx+1)%listEls.length);
      }else if(e.key==='ArrowUp' && isOpen){
        e.preventDefault(); setActive((activeIdx-1+listEls.length)%listEls.length);
      }else if(e.key==='Escape'){
        closeBox();
      }
    });
    input.addEventListener('keyup',(e)=>{
      if(e.isComposing || e.keyCode===229) return;
      if(e.key!=='Enter') return;
      const isOpen = box.classList.contains('open') && items().length>0;
      if(!isOpen) return;
      pick(activeIdx>=0 && activeIdx<current.length ? activeIdx : 0);
    });

    // 입력창 클릭 → 제안 열기(전체선택 금지)
    input.addEventListener('mousedown',()=>{
      setTimeout(()=>{
        let q = (input.value||'').trim();
        if(!q) q = __lastPickedQuery || __lastTypedQuery || '';
        if(!q) return;
        const list = filterData(q); current = list;
        if(list.length){ render(list); openBox(); }
      },0);
    });

    // 제안창 빈영역: 닫고 pointerdown 재주입(모바일 드래그 패스스루)
    function forwardPointerDownOnly(clientX, clientY){
      const el = document.elementFromPoint(clientX, clientY);
      if (!el) return;
      const common = { bubbles:true, cancelable:true, view:window, clientX, clientY, button:0 };
      try { el.dispatchEvent(new PointerEvent('pointerdown', common)); } catch {}
      try { el.dispatchEvent(new MouseEvent('mousedown', common)); } catch {}
    }
    const emptyAreaPointerDown = (clientX, clientY, preventDefaultFn, stopPropagationFn) => {
      if (preventDefaultFn) preventDefaultFn();
      if (stopPropagationFn) stopPropagationFn();
      closeBox();
      requestAnimationFrame(()=> forwardPointerDownOnly(clientX, clientY));
    };
    box.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.gx-suggest-item')) return;
      emptyAreaPointerDown(e.clientX, e.clientY, ()=>e.preventDefault(), ()=>e.stopPropagation());
    }, true);
    box.addEventListener('touchstart', (e) => {
      if (e.target.closest('.gx-suggest-item')) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      emptyAreaPointerDown(t.clientX, t.clientY, ()=>e.preventDefault(), ()=>e.stopPropagation());
    }, { capture:true, passive:false });

    // 바깥 클릭으로 닫기
    document.addEventListener('mousedown',(e)=>{
      if(!box.classList.contains('open')) return;
      if(e.target===input || box.contains(e.target)) return;
      closeBox();
    });
    window.addEventListener('resize', closeBox);

    // 지도 클릭 → 닫고 키보드 내리기
    kakao.maps.event.addListener(map,'click',()=>{
      closeBox();
      try { if (document.activeElement === input) input.blur(); } catch {}
    });
    kakao.maps.event.addListener(map,'dragstart',()=>closeBox());

    const mapEl=document.getElementById('map');
    if(mapEl){
      mapEl.addEventListener('touchend',()=>{
        if(document.activeElement===input) input.blur();
      },{passive:true});
    }

    // "/" 핫키: 포커스 + 최근 질의 복원 + 전체선택 + 열기
    if (!G.__gxSlashBound) {
      G.__gxSlashBound = true;
      window.addEventListener('keydown',(e)=>{
        const isSlash = (e.key==='/' || e.code==='Slash' || e.keyCode===191);
        if(!isSlash) return;

        const ae = document.activeElement;
        const isOtherEditable = (ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable)) &&
                                !(ae && ae.classList && ae.classList.contains('gx-input'));
        if(isOtherEditable) return;

        e.preventDefault(); e.stopPropagation();

        const el = input;
        try{ el.focus(); }catch{}
        let seed = (el.value||'').trim();
        if(!seed) seed = __lastPickedQuery || __lastTypedQuery || '';
        if(seed){
          el.value = seed;
          try{ el.dispatchEvent(new Event('input', {bubbles:true})); }catch{}
        }
        try{ el.setSelectionRange(0, el.value.length); }catch{}
      }, true);

      // 비활성 상태에서 화살표: ←=끝, →=처음, ↓=열기
      window.addEventListener('keydown',(e)=>{
        const ae = document.activeElement;
        const isOurInput = (ae && ae.classList && ae.classList.contains('gx-input'));
        const isOtherEditable = !isOurInput && (ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable));
        if(isOtherEditable || isOurInput) return;

        if(e.key==='ArrowDown'){
          e.preventDefault();
          try{ input.focus(); }catch{}
          let seed = (input.value||'').trim();
          if(!seed) seed = __lastPickedQuery || __lastTypedQuery || '';
          if(seed){
            input.value = seed;
            try{ input.dispatchEvent(new Event('input', {bubbles:true})); }catch{}
          }
        }else if(e.key==='ArrowLeft' || e.key==='ArrowRight'){
          e.preventDefault();
          try{ input.focus(); }catch{}
          const val = input.value||'';
          const pos = (e.key==='ArrowLeft') ? val.length : 0;
          try{ input.setSelectionRange(pos, pos); }catch{}
        }
      }, true);
    }

    // 로드뷰 모드 감시: 입력창 자동 숨김
    if(hideOnRoadview){
      const container = parent.closest('#container') || document.getElementById('container') || document.body;
      const update = ()=>{
        const on = container.classList.contains('view_roadview');
        if(on){ root.classList.add('is-hidden'); closeBox(); }
        else  { root.classList.remove('is-hidden'); }
      };
      update();
      const mo = new MutationObserver(update);
      mo.observe(container,{ attributes:true, attributeFilter:['class'] });
    }

    /* ----- (옵션) 마커 클릭 처리: 외부에서 처리하면 handleMarkerClicks=false 로 ----- */
    if (handleMarkerClicks) {
      const patched = new WeakSet();

      function extractTailForInput(o){
        const base = normalizeText(o?.name1 || o?.name || o?.searchName || '');
        return extractAfterSecondHyphen(base, base);
      }

      function bindMarkerClicks(){
        const container = parent.closest('#container') || document.getElementById('container') || document.body;
        const list = (typeof getMarkers==='function' ? getMarkers() : (Array.isArray(G.markers) ? G.markers : [])) || [];
        if(!Array.isArray(list)) return;

        list.forEach(mk=>{
          if(!mk || patched.has(mk)) return;
          if(typeof mk.getPosition!=='function'){ patched.add(mk); return; }

          kakao.maps.event.addListener(mk,'click',()=>{
            // 로드뷰 모드면 무시
            if(container && container.classList.contains('view_roadview')) return;
            try{
              const pos = mk.getPosition();
              const lat = pos.getLat ? pos.getLat() : (pos?.La ?? pos?.y ?? pos?.latitude);
              const lng = pos.getLng ? pos.getLng() : (pos?.Ma ?? pos?.x ?? pos?.longitude);

              let text = '';
              let found = null;

              if (isFinite(lat) && isFinite(lng)) {
                found = nearestFromIndex(Number(lat), Number(lng), geoIndex) || nearestLinear(Number(lat), Number(lng), data);
              }
              if (found) text = extractTailForInput(found);

              if (!text && typeof mk.getTitle==='function') {
                const t = mk.getTitle(); if (t) text = extractAfterSecondHyphen(t, t);
              }
              if (!text && found) {
                const b = found.name || found.searchName || '';
                text = extractAfterSecondHyphen(b, b);
              }

              if(text){
                input.value = text;
                __lastPickedQuery = text; G.__gxLastPickedQuery = text;
                closeBox(); // 포커스 유지
              }

              if (isFinite(lat) && isFinite(lng)) centerWithEffect(lat, lng);
            }catch{}
          });

          patched.add(mk);
        });
      }

      bindMarkerClicks();
      document.addEventListener('markers:updated', bindMarkerClicks);
    }
  };
})();
