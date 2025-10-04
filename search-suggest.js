/* ===== search-suggest.js (DOM + CSS 자동 생성 통합 버전, Safari 완전 대응) ===== */
(function () {
  /* ---------- 유틸 ---------- */
  function normalizeText(s) { return (s || '').toString().trim(); }
  function toLowerNoSpace(s) { return normalizeText(s).replace(/\s+/g, '').toLowerCase(); }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  /* ---------- 스타일 주입 ---------- */
  function injectCSS() {
    if (document.getElementById('gx-suggest-style')) return;
    const css = `
.gx-suggest-root{
  position:absolute; top:12px; left:50%; transform:translateX(-50%);
  width:min(520px,90vw); z-index:600;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans KR",Arial,"Apple SD Gothic Neo","Malgun Gothic","맑은 고딕",sans-serif;
}
/* ✅ 제안창만 터치제스처 차단 */
.gx-suggest-box {
  touch-action: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}
/* ✅ 검색창은 정상 입력되도록 허용 */
.gx-suggest-search,
.gx-suggest-search .gx-input {
  touch-action:auto !important;
}

.gx-suggest-search{ display:flex; align-items:center; gap:8px; }
.gx-suggest-search .gx-input{
  flex:1; height:42px; padding:0 14px; border:1px solid #ccc; border-radius:12px;
  background:#fff; font-size:15px; outline:none; box-sizing:border-box;
  transition:border .2s ease, box-shadow .2s ease;
}
.gx-suggest-search .gx-input:focus{
  border-color:#4a90e2; box-shadow:0 0 0 2px rgba(74,144,226,0.2);
}
.gx-suggest-search .gx-btn{ display:none; }
.gx-suggest-box{
  position:absolute; top:52px; left:0; width:100%;
  max-height:45vh; overflow:auto; -webkit-overflow-scrolling:touch;
  background:#fff; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.15);
  opacity:0; pointer-events:none; transform:translateY(-8px);
  transition:opacity .25s ease, transform .25s ease;
}
.gx-suggest-box.open{ opacity:1; pointer-events:auto; transform:translateY(0); }
.gx-suggest-item{ padding:12px 16px; cursor:pointer; display:flex; flex-direction:column;
  align-items:flex-start; gap:4px; border-bottom:1px solid #f0f0f0; transition:background .2s ease; }
.gx-suggest-item:last-child{ border-bottom:none; }
.gx-suggest-item:hover, .gx-suggest-item.active{ background:#d9e9ff; }
.gx-suggest-title{ font-weight:600; font-size:15px; color:#222; line-height:1.3;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.gx-suggest-sub{ font-size:13px; color:#666; line-height:1.4; display:flex; flex-wrap:wrap; gap:6px; }
.gx-suggest-sub span{ white-space:nowrap; }
.gx-suggest-root.is-hidden{ display:none !important; }
    `.trim();
    const tag = document.createElement('style');
    tag.id = 'gx-suggest-style';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  /* ---------- DOM 생성 ---------- */
  function createDOM(parent) {
    let root = parent.querySelector('.gx-suggest-root');
    if (root) {
      return {
        root,
        input: root.querySelector('.gx-input'),
        box: root.querySelector('.gx-suggest-box')
      };
    }

    root = document.createElement('div');
    root.className = 'gx-suggest-root';

    const search = document.createElement('div');
    search.className = 'gx-suggest-search';

    const input = document.createElement('input');
    input.className = 'gx-input';
    input.type = 'search';
    input.placeholder = '예) 시설명, 주소…';
    input.autocomplete = 'off';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gx-btn';
    btn.textContent = '검색';

    search.appendChild(input);
    search.appendChild(btn);

    const box = document.createElement('div');
    box.className = 'gx-suggest-box';
    box.setAttribute('role','listbox');

    root.appendChild(search);
    root.appendChild(box);
    parent.appendChild(root);

    /* ✅ 핀치줌 차단 (입력창 제외) */
    [box].forEach(el => {
      el.addEventListener('touchstart', e => {
        if (e.touches.length > 1) e.preventDefault();
      }, { passive:false });
    });
    document.addEventListener('gesturestart', e => e.preventDefault(), { passive:false });

    return { root, input, box };
  }

  /* ---------- 메인 ---------- */
  window.initSuggestUI = function initSuggestUI(opts) {
    const { map, data = [], parent = document, getMarkers = null,
            badges = [], maxItems = 30, chooseOnEnter = true,
            openOnFocus = true, hideOnRoadview = true } = opts || {};
    if (!parent || !map) return;

    injectCSS();
    const { root, input, box } = createDOM(parent);

    // === 기존 검색/렌더링 로직 (전부 유지) ===
    function openBox() { if (!box.classList.contains('open')) { box.classList.add('open'); input.setAttribute('aria-expanded', 'true'); } }
    function closeBox() { if (box.classList.contains('open')) { box.classList.remove('open'); input.setAttribute('aria-expanded', 'false'); } setActive(-1); }
    function setActive(i) {
      const list = items();
      list.forEach(el => { el.classList.remove('active'); el.setAttribute('aria-selected','false'); });
      activeIdx = i;
      if (i >= 0 && i < list.length) {
        const el = list[i]; el.classList.add('active'); el.setAttribute('aria-selected','true');
        try { el.scrollIntoView({ block:'nearest' }); } catch(_) {}
      }
    }
    function items() { return Array.from(box.querySelectorAll('.gx-suggest-item')); }
    let activeIdx = -1, current = [];
    function filterData(q) {
      const needle = toLowerNoSpace(q); if (!needle) return [];
      const out=[]; for (const o of data) {
        const hay = toLowerNoSpace([o.name,o.name1,o.name2,o.searchName,o.addr,o.line,o.encloser].filter(Boolean).join(' '));
        if (hay.includes(needle)) out.push(o);
        if (out.length>=maxItems) break;
      } return out;
    }
    function titleOf(o){ return normalizeText(o.name2||o.name||o.name1||o.searchName||''); }
    function makeItemHTML(o){
      const title=titleOf(o);
      const sub=badges.map(k=>o[k]?`<span>${escapeHTML(String(o[k]))}</span>`:'').filter(Boolean).join(' ');
      return `<div class="gx-suggest-item" role="option" aria-selected="false"><div class="gx-suggest-title">${escapeHTML(title)}</div>${sub?`<div class="gx-suggest-sub">${sub}</div>`:''}</div>`;
    }
    function render(list){ box.innerHTML=list.map(makeItemHTML).join('');
      box.querySelectorAll('.gx-suggest-item').forEach((el,idx)=>{
        el.addEventListener('mouseenter',()=>setActive(idx));
        el.addEventListener('mouseleave',()=>setActive(-1));
        el.addEventListener('mousedown',e=>e.preventDefault());
        el.addEventListener('click',()=>pick(idx));
      }); setActive(-1);
    }
    function pick(idx){ if(idx<0||idx>=current.length)return; const o=current[idx]; const t=titleOf(o); if(t) input.value=t;
      const lat=parseFloat(o.lat||(o.latlng&&o.latlng.getLat&&o.latlng.getLat()));
      const lng=parseFloat(o.lng||(o.latlng&&o.latlng.getLng&&o.latlng.getLng()));
      if(isFinite(lat)&&isFinite(lng)&&map){ const ll=new kakao.maps.LatLng(lat,lng);
        try{map.setLevel(3);}catch(_){} try{map.panTo(ll);}catch(_){} }
      closeBox(); input.blur();
    }

    // === 입력 이벤트 ===
    let last='';
    input.addEventListener('input',()=>{
      const q=input.value||'';
      if(q.trim()===''){closeBox();box.innerHTML='';last='';return;}
      if(q===last&&box.classList.contains('open'))return;
      last=q; const list=filterData(q); current=list;
      if(list.length===0){closeBox();box.innerHTML='';return;}
      render(list); openBox();
    });
    input.addEventListener('focus',()=>{
      if(!openOnFocus)return;
      const q=input.value||''; if(q.trim()==='')return;
      const list=filterData(q); current=list; if(list.length>0){render(list);openBox();}
    });

    // === 키보드 내비게이션 ===
    input.addEventListener('keydown',(e)=>{
      const list=items(); const open=box.classList.contains('open')&&list.length>0;
      if(!open&&(e.key==='ArrowDown'||e.key==='ArrowUp')){
        const q=input.value||''; if(q.trim()!==''){const l=filterData(q); current=l; if(l.length>0){render(l);openBox();}}
      }
      if(e.key==='ArrowDown'&&open){e.preventDefault();setActive((activeIdx+1)%list.length);}
      else if(e.key==='ArrowUp'&&open){e.preventDefault();setActive((activeIdx-1+list.length)%list.length);}
      else if(e.key==='Enter'&&open&&chooseOnEnter){
        if(list.length&&document.activeElement===input){e.preventDefault();pick(list.findIndex(el=>el.classList.contains('active')));}
      } else if(e.key==='Escape'){closeBox();}
    });

    // === 바깥 클릭으로 닫기 ===
    document.addEventListener('mousedown',(e)=>{
      if(!box.classList.contains('open'))return;
      if(e.target===input||box.contains(e.target))return;
      closeBox();
    });
    window.addEventListener('resize',closeBox);

    // === 지도 이벤트 ===
    if (map) {
      // 지도 클릭 → 제안창만 닫기
      kakao.maps.event.addListener(map, 'click', () => { closeBox(); });

      // 지도 드래그 → blur (키보드만 내리기)
      kakao.maps.event.addListener(map, 'dragstart', () => { input.blur(); });
      kakao.maps.event.addListener(map, 'drag',      () => { input.blur(); });
      kakao.maps.event.addListener(map, 'dragend',   () => { input.blur(); });
    }

    // ✅ Safari 대응: 지도 DOM touchend → blur (지연)
    const mapEl=document.getElementById('map');
    if(mapEl){
      mapEl.addEventListener('touchend',()=>{ setTimeout(()=>input.blur(),100); },{passive:true});
      mapEl.addEventListener('touchmove',()=>{ input.blur(); },{passive:true});
    }
    box.addEventListener('touchmove',()=>{ input.blur(); },{passive:true});

    // === 로드뷰 숨김 ===
    if(hideOnRoadview){
      const container=parent.closest('#container')||document.getElementById('container')||document.body;
      const update=()=>{const on=container.classList.contains('view_roadview'); if(on){root.classList.add('is-hidden');closeBox();}else root.classList.remove('is-hidden');};
      update(); const mo=new MutationObserver(update); mo.observe(container,{attributes:true,attributeFilter:['class']});
    }
  };
})();
