/* ===== search-suggest.js (DOM + CSS 자동 생성 통합 버전, Safari 대응 + Enter/Click 이동 & 원 표시) ===== */
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
/* ✅ 제안창: 세로 스크롤 허용 + 핀치/더블탭 확대 차단 */
.gx-suggest-box {
  touch-action: pan-y;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  overscroll-behavior: contain;
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

    /* ✅ 핀치줌 차단(멀티터치만 막음: 드래그는 그대로 동작) */
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

    // 접근성
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    box.id = box.id || 'gx-suggest-list';
    input.setAttribute('aria-controls', box.id);

    // === 상태 & 헬퍼 ===
    let activeIdx = -1, current = [];
    let lastQuery = ''; // 마지막 검색어 저장
    const items = () => Array.from(box.querySelectorAll('.gx-suggest-item'));

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
    function filterData(q) {
      const needle = toLowerNoSpace(q); if (!needle) return [];
      const out=[]; for (const o of data) {
        const hay = toLowerNoSpace([o.name,o.name1,o.name2,o.searchName,o.addr,o.line,o.encloser].filter(Boolean).join(' '));
        if (hay.includes(needle)) out.push(o);
        if (out.length>=maxItems) break;
      } return out;
    }
    function titleOf(o){ return normalizeText(o.name2||o.name||o.name1||o.searchName||''); }

    // 🔄 변경: name에서 "-문자/숫자-" 이후 ~ 한글 연속 구간 추출 → 없으면 name1 → title
    function displayTextOf(o){
      const name = normalizeText(o.name||'');
      let disp = '';
      if (name) {
        // 이전: /-\s*\d+\s*-/  →  변경: /-\s*[A-Za-z0-9]+\s*-/
        const parts = name.split(/-\s*[A-Za-z0-9]+\s*-/);
        if (parts.length > 1) {
          const after = normalizeText(parts.slice(1).join('-'));
          const m = after.match(/^[\uAC00-\uD7A3\s]+/); // 시작부터 연속 한글
          disp = normalizeText(m ? m[0] : after);
        }
      }
      if (!disp) disp = normalizeText(o.name1||'');
      if (!disp) disp = titleOf(o);
      return disp;
    }

    function makeItemHTML(o){
      const title=titleOf(o);
      const sub=badges.map(k=>o[k]?`<span>${escapeHTML(String(o[k]).replace(/^ip\s*:\s*/i,''))}</span>`:'').filter(Boolean).join(' ');
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

    // 좌표 파싱 안정화(+ 콤마 제거, 뒤바뀜 자동 교정)
    function getLatLngFromItem(o){
      function num(v){
        if (v == null) return NaN;
        const n = parseFloat(String(v).replace(/,/g,'').trim());
        return Number.isFinite(n) ? n : NaN;
      }
      let lat = num(o.lat);
      let lng = num(o.lng);

      if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && o.latlng) {
        try { lat = num(o.latlng.getLat()); lng = num(o.latlng.getLng()); } catch(_){}
      }
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        const t = lat; lat = lng; lng = t;
      }
      if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return { lat: NaN, lng: NaN };
      return {lat, lng};
    }

    // 지도 이동 + 펄스 (전역 setCenter가 있으면 위임)
    function centerWithEffect(lat, lng){
      const pt = new kakao.maps.LatLng(lat, lng);

      if (typeof window.setCenter === 'function') {
        try { window.setCenter(lat, lng); } catch(_) {}
        return;
      }

      try { map.setLevel(1, { animate: true }); } catch(_) { try { map.setLevel(1); } catch(_) {} }

      let drawn = false;
      function drawPulse() {
        if (drawn) return; drawn = true;
        try {
          const circle = new kakao.maps.Circle({
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
          circle.setMap(map);
          setTimeout(()=>{ try { circle.setMap(null); } catch(_) {} }, 1000);
        } catch(_) {}
      }

      try {
        if (window.requestAnimationFrame) {
          requestAnimationFrame(() => {
            try { map.panTo(pt); } catch(_) {}
            requestAnimationFrame(drawPulse);
          });
        } else {
          setTimeout(() => { try { map.panTo(pt); } catch(_) {}; setTimeout(drawPulse, 50); }, 16);
        }
      } catch(_) {
        try { map.panTo(pt); } catch(_) {}
        setTimeout(drawPulse, 60);
      }
      setTimeout(drawPulse, 180);
    }

    function pick(idx){
      if(idx<0||idx>=current.length) return;
      const o=current[idx];
      const disp = displayTextOf(o);
      if(disp) input.value=disp, lastQuery=disp;

      const {lat, lng} = getLatLngFromItem(o);
      if (isFinite(lat) && isFinite(lng) && map) {
        centerWithEffect(lat, lng);
        // 로드뷰 모드면 RV도 같이 이동(충돌 방지)
        if (window.overlayOn && typeof window.setRoadviewAt === 'function' && window.kakao && kakao.maps) {
          try { window.setRoadviewAt(new kakao.maps.LatLng(lat, lng)); } catch(_){}
        }
      }
      closeBox(); input.blur();
    }

    // === 입력 이벤트 ===
    let lastInputValue='';

    input.addEventListener('input',()=>{
      const q=input.value||'';
      if(q.trim()===''){closeBox();box.innerHTML='';lastInputValue='';return;}
      if(q===lastInputValue&&box.classList.contains('open'))return;
      lastInputValue=q; lastQuery=q; // 마지막 검색어 저장
      const list=filterData(q); current=list;
      if(list.length===0){closeBox();box.innerHTML='';return;}
      render(list); openBox();
    });

    // 포커스 시: 비어있고 lastQuery가 있으면 채워서 제안 오픈 + 전체 선택
    input.addEventListener('focus',()=>{
      let q=input.value||'';
      if(q.trim()==='' && lastQuery){
        input.value = lastQuery;
        q = lastQuery;
        const list=filterData(q); current=list;
        if(list.length>0){ render(list); openBox(); }
        setTimeout(()=>{ try{ input.select(); }catch(_){}} ,0);
        return;
      }
      if(!openOnFocus) return;
      if(q.trim()==='') return;
      const list=filterData(q); current=list; if(list.length>0){render(list);openBox();}
      setTimeout(()=>{ try{ input.select(); }catch(_){}} ,0);
    });

    // === "/" 단축키: 비활성화 상태에서 입력창 활성화 + lastQuery 제안 + 전체 선택 ===
    function isTypingElement(el){
      return el && (
        el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ||
        el.isContentEditable || (el.closest && el.closest('[contenteditable="true"]'))
      );
    }
    document.addEventListener('keydown', (e)=>{
      if (e.key !== '/') return;
      const ae = document.activeElement;
      if (isTypingElement(ae)) return; // 다른 입력 중이면 무시
      e.preventDefault();
      input.focus();
      if ((input.value||'').trim()==='' && lastQuery){
        input.value = lastQuery;
        const list = filterData(lastQuery); current=list;
        if (list.length>0){ render(list); openBox(); }
      }
      setTimeout(()=>{ try{ input.select(); }catch(_){}} ,0);
    }, {capture:true});

    // === 키보드 내비게이션 & Enter 동작 ===
    input.addEventListener('keydown',(e)=>{
      const els=items(); const isOpen=box.classList.contains('open')&&els.length>0;

      if(!isOpen&&(e.key==='ArrowDown'||e.key==='ArrowUp')){
        const q=input.value||''; if(q.trim()!==''){const l=filterData(q); current=l; if(l.length>0){render(l);openBox();}}
      }

      if(e.key==='ArrowDown'&&isOpen){ e.preventDefault(); setActive((activeIdx+1)%els.length); }
      else if(e.key==='ArrowUp'&&isOpen){ e.preventDefault(); setActive((activeIdx-1+els.length)%els.length); }
      else if(e.key==='Enter'){
        e.preventDefault();
        // 제안창 열려있으면 활성 항목, 아니면 현재 쿼리로 재검색하여 맨 위
        let useList = current;
        if (!isOpen) {
          const q = (input.value||'').trim();
          useList = q ? filterData(q) : [];
          current = useList;
          if (useList.length) { render(useList); openBox(); }
        }
        if (useList.length) {
          const idx = (activeIdx>=0 && activeIdx<useList.length) ? activeIdx : 0;
          const o = useList[idx];
          const disp = displayTextOf(o);
          if (disp) input.value = disp, lastQuery = disp;

          const {lat, lng} = getLatLngFromItem(o);
          if (isFinite(lat) && isFinite(lng)) {
            centerWithEffect(lat, lng);
            if (window.overlayOn && typeof window.setRoadviewAt === 'function' && window.kakao && kakao.maps) {
              try { window.setRoadviewAt(new kakao.maps.LatLng(lat, lng)); } catch(_){}
            }
          }
          closeBox(); input.blur();
        }
      } else if(e.key==='Escape'){
        closeBox();
      }
    });

    // === 바깥 클릭으로 닫기 ===
    document.addEventListener('mousedown',(e)=>{
      if(!box.classList.contains('open')) return;
      if(e.target===input||box.contains(e.target)) return;
      closeBox();
    });
    window.addEventListener('resize',closeBox);

    // === 지도 이벤트 (키보드 내리기만) ===
    if (map) {
      kakao.maps.event.addListener(map, 'click', () => { closeBox(); });
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
    // 제안창 스크롤/드래그 시 키보드만 내림 (제안창은 유지)
    box.addEventListener('touchmove',()=>{ input.blur(); },{passive:true});

    // === 로드뷰 숨김 ===
    if(hideOnRoadview){
      const container=parent.closest('#container')||document.getElementById('container')||document.body;
      const update=()=>{const on=container.classList.contains('view_roadview'); if(on){root.classList.add('is-hidden');closeBox();}else root.classList.remove('is-hidden');};
      update(); const mo=new MutationObserver(update); mo.observe(container,{attributes:true,attributeFilter:['class']});
    }
  };
})();
