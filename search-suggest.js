/* ===== search-suggest.js (FULL-STABLE-LAST-HYPHEN, 2025-10-05)
   - Safari 대응 / 핀치줌 차단
   - 제안창 자동 생성 + 입력창과 2px 간격
   - Enter키로 입력창 활성화 (비포커스) / 활성상태에서는 본래 엔터동작
   - ✅ 마지막 하이픈 이후 글자만 추출 ("도-002-마산고등학교" → "마산고등학교")
   - 마커 클릭 시 입력창만 갱신 (로드뷰 시 무시)
   - 로드뷰 모드 시 자동 숨김
   - 프리징 최소화
   - 키보드 내비(↑↓EnterEsc) 완전 복구
===== */
(function () {
  function normalizeText(s){return (s||'').toString().trim();}
  function toLowerNoSpace(s){return normalizeText(s).replace(/\s+/g,'').toLowerCase();}
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  // ✅ 마지막 하이픈 이후 글자만 추출
  function extractKoreanTail(name, fallback) {
    const src = normalizeText(name);
    let result = normalizeText(fallback || src);
    if (src.includes('-')) result = src.substring(src.lastIndexOf('-') + 1).trim();
    return result;
  }

  function injectCSS(){
    if(document.getElementById('gx-suggest-style'))return;
    const css=`
.gx-suggest-root{
  position:absolute; top:12px; left:50%; transform:translateX(-50%);
  width:min(520px,90vw); z-index:600;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans KR",Arial,"Apple SD Gothic Neo","Malgun Gothic","맑은 고딕",sans-serif;
}
.gx-suggest-search{position:relative;display:flex;align-items:center;gap:8px;}
.gx-suggest-search .gx-input{
  flex:1;height:42px;padding:0 14px;border:1px solid #ccc;border-radius:12px;
  background:#fff;font-size:15px;outline:none;transition:border .2s ease,box-shadow .2s ease;
}
.gx-suggest-search .gx-input:focus{border-color:#4a90e2;box-shadow:0 0 0 2px rgba(74,144,226,.2);}
.gx-suggest-box{
  position:absolute;top:calc(100% + 2px);left:0;width:100%;
  max-height:45vh;overflow:auto;-webkit-overflow-scrolling:touch;
  background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.15);
  opacity:0;pointer-events:none;transform:translateY(-8px);
  transition:opacity .25s ease,transform .25s ease;
}
.gx-suggest-box.open{opacity:1;pointer-events:auto;transform:translateY(0);}
.gx-suggest-item{padding:12px 16px;cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;gap:4px;border-bottom:1px solid #f0f0f0;transition:background .2s;}
.gx-suggest-item:hover,.gx-suggest-item.active{background:#d9e9ff;}
.gx-suggest-title{font-weight:600;font-size:15px;color:#222;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gx-suggest-sub{font-size:13px;color:#666;display:flex;flex-wrap:wrap;gap:6px;}
.gx-suggest-root.is-hidden{display:none!important;}
    `.trim();
    const st=document.createElement('style');st.id='gx-suggest-style';st.textContent=css;document.head.appendChild(st);
  }

  function createDOM(parent){
    let root=parent.querySelector('.gx-suggest-root');
    if(root)return{root,input:root.querySelector('.gx-input'),box:root.querySelector('.gx-suggest-box')};
    root=document.createElement('div');root.className='gx-suggest-root';
    const search=document.createElement('div');search.className='gx-suggest-search';
    const input=document.createElement('input');input.className='gx-input';input.type='search';input.placeholder='예) 시설명, 주소…';input.autocomplete='off';
    const box=document.createElement('div');box.className='gx-suggest-box';box.setAttribute('role','listbox');
    search.appendChild(input);root.appendChild(search);root.appendChild(box);parent.appendChild(root);
    document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
    return{root,input,box};
  }

  window.initSuggestUI=function(opts){
    const {map,data=[],parent=document,getMarkers=null,badges=[],maxItems=30,hideOnRoadview=true}=opts||{};
    if(!map)return;
    injectCSS();
    const {root,input,box}=createDOM(parent);

    let activeIdx=-1,current=[],__lastTypedQuery='',__lastPickedQuery='',isPanning=false;
    const items=()=>Array.from(box.querySelectorAll('.gx-suggest-item'));
    const openBox=()=>{if(!box.classList.contains('open'))box.classList.add('open');};
    const closeBox=()=>{if(box.classList.contains('open'))box.classList.remove('open');setActive(-1);};
    function setActive(i){const list=items();list.forEach(el=>el.classList.remove('active'));activeIdx=i;if(i>=0&&i<list.length){list[i].classList.add('active');list[i].scrollIntoView({block:'nearest'});}}

    function badgeLine(o){if(!badges.length)return'';const spans=[];for(const k of badges){if(o[k])spans.push(`<span>${escapeHTML(o[k])}</span>`);}return spans.length?`<div class="gx-suggest-sub">${spans.join(' ')}</div>`:'';}
    function makeItemHTML(o){return`<div class="gx-suggest-item"><div class="gx-suggest-title">${escapeHTML(o.name||o.name1||'')}</div>${badgeLine(o)}</div>`;}
    function render(list){box.innerHTML=list.map(makeItemHTML).join('');box.querySelectorAll('.gx-suggest-item').forEach((el,i)=>{el.addEventListener('mouseenter',()=>setActive(i));el.addEventListener('mouseleave',()=>setActive(-1));el.addEventListener('mousedown',e=>e.preventDefault());el.addEventListener('click',()=>pick(i));});setActive(-1);}
    function filterData(q){const n=toLowerNoSpace(q);if(!n)return[];const out=[];for(const o of data){const h=toLowerNoSpace([o.name,o.name1,o.addr,o.line].filter(Boolean).join(' '));if(h.includes(n))out.push(o);if(out.length>=maxItems)break;}return out;}
    const getLatLng=o=>({lat:Number(o.lat||o.latlng?.getLat?.()),lng:Number(o.lng||o.latlng?.getLng?.())});

    function centerWithEffect(lat,lng){if(isPanning)return;isPanning=true;const pt=new kakao.maps.LatLng(lat,lng);try{map.panTo(pt);}catch{}try{const c=new kakao.maps.Circle({center:pt,radius:50,strokeWeight:1,strokeColor:'#ffa500',strokeStyle:'dashed',fillColor:'#FF1000',fillOpacity:.3,zIndex:9999});c.setMap(map);setTimeout(()=>c.setMap(null),800);}catch{}setTimeout(()=>isPanning=false,400);}
    function pick(i){if(i<0||i>=current.length)return;const o=current[i];const t=extractKoreanTail(o.name1||o.name||o.searchName);if(t)input.value=t;const {lat,lng}=getLatLng(o);if(isFinite(lat)&&isFinite(lng))centerWithEffect(lat,lng);__lastPickedQuery=input.value.trim();closeBox();}

    input.addEventListener('input',()=>{const q=input.value.trim();if(q)__lastTypedQuery=q;if(!q){closeBox();box.innerHTML='';return;}const list=filterData(q);current=list;if(!list.length){closeBox();return;}render(list);openBox();});
    input.addEventListener('focus',()=>{const q=input.value.trim();if(!q)return;const list=filterData(q);current=list;if(list.length){render(list);openBox();}});
    input.addEventListener('keydown',e=>{const listEls=items(),isOpen=box.classList.contains('open')&&listEls.length;if(e.key==='ArrowDown'&&isOpen){e.preventDefault();setActive((activeIdx+1)%listEls.length);}else if(e.key==='ArrowUp'&&isOpen){e.preventDefault();setActive((activeIdx-1+listEls.length)%listEls.length);}else if(e.key==='Enter'&&isOpen){e.preventDefault();pick(activeIdx>=0?activeIdx:0);}else if(e.key==='Escape'){closeBox();}});
    input.addEventListener('mousedown',()=>{setTimeout(()=>{const q=input.value.trim()||__lastPickedQuery||__lastTypedQuery;if(!q)return;const list=filterData(q);current=list;if(list.length){render(list);openBox();}},0);});
    document.addEventListener('mousedown',e=>{if(!box.classList.contains('open'))return;if(e.target===input||box.contains(e.target))return;closeBox();});
    window.addEventListener('resize',closeBox);

    kakao.maps.event.addListener(map,'click',()=>closeBox());
    kakao.maps.event.addListener(map,'dragstart',()=>closeBox());

    window.addEventListener('keydown',e=>{
      if(e.key!=='Enter')return;
      const ae=document.activeElement,isInput=(ae===input),isOther=ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable);
      if(isOther&&!isInput)return;
      if(!isInput){
        e.preventDefault();try{input.focus();}catch{}setTimeout(()=>{const q=(input.value||'').trim()||__lastPickedQuery||__lastTypedQuery;if(q){input.value=q;const list=filterData(q);current=list;if(list.length){render(list);openBox();}}},0);
      }
    },true);

    const patched=new WeakSet();
    function attachMarkerHandlersOnce(){
      const container=parent.closest('#container')||document.body;
      const list=typeof getMarkers==='function'?getMarkers():Array.isArray(window.markers)?window.markers:[];
      list.forEach(mk=>{
        if(!mk||patched.has(mk))return;
        if(typeof mk.getPosition!=='function'){patched.add(mk);return;}
        kakao.maps.event.addListener(mk,'click',()=>{
          if(container.classList.contains('view_roadview'))return;
          try{
            const pos=mk.getPosition();const lat=pos.getLat?pos.getLat():pos.y;const lng=pos.getLng?pos.getLng():pos.x;
            let text='';const found=data.find(o=>Math.abs(o.lat-lat)<0.0001&&Math.abs(o.lng-lng)<0.0001);
            if(found)text=extractKoreanTail(found.name1||found.name||found.searchName);
            else if(typeof mk.getTitle==='function')text=extractKoreanTail(mk.getTitle(),mk.getTitle());
            if(text){input.value=text;__lastPickedQuery=text;closeBox();}
          }catch{}
        });
        patched.add(mk);
      });
    }
    attachMarkerHandlersOnce();
    document.addEventListener('markers:updated',attachMarkerHandlersOnce);

    if(hideOnRoadview){
      const container=parent.closest('#container')||document.body;
      const update=()=>{const on=container.classList.contains('view_roadview');if(on){root.classList.add('is-hidden');closeBox();}else root.classList.remove('is-hidden');};
      update();const mo=new MutationObserver(update);mo.observe(container,{attributes:true,attributeFilter:['class']});
    }
  };
})();
