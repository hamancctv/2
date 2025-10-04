/* ===== search-suggest.js (통합 개선버전, 2025-10-04)
   - 입력창과 제안창 간격 자동조정(top:calc(100% + 4px))
   - 프리징 원인 setInterval 제거(마커 이벤트 1회만 등록)
   - 나머지 기능은 기존과 동일
===== */
(function () {
  /* ---------- 유틸 ---------- */
  function normalizeText(s) { return (s || '').toString().trim(); }
  function toLowerNoSpace(s) { return normalizeText(s).replace(/\s+/g, '').toLowerCase(); }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function extractKoreanTail(name, fallback) {
    const src = normalizeText(name);
    const m = src.match(/-[A-Za-z0-9가-힣]+-\s*([가-힣\s]+)/);
    if (m && m[1]) {
      const picked = m[1].trim();
      if (picked) return picked;
    }
    return normalizeText(fallback || src);
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
.gx-suggest-box {
  touch-action: pan-y;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  overscroll-behavior: contain;
}
.gx-suggest-search,
.gx-suggest-search .gx-input { touch-action:auto !important; }

.gx-suggest-search{
  position: relative;
  display:flex; align-items:center; gap:8px;
}
.gx-suggest-search .gx-input{
  flex:1; height:42px; padding:0 14px; border:1px solid #ccc; border-radius:12px;
  background:#fff; font-size:15px; outline:none; box-sizing:border-box;
  transition:border .2s ease, box-shadow .2s ease;
}
.gx-suggest-search .gx-input:focus{
  border-color:#4a90e2; box-shadow:0 0 0 2px rgba(74,144,226,0.2);
}
.gx-suggest-search .gx-btn{ display:none; }

/* ✅ 입력창 바로 아래에 제안창 자동배치 */
.gx-suggest-box{
  position:absolute; top:calc(100% + 4px); left:0; width:100%;
  max-height:45vh; overflow:auto; -webkit-overflow-scrolling:touch;
  background:#fff; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.15);
  opacity:0; pointer-events:none; transform:translateY(-8px);
  transition:opacity .25s ease, transform .25s ease;
}
.gx-suggest-box.open{ opacity:1; pointer-events:auto; transform:translateY(0); }

.gx-suggest-item{
  padding:12px 16px; cursor:pointer; display:flex; flex-direction:column; align-items:flex-start; gap:4px;
  border-bottom:1px solid #f0f0f0; transition:background .2s ease;
}
.gx-suggest-item:last-child{ border-bottom:none; }
.gx-suggest-item:hover, .gx-suggest-item.active{ background:#d9e9ff; }

.gx-suggest-title{
  font-weight:600; font-size:15px; color:#222; line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.gx-suggest-sub{
  font-size:13px; color:#666; line-height:1.4; display:flex; flex-wrap:wrap; gap:6px; min-height:18px;
}
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

    // 핀치줌 차단
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
    const {
      map,
      data = [],
      parent = document,
      getMarkers = null,
      badges = [],
      maxItems = 30,
      chooseOnEnter = true,
      openOnFocus = true,
      hideOnRoadview = true
    } = opts || {};
    if (!parent || !map) return;

    injectCSS();
    const { root, input, box } = createDOM(parent);

    let activeIdx = -1, current = [], last = '';
    let __lastTypedQuery = '', __lastPickedQuery = '';

    const items = () => Array.from(box.querySelectorAll('.gx-suggest-item'));

    function openBox(){ if(!box.classList.contains('open')){box.classList.add('open');input.setAttribute('aria-expanded','true');}}
    function closeBox(){ if(box.classList.contains('open')){box.classList.remove('open');input.setAttribute('aria-expanded','false');} setActive(-1);}
    function setActive(i){const list=items();list.forEach(el=>{el.classList.remove('active');el.setAttribute('aria-selected','false');});
      activeIdx=i;if(i>=0&&i<list.length){const el=list[i];el.classList.add('active');el.setAttribute('aria-selected','true');try{el.scrollIntoView({block:'nearest'});}catch(_){}};}

    function badgeLine(obj){if(!badges||badges.length===0)return'';const spans=[];for(const key of badges){if(!obj)continue;const raw=obj[key];if(!raw)continue;const t=normalizeText(String(raw).replace(/^ip\s*:\s*/i,''));if(t)spans.push(`<span>${escapeHTML(t)}</span>`);}return spans.length?`<div class="gx-suggest-sub">${spans.join(' ')}</div>`:'';}
    function titleOf(o){return normalizeText(o.name2||o.name||o.name1||o.searchName||'');}
    function inputTitleOf(o){const fb=normalizeText(o.name1||o.name2||o.name||o.searchName||'');return extractKoreanTail(o.name,fb);}
    function makeItemHTML(o){const t=titleOf(o);const s=badgeLine(o);return `<div class="gx-suggest-item" role="option"><div class="gx-suggest-title">${escapeHTML(t)}</div>${s}</div>`;}
    function render(list){box.innerHTML=list.map(makeItemHTML).join('');box.querySelectorAll('.gx-suggest-item').forEach((el,idx)=>{el.addEventListener('mouseenter',()=>setActive(idx));el.addEventListener('mouseleave',()=>setActive(-1));el.addEventListener('mousedown',e=>e.preventDefault());el.addEventListener('click',()=>pick(idx));});setActive(-1);}
    function filterData(q){const n=toLowerNoSpace(q);if(!n)return[];const out=[];for(const o of data){const h=toLowerNoSpace([o.name,o.name1,o.name2,o.searchName,o.addr,o.line,o.encloser].filter(Boolean).join(' '));if(h.includes(n))out.push(o);if(out.length>=maxItems)break;}return out;}
    function getLatLngFromItem(o){const lat=Number(o.lat||(o.latlng&&o.latlng.getLat&&o.latlng.getLat()));const lng=Number(o.lng||(o.latlng&&o.latlng.getLng&&o.latlng.getLng()));return{lat,lng};}
    function centerWithEffect(lat,lng){const pt=new kakao.maps.LatLng(lat,lng);try{map.panTo(pt);}catch(_){}try{const c=new kakao.maps.Circle({center:pt,radius:50,strokeWeight:1,strokeColor:'#ffa500',strokeOpacity:1,strokeStyle:'dashed',fillColor:'#FF1000',fillOpacity:0.3,zIndex:9999});c.setMap(map);setTimeout(()=>{c.setMap(null);},1000);}catch(_){}}
    function __rememberPicked(){const q=(input.value||'').trim();if(q)__lastPickedQuery=q;}
    function pick(idx){if(idx<0||idx>=current.length)return;const o=current[idx];const t=inputTitleOf(o);if(t)input.value=t;const {lat,lng}=getLatLngFromItem(o);if(isFinite(lat)&&isFinite(lng))centerWithEffect(lat,lng);__rememberPicked();closeBox();input.blur();}

    input.addEventListener('input',()=>{const q=(input.value||'').trim();if(q)__lastTypedQuery=q;if(q===''){closeBox();box.innerHTML='';last='';return;}if(q===last&&box.classList.contains('open'))return;last=q;const list=filterData(q);current=list;if(list.length===0){closeBox();box.innerHTML='';return;}render(list);openBox();});
    input.addEventListener('focus',()=>{if(!openOnFocus)return;const q=input.value||'';if(q.trim()==='')return;const list=filterData(q);current=list;if(list.length>0){render(list);openBox();}});
    input.addEventListener('keydown',e=>{const listEls=items();const isOpen=box.classList.contains('open')&&listEls.length>0;
      if(!isOpen&&(e.key==='ArrowDown'||e.key==='ArrowUp')){const q=(input.value||'').trim();if(q!==''){const l=filterData(q);current=l;if(l.length>0){render(l);openBox();}}}
      if(e.key==='ArrowDown'&&isOpen){e.preventDefault();setActive((activeIdx+1)%listEls.length);}
      else if(e.key==='ArrowUp'&&isOpen){e.preventDefault();setActive((activeIdx-1+listEls.length)%listEls.length);}
      else if(e.key==='Enter'){e.preventDefault();if(current.length){const idx=(activeIdx>=0&&activeIdx<current.length)?activeIdx:0;const {lat,lng}=getLatLngFromItem(current[idx]);const t=inputTitleOf(current[idx]);if(t)input.value=t;if(isFinite(lat)&&isFinite(lng))centerWithEffect(lat,lng);__rememberPicked();closeBox();input.blur();}}
      else if(e.key==='Escape'){closeBox();}});

    document.addEventListener('mousedown',e=>{if(!box.classList.contains('open'))return;if(e.target===input||box.contains(e.target))return;closeBox();});
    window.addEventListener('resize',closeBox);
    if(map){kakao.maps.event.addListener(map,'click',()=>{closeBox();});kakao.maps.event.addListener(map,'dragstart',()=>{input.blur();});}

    /* ===== "/" 핫키 + 클릭 포커스 규칙 ===== */
    function __showLastQueryIfEmpty(){if((input.value||'').trim()!=='')return;const fb=__lastPickedQuery||__lastTypedQuery||'';if(!fb)return;input.value=fb;const list=filterData(fb);if(list.length){render(list);openBox();}}
    function __openWithCurrent(){const q=(input.value||'').trim();if(q){const list=filterData(q);current=list;if(list.length){render(list);openBox();}}else{__showLastQueryIfEmpty();}}
    window.addEventListener('keydown',e=>{const isSlash=(e.key==='/'||e.code==='Slash'||e.keyCode===191);if(!isSlash)return;const ae=document.activeElement;if(ae&&ae!==input&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable))return;e.preventDefault();e.stopPropagation();input.focus();if((input.value||'').trim()==='')__showLastQueryIfEmpty();else __openWithCurrent();input.setSelectionRange(0,input.value.length);},true);
    input.addEventListener('mousedown',()=>{setTimeout(()=>{__openWithCurrent();},0);});

    /* ===== 마커 클릭 처리(프리징 방지 버전) ===== */
    function findDataByLatLng(lat,lng){if(!data||!data.length)return null;let best=null,bestD=Infinity;for(const o of data){const {lat:la,lng:ln}=getLatLngFromItem(o);if(!isFinite(la)||!isFinite(ln))continue;const d=(la-lat)*(la-lat)+(ln-lng)*(ln-lng);if(d<bestD){bestD=d;best=o;}}return best;}
    const patched=new WeakSet();
    function attachMarkerHandlersOnce(){const container=parent.closest('#container')||document.getElementById('container')||document.body;const list=(typeof getMarkers==='function'?getMarkers():window.markers)||[];if(!Array.isArray(list))return;list.forEach(mk=>{if(!mk||patched.has(mk))return;if(typeof mk.getPosition!=='function'){patched.add(mk);return;}
      kakao.maps.event.addListener(mk,'click',()=>{if(container&&container.classList.contains('view_roadview'))return;try{const pos=mk.getPosition();const lat=pos.getLat?pos.getLat():pos.La||pos.y;const lng=pos.getLng?pos.getLng():pos.Ma||pos.x;let o=findDataByLatLng(Number(lat),Number(lng));let text='';if(o)text=extractKoreanTail(o.name,(o.name1||o.name2||o.name||o.searchName));else if(typeof mk.getTitle==='function')text=extractKoreanTail(mk.getTitle(),mk.getTitle());if(text){input.value=text;__lastPickedQuery=text;closeBox();}}catch(_){}});
      patched.add(mk);});}
    attachMarkerHandlersOnce();
    document.addEventListener('markers:updated',attachMarkerHandlersOnce);
  };
})();
