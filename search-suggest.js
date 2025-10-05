/* ===== search-suggest.integrated.js (2025-10-05, FULL-INTEGRATION v9)
   요구 동작 정리
   - 지도 클릭: 제안창 닫기 + 키보드 내리기(blur)만. 지도 이동/레벨 변경/써클 표시 없음.
   - 제안 항목 클릭/Enter: 해당 좌표로 이동 + 지도 레벨 3, 빨간 써클 1초 표시.
   - 마커 클릭: 입력창에 “두 번째 하이픈 뒤” 텍스트 채움 + 지도 레벨 3 이동 + 써클.
   - 로드뷰 모드(#container.view_roadview)일 때 입력창 자동 숨김.
   UX/성능
   - 제안창 닫힘: display:none + pointer-events:none → 지도 클릭/드래그 100% 통과.
   - 빈영역 pointerdown/touchstart 시 closeBox 후 같은 좌표로 down 재주입(모바일 드래그 패스스루).
   - sel_suggest 1회 로드/정규화/캐시, 진행형 검색 캐시(__lastQ/__lastPool), 공간 인덱스(~50m grid).
   - 키보드: ↑↓EnterEsc, 비활성일 때 ←=끝, →=처음, ↓=열기, "/" 핫키 포커스+최근질의 복원.
   - “두 번째 하이픈 뒤” 텍스트 규칙: name1 → name → searchName 우선.
   - 배지/검색 필드: line, enclosure, address, ip, group 등을 인덱스에 포함.
*/
(function () {
  const G = (typeof window !== 'undefined' ? window : globalThis);

  /* ---------- 유틸 ---------- */
  function normalizeText(s){ return (s||'').toString().trim(); }
  function toLowerNoSpace(s){ return normalizeText(s).replace(/\s+/g,'').toLowerCase(); }
  function escapeHTML(s){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

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

  /* ---------- sel_suggest 로더(1회) + 정규화/인덱싱 ---------- */
  G.SEL_SUG = G.SEL_SUG || { data: [], ready: false, _promise: null, varName: null };

  function loadSelSuggestScriptOnce(url, varName = 'SEL_SUGGEST'){
    if (G.SEL_SUG.ready && G.SEL_SUG.varName === varName) return Promise.resolve(G.SEL_SUG.data);
    if (G.SEL_SUG._promise) return G.SEL_SUG._promise;

    G.SEL_SUG.varName = varName;

    if (Array.isArray(G[varName])) {
      const norm = normalizeSelArray(G[varName]);
      G.SEL_SUG.data = norm; G.SEL_SUG.ready = true;
      return Promise.resolve(norm);
    }

    G.SEL_SUG._promise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => {
        const raw = G[varName];
        if (!Array.isArray(raw)) { reject(new Error(`Global "${varName}" not found or not an array after loading ${url}`)); return; }
        const norm = normalizeSelArray(raw);
        G.SEL_SUG.data = norm; G.SEL_SUG.ready = true;
        resolve(norm);
      };
      s.onerror = () => reject(new Error(`Failed to load ${url}`));
      document.head.appendChild(s);
    });

    return G.SEL_SUG._promise;
  }
  G.loadSelSuggestScriptOnce = loadSelSuggestScriptOnce;

  // ✅ 데이터 스키마(enclosure, address, ip, group)에 맞춤
  function normalizeSelArray(arr){
    const out = [];
    for (const item of arr) {
      let o = null;

      if (Array.isArray(item)) {
        const name = String(item[0] ?? '');
        const lat  = Number(item[1] ?? (item.latlng && item.latlng.getLat && item.latlng.getLat()));
        const lng  = Number(item[2] ?? (item.latlng && item.latlng.getLng && item.latlng.getLng()));
        o = {
          name, name1: name, name2: '', searchName: '',
          address: '', line: '', enclosure: '', ip: '', group: '',
          lat, lng
        };

      } else if (item && typeof item === 'object') {
        const lat = Number(
          item.lat ?? (item.latlng && item.latlng.getLat && item.latlng.getLat()) ??
          item.y ?? item.latitude
        );
        const lng = Number(
          item.lng ?? (item.latlng && item.latlng.getLng && item.latlng.getLng()) ??
          item.x ?? item.longitude
        );

        o = {
          name: item.name || '',
          name1: item.name1 || item.name || '',
          name2: item.name2 || '',
          searchName: item.searchName || '',
          address: item.address ?? item.addr ?? '',
          line: item.line || '',
          enclosure: item.enclosure ?? item.encloser ?? '',
          ip: item.ip || '',
          group: item.group || '',
          lat, lng
        };
      }

      if (!o) continue;
      if (!isFinite(o.lat) || !isFinite(o.lng)) continue;

      // 검색 인덱스
      o._needle = [
        o.name, o.name1, o.name2, o.searchName,
        o.address, o.line, o.enclosure, o.ip, o.group
      ].filter(Boolean).join(' ').replace(/\s+/g,'').toLowerCase();

      out.push(o);
    }
    return out;
  }

  /* ---------- CSS 주입 ---------- */
  function injectCSS(){
    if(document.getElementById('gx-suggest-style')) return;
    const css = `
.gx-suggest-root{
  position:fixed; top:12px; left:50%; transform:translateX(-50%);
  width:min(520px,90vw); z-index:999999;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans KR",Arial,"Apple SD Gothic Neo","Malgun 고딕","맑은 고딕",sans-serif;
}
.gx-suggest-search{position:relative;display:flex;align-items:center;gap:8px;}
.gx-suggest-search .gx-input{
  flex:1;height:42px;padding:0 14px;border:1px solid #ccc;border-radius:12px;
  background:#fff;font-size:15px;outline:none;transition:border .2s ease,box-shadow .2s ease;
}
.gx-suggest-search .gx-input:focus{border-color:#4a90e2;box-shadow:0 0 0 2px rgba(74,144,226,.2);}

/* 닫힘 상태: 지도 방해 방지(완전 제거) */
.gx-suggest-box{
  position:absolute;top:calc(100% + 2px);left:0;width:100%;
  max-height:45vh;overflow:auto;-webkit-overflow-scrolling:touch;
  background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.15);
  opacity:0;transform:translateY(-8px);
  display:none; pointer-events:none;
  transition:opacity .25s ease,transform .25s ease;
}
/* 열림 상태만 표시 + 이벤트 허용 */
.gx-suggest-box.open{
  display:block; pointer-events:auto;
  opacity:1; transform:translateY(0);
}

.gx-suggest-item{padding:12px 16px;cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;gap:4px;border-bottom:1px solid #f0f0f0;transition:background .2s;}
.gx-suggest-item:hover,.gx-suggest-item.active{background:#d9e9ff;}
.gx-suggest-title{font-weight:600;font-size:15px;color:#222;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gx-suggest-sub{font-size:13px;color:#666;display:flex;flex-wrap:wrap;gap:6px;}
.gx-suggest-root.is-hidden{display:none!important;}
    `.trim();
    const st = document.createElement('style');
    st.id = 'gx-suggest-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- DOM 생성 ---------- */
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

    // 접근성
    input.setAttribute('role','combobox');
    input.setAttribute('aria-autocomplete','list');

    const box = document.createElement('div'); box.className = 'gx-suggest-box'; box.setAttribute('role','listbox');
    box.id = box.id || 'gx-suggest-list';
    input.setAttribute('aria-controls', box.id);

    search.appendChild(input); root.appendChild(search); root.appendChild(box);
    parent.appendChild(root);

    // 기본 닫힘 상태
    box.style.display = 'none';
    box.style.pointerEvents = 'none';

    // iOS Safari 핀치 제스처 방지
    document.addEventListener('gesturestart', e=>e.preventDefault(), { passive:false });
    // 멀티터치 핀치 방지(제안창 내부)
    box.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive:false });

    return { root, input, box };
  }

  /* ---------- 공간 인덱스(최근접 매칭) ---------- */
  function buildGeoIndex(arr, cell = 0.0005){ // ~50m 셀
    const m = new Map();
    for (const o of arr) {
      const la = Number(o?.lat ?? o?.latlng?.getLat?.());
      const ln = Number(o?.lng ?? o?.latlng?.getLng?.());
      if (!isFinite(la) || !isFinite(ln)) continue;
      const ky = `${Math.floor(la/cell)}:${Math.floor(ln/cell)}`;
      const bucket = m.get(ky);
      if (bucket) bucket.push(o); else m.set(ky, [o]);
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

  /* ---------- 메인: 제안 UI ---------- */
  G.initSuggestUI = function initSuggestUI(opts){
    const {
      map,
      data = [],
      parent = document.body,
      getMarkers = null,
      badges = [],
      maxItems = 30,
      hideOnRoadview = true
    } = opts || {};
    if(!map) return;

    injectCSS();
    const { root, input, box } = createDOM(parent);

    // 데이터 인덱싱(_needle 없으면 생성)
    for (const o of data) {
      if (!o._needle) {
        o._needle = [
          o.name, o.name1, o.name2, o.searchName,
          o.address, o.line, o.enclosure, o.ip, o.group
        ].filter(Boolean).join(' ').replace(/\s+/g,'').toLowerCase();
      }
    }

    // 공간 인덱스(근접 탐색) 작성
    const geoIndex = buildGeoIndex(data, 0.0005); // ~50m

    // 상태
    let activeIdx = -1, current = [], __lastTypedQuery = '', __lastPickedQuery = '';
    G.__gxLastTypedQuery = __lastTypedQuery;
    G.__gxLastPickedQuery = __lastPickedQuery;

    let pickBlockUntil = 0;        // 확정 스로틀
    let pulseCircle = null;        // Circle 재사용
    let pulseHideTimer = null;     // Circle 숨김 타이머

    // 진행형(접두) 캐시
    let __lastQ = "", __lastPool = null;

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
        const key = o._needle || [
          o.name, o.name1, o.name2, o.searchName,
          o.address, o.line, o.enclosure, o.ip, o.group
        ].filter(Boolean).join(' ').replace(/\s+/g,'').toLowerCase();
        if (key.includes(n)) {
          out.push(o);
          if (out.length >= maxItems) break;
        }
      }
      __lastQ = n;
      __lastPool = out.length >= 10 ? out : null;
      return out;
    }

    function getLatLngFromItem(o){
      const lat = Number(o?.lat ?? o?.latlng?.getLat?.());
      const lng = Number(o?.lng ?? o?.latlng?.getLng?.());
      return { lat, lng };
    }

    // 지도 이동(레벨3 고정) + 빨간 원 Circle 1초 — 인스턴스 재사용
// 파일 내 기존 centerWithEffect 를 이 버전으로 교체
function centerWithEffect(lat, lng){
  const pt = new kakao.maps.LatLng(lat, lng);

  // 이동 + 레벨 고정
  try { map.setLevel(3); } catch {}
  try { map.panTo(pt); } catch {}

  // ✅ 매번 새로운 써클 생성 (이전 써클은 정리)
  try {
    // 이전 써클 제거
    if (pulseCircle) {
      try { pulseCircle.setMap(null); } catch {}
      pulseCircle = null;
    }
    // 새 써클 만들기
    pulseCircle = new kakao.maps.Circle({
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
    pulseCircle.setMap(map);

    // 타이머 갱신
    if (pulseHideTimer) clearTimeout(pulseHideTimer);
    pulseHideTimer = setTimeout(() => {
      try {
        if (pulseCircle) {
          pulseCircle.setMap(null);
          pulseCircle = null;
        }
      } catch {}
    }, 1000);
  } catch {}
}


    function __rememberPicked(){
      const q = (input.value||'').trim();
      if(q){ __lastPickedQuery = q; G.__gxLastPickedQuery = q; }
    }

    function pick(i){
      if(i<0 || i>=current.length) return;
      const now = Date.now();
      if(now < pickBlockUntil) return;
      pickBlockUntil = now + 450;

      const o = current[i];
      const t = extractAfterSecondHyphen(o.name1 || o.name2 || o.name || o.searchName);
      if(t) input.value = t;

      const {lat, lng} = getLatLngFromItem(o);
      if(isFinite(lat) && isFinite(lng)) centerWithEffect(lat, lng); // ✅ 제안 확정 시 이동+레벨3+써클

      __rememberPicked();
      closeBox(); // blur 없음
    }

    // 입력 이벤트
    input.addEventListener('input', ()=>{
      const q = (input.value||'').trim();
      if(q){ __lastTypedQuery = q; G.__gxLastTypedQuery = q; }
      if(!q){ closeBox(); box.innerHTML=''; return; }
      const list = filterData(q); current = list;
      if(!list.length){ closeBox(); box.innerHTML=''; return; }
      render(list); openBox();
    });

    // 포커스 시 현재 값으로 열기
    input.addEventListener('focus', ()=>{
      const q = (input.value||'').trim();
      if(!q) return;
      const list = filterData(q); current = list;
      if(list.length){ render(list); openBox(); }
    });

    // 키보드 내비: ↑/↓/Esc + Enter 확정(IME 가드)
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

    // 입력창 클릭: 전체선택 없이 제안만 열기 (비어있으면 최근 질의 복원)
    input.addEventListener('mousedown',()=>{
      setTimeout(()=>{
        let q = (input.value||'').trim();
        if(!q) q = __lastPickedQuery || __lastTypedQuery || '';
        if(!q) return;
        const list = filterData(q); current = list;
        if(list.length){ render(list); openBox(); }
      },0);
    });

    /* ▶︎ 패스스루: 빈 영역에서 드래그/탭 시 지도에 곧바로 전달 (모바일 포함) */
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

    // 바깥 클릭 닫기
    document.addEventListener('mousedown',(e)=>{
      if(!box.classList.contains('open')) return;
      if(e.target===input || box.contains(e.target)) return;
      closeBox();
    });
    window.addEventListener('resize', closeBox);

    // ✅ 지도 클릭: 제안창 닫기 + 키보드 내리기만 (이동/써클 X)
    kakao.maps.event.addListener(map,'click',()=>{
      closeBox();
      try {
        if (document.activeElement === input) input.blur();
      } catch {}
    });
    kakao.maps.event.addListener(map,'dragstart',()=>closeBox());

    // Safari: touchend에서만 필요 시 blur
    const mapEl=document.getElementById('map');
    if(mapEl){
      mapEl.addEventListener('touchend',()=>{
        if(document.activeElement===input) input.blur();
      },{passive:true});
    }

    /* 화면에서 안 보이면 강제 닫기 (완전 제거 보장) */
    try{
      const io = new IntersectionObserver((entries)=>{
        const on = entries[0] && entries[0].isIntersecting;
        if(!on) closeBox();
      }, { root:null, threshold:0 });
      io.observe(root);
    }catch{}

    /* ----- 글로벌 핫키(중복 바인딩 가드) ----- */
    if (!G.__gxSuggestBound) {
      G.__gxSuggestBound = true;

      // "/" 핫키
      window.addEventListener('keydown',(e)=>{
        const isSlash = (e.key==='/' || e.code==='Slash' || e.keyCode===191);
        if(!isSlash) return;

        const ae = document.activeElement;
        const isOtherEditable = (ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable));
        if(isOtherEditable && !ae.classList.contains('gx-input')) return;

        e.preventDefault();
        e.stopPropagation();

        const el = document.querySelector('.gx-suggest-root .gx-input');
        if(el){ try{ el.focus(); }catch{} }

        const inputEl = el || document.activeElement;
        if(!inputEl) return;
        let seed = (inputEl.value||'').trim();
        if(!seed) seed = G.__gxLastPickedQuery || G.__gxLastTypedQuery || '';
        if(seed){
          inputEl.value = seed;
          try{ inputEl.dispatchEvent(new Event('input', {bubbles:true})); }catch{}
        }
        try{ inputEl.setSelectionRange(0, inputEl.value.length); }catch{}
      }, true);

      // 비활성 상태에서도 화살표 지원: ←/→/↓
      window.addEventListener('keydown',(e)=>{
        const ae = document.activeElement;
        const isOurInput = (ae && ae.classList && ae.classList.contains('gx-input'));
        const isOtherEditable = !isOurInput && (ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable));
        if(isOtherEditable) return; // 다른 입력 요소 사용 중이면 개입 X
        if(isOurInput) return;      // 이미 우리 입력창이면 이 핸들러는 패스

        const inputEl = document.querySelector('.gx-suggest-root .gx-input');
        if(!inputEl) return;

        if(e.key==='ArrowDown'){
          e.preventDefault();
          try{ inputEl.focus(); }catch{}
          let seed = (inputEl.value||'').trim();
          if(!seed) seed = G.__gxLastPickedQuery || G.__gxLastTypedQuery || '';
          if(seed){
            inputEl.value = seed;
            try{ inputEl.dispatchEvent(new Event('input', {bubbles:true})); }catch{}
          }
        }else if(e.key==='ArrowLeft' || e.key==='ArrowRight'){
          e.preventDefault();
          try{ inputEl.focus(); }catch{}
          const val = inputEl.value||'';
          // 요구사항: ← = 커서 맨 오른쪽, → = 커서 맨 왼쪽
          const pos = (e.key==='ArrowLeft') ? val.length : 0;
          try{ inputEl.setSelectionRange(pos, pos); }catch{}
        }
      }, true);
    }

    /* ----- 마커 클릭 → 입력창 자동 입력 + 이동/써클 (로드뷰 모드면 무시) ----- */
    const patched = new WeakSet();
    function attachMarkerHandlersOnce(){
      const container = parent.closest('#container') || document.getElementById('container') || document.body;
      const list = (typeof getMarkers==='function' ? getMarkers() : (Array.isArray(G.markers) ? G.markers : [])) || [];
      if(!Array.isArray(list)) return;

      list.forEach(mk=>{
        if(!mk || patched.has(mk)) return;
        if(typeof mk.getPosition!=='function'){ patched.add(mk); return; }

        kakao.maps.event.addListener(mk,'click',()=>{
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

            if (found) {
              text = extractAfterSecondHyphen(found.name1 || found.name2 || found.name || found.searchName);
            }
            if (!text && typeof mk.getTitle==='function') {
              const t = mk.getTitle(); if (t) text = extractAfterSecondHyphen(t, t);
            }

            if(text){
              input.value = text;
              __lastPickedQuery = text; G.__gxLastPickedQuery = text;
              closeBox(); // 포커스 유지
            }

            if (isFinite(lat) && isFinite(lng)) centerWithEffect(lat, lng); // ✅ 마커 클릭 시 이동+써클
          }catch{}
        });

        patched.add(mk);
      });
    }
    attachMarkerHandlersOnce();
    document.addEventListener('markers:updated', attachMarkerHandlersOnce);

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
  };

})();
