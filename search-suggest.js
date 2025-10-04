/* ===== search-suggest.js (통합 개선버전, 2025-10-04-RV)
   - 입력창과 제안창 간격 자동조정(top:calc(100% + 4px))
   - 프리징(setInterval) 제거
   - 로드뷰 모드(view_roadview) 시 입력창 자동 숨김
===== */
(function () {
  function normalizeText(s){return(s||'').toString().trim();}
  function toLowerNoSpace(s){return normalizeText(s).replace(/\s+/g,'').toLowerCase();}
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function extractKoreanTail(name,fallback){const src=normalizeText(name);const m=src.match(/-[A-Za-z0-9가-힣]+-\s*([가-힣\s]+)/);if(m&&m[1]){const picked=m[1].trim();if(picked)return picked;}return normalizeText(fallback||src);}
  
  /* ---------- CSS ---------- */
  function injectCSS(){
    if(document.getElementById('gx-suggest-style'))return;
    const css=`
.gx-suggest-root{
  position:absolute; top:12px; left:50%; transform:translateX(-50%);
  width:min(520px,90vw); z-index:600;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans KR",Arial,"Apple SD Gothic Neo","Malgun Gothic","맑은 고딕",sans-serif;
}
.gx-suggest-root.is-hidden{display:none !important;}

.gx-suggest-search{
  position:relative;
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
.gx-suggest-search .gx-btn{display:none;}

/* 제안창 자동 붙음 */
.gx-suggest-box{
  position:absolute; top:calc(100% + 4px); left:0; width:100%;
  max-height:45vh; overflow:auto; -webkit-overflow-scrolling:touch;
  background:#fff; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.15);
  opacity:0; pointer-events:none; transform:translateY(-8px);
  transition:opacity .25s ease, transform .25s ease;
}
.gx-suggest-box.open{opacity:1;pointer-events:auto;transform:translateY(0);}

.gx-suggest-item{
  padding:12px 16px; cursor:pointer; display:flex; flex-direction:column; gap:4px;
  border-bottom:1px solid #f0f0f0; transition:background .2s ease;
}
.gx-suggest-item:last-child{border-bottom:none;}
.gx-suggest-item:hover,.gx-suggest-item.active{background:#d9e9ff;}

.gx-suggest-title{font-weight:600;font-size:15px;color:#222;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gx-suggest-sub{font-size:13px;color:#666;display:flex;flex-wrap:wrap;gap:6px;}
.gx-suggest-sub span{white-space:nowrap;}
`;
    const tag=document.createElement('style');tag.id='gx-suggest-style';tag.textContent=css;document.head.appendChild(tag);
  }

  /* ---------- DOM ---------- */
  function createDOM(parent){
    let root=parent.querySelector('.gx-suggest-root');
    if(root)return{root,input:root.querySelector('.gx-input'),box:root.querySelector('.gx-suggest-box')};
    root=document.createElement('div');root.className='gx-suggest-root';
    const search=document.createElement('div');search.className='gx-suggest-search';
    const input=document.createElement('input');input.className='gx-input';input.type='search';input.placeholder='예) 시설명, 주소…';input.autocomplete='off';
    const btn=document.createElement('button');btn.type='button';btn.className='gx-btn';btn.textContent='검색';
    search.appendChild(input);search.appendChild(btn);
    const box=document.createElement('div');box.className='gx-suggest-box';box.setAttribute('role','listbox');
    root.appendChild(search);root.appendChild(box);parent.appendChild(root);
    document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
    return{root,input,box};
  }

  /* ---------- 메인 ---------- */
  window.initSuggestUI=function(opts){
    const{map,data=[],parent=document,getMarkers=null,badges=[],maxItems=30,openOnFocus=true,hideOnRoadview=true}=opts||{};
    if(!parent||!map)return;
    injectCSS();
    const{root,input,box}=createDOM(parent);
    let activeIdx=-1,current=[],__lastTyped='',__lastPicked='';
    const items=()=>Array.from(box.querySelectorAll('.gx-suggest-item'));
    const openBox=()=>{if(!box.classList.contains('open')){box.classList.add('open');}};
    const closeBox=()=>{if(box.classList.contains('open'))box.classList.remove('open');setActive(-1);};
    const setActive=i=>{const list=items();list.forEach(el=>{el.classList.remove('active');});activeIdx=i;if(i>=0&&i<list.length)list[i].classList.add('active');};

    const badgeLine=o=>!badges.length?'':`<div class="gx-suggest-sub">${badges.map(k=>o[k]?`<span>${escapeHTML(o[k])}</span>`:'').join('')}</div>`;
    const titleOf=o=>normalizeText(o.name2||o.name||o.name1||o.searchName||'');
    const inputTitleOf=o=>extractKoreanTail(o.name,o.name1||o.name2||o.name||o.searchName||'');
    const makeItemHTML=o=>`<div class="gx-suggest-item"><div class="gx-suggest-title">${escapeHTML(titleOf(o))}</div>${badgeLine(o)}</div>`;
    const render=list=>{box.innerHTML=list.map(makeItemHTML).join('');box.querySelectorAll('.gx-suggest-item').forEach((el,idx)=>{el.addEventListener('mouseenter',()=>setActive(idx));el.addEventListener('click',()=>pick(idx));});};
    const filterData=q=>{const n=toLowerNoSpace(q);if(!n)return[];const out=[];for(const o of data){const h=toLowerNoSpace([o.name,o.name1,o.name2,o.addr,o.line].filter(Boolean).join(' '));if(h.includes(n))out.push(o);if(out.length>=maxItems)break;}return out;};
    const getLatLngFromItem=o=>({lat:Number(o.lat||o.latlng?.getLat?.()),lng:Number(o.lng||o.latlng?.getLng?.())});
    const centerWithEffect=(lat,lng)=>{const pt=new kakao.maps.LatLng(lat,lng);try{map.panTo(pt);}catch(_){}}; 
    const pick=idx=>{if(idx<0||idx>=current.length)return;const o=current[idx];input.value=inputTitleOf(o);const {lat,lng}=getLatLngFromItem(o);if(isFinite(lat)&&isFinite(lng))centerWithEffect(lat,lng);__lastPicked=input.value;closeBox();input.blur();};

    input.addEventListener('input',()=>{const q=input.value.trim();if(q)__lastTyped=q;if(!q){closeBox();box.innerHTML='';return;}const list=filterData(q);current=list;if(!list.length){closeBox();return;}render(list);openBox();});
    input.addEventListener('focus',()=>{if(!openOnFocus)return;const q=input.value.trim();if(!q)return;const list=filterData(q);current=list;if(list.length){render(list);openBox();}});
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){if(current.length){pick(activeIdx>=0?activeIdx:0);}}else if(e.key==='Escape')closeBox();});
    document.addEventListener('mousedown',e=>{if(!box.classList.contains('open'))return;if(e.target===input||box.contains(e.target))return;closeBox();});
    if(map){kakao.maps.event.addListener(map,'click',()=>closeBox());}

    /* ===== "/" 핫키 ===== */
    window.addEventListener('keydown',e=>{if(e.key!=='/'&&e.code!=='Slash')return;const ae=document.activeElement;if(ae&&ae!==input&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable))return;e.preventDefault();input.focus();const q=input.value.trim()||__lastPicked||__lastTyped;if(q){const list=filterData(q);current=list;if(list.length){render(list);openBox();}}input.setSelectionRange(0,input.value.length);},true);
    input.addEventListener('mousedown',()=>{setTimeout(()=>{const q=input.value.trim();if(q){const list=filterData(q);current=list;if(list.length){render(list);openBox();}}},0);});

    /* ===== 마커 클릭 처리 ===== */
    const patched=new WeakSet();
    function attachMarkers(){
      const list=(typeof getMarkers==='function'?getMarkers():window.markers)||[];
      if(!Array.isArray(list))return;
      const container=parent.closest('#container')||document.getElementById('container')||document.body;
      list.forEach(mk=>{
        if(!mk||patched.has(mk))return;
        if(typeof mk.getPosition!=='function'){patched.add(mk);return;}
        kakao.maps.event.addListener(mk,'click',()=>{
          if(container&&container.classList.contains('view_roadview'))return;
          const pos=mk.getPosition();const lat=pos.getLat?pos.getLat():pos.La;const lng=pos.getLng?pos.getLng():pos.Ma;
          let text='';const find=data.find(o=>Math.abs(o.lat-lat)<0.0001&&Math.abs(o.lng-lng)<0.0001);
          if(find)text=extractKoreanTail(find.name,find.name1||find.name2||find.name);
          else if(typeof mk.getTitle==='function')text=extractKoreanTail(mk.getTitle(),mk.getTitle());
          if(text){input.value=text;__lastPicked=text;closeBox();}
        });
        patched.add(mk);
      });
    }
    attachMarkers();
    document.addEventListener('markers:updated',attachMarkers);

    /* ===== 로드뷰 모드 시 숨김 ===== */
    if(hideOnRoadview){
      const container=parent.closest('#container')||document.getElementById('container')||document.body;
      const update=()=>{const on=container.classList.contains('view_roadview');root.classList.toggle('is-hidden',on);if(on)closeBox();};
      update();
      const mo=new MutationObserver(update);
      mo.observe(container,{attributes:true,attributeFilter:['class']});
    }
  };
})();
