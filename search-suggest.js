/* ===== search-suggest.js (프리징 개선 통합 안정판)
   - 입력창↔제안창 밀착(top:calc(100% + 4px))
   - blur 최소화 (drag/touchmove 시 제거)
   - Safari 대응 개선
   - panTo 중복 호출 방어
   - 로드뷰 모드 자동 숨김
===== */
(function(){
  /* ---------- 유틸 ---------- */
  function normalizeText(s){return(s||'').toString().trim();}
  function toLowerNoSpace(s){return normalizeText(s).replace(/\s+/g,'').toLowerCase();}
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function extractKoreanTail(name,fallback){
    const src=normalizeText(name);
    const m=src.match(/-[A-Za-z0-9가-힣]+-\s*([가-힣\s]+)/);
    if(m&&m[1]){const picked=m[1].trim();if(picked)return picked;}
    return normalizeText(fallback||src);
  }

  /* ---------- 스타일 ---------- */
  function injectCSS(){
    if(document.getElementById('gx-suggest-style'))return;
    const css=`
.gx-suggest-root{
  position:absolute;top:12px;left:50%;transform:translateX(-50%);
  width:min(520px,90vw);z-index:600;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans KR",Arial,"Apple SD Gothic Neo","Malgun Gothic","맑은 고딕",sans-serif;
}
.gx-suggest-search{position:relative;display:flex;align-items:center;gap:8px;}
.gx-suggest-search .gx-input{
  flex:1;height:42px;padding:0 14px;border:1px solid #ccc;border-radius:12px;
  background:#fff;font-size:15px;outline:none;box-sizing:border-box;
  transition:border .2s, box-shadow .2s;
}
.gx-suggest-search .gx-input:focus{
  border-color:#4a90e2;box-shadow:0 0 0 2px rgba(74,144,226,.2);
}
.gx-suggest-search .gx-btn{display:none;}
.gx-suggest-box{
  position:absolute;top:calc(100% + 4px);left:0;width:100%;
  max-height:45vh;overflow:auto;-webkit-overflow-scrolling:touch;
  background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.15);
  opacity:0;pointer-events:none;transform:translateY(-8px);
  transition:opacity .25s, transform .25s;
}
.gx-suggest-box.open{opacity:1;pointer-events:auto;transform:translateY(0);}
.gx-suggest-item{padding:12px 16px;cursor:pointer;display:flex;flex-direction:column;gap:4px;
  border-bottom:1px solid #f0f0f0;transition:background .2s;}
.gx-suggest-item:hover,.gx-suggest-item.active{background:#d9e9ff;}
.gx-suggest-title{font-weight:600;font-size:15px;color:#222;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gx-suggest-sub{font-size:13px;color:#666;display:flex;flex-wrap:wrap;gap:6px;}
.gx-suggest-root.is-hidden{display:none!important;}
    `.trim();
    const tag=document.createElement('style');
    tag.id='gx-suggest-style';tag.textContent=css;document.head.appendChild(tag);
  }

  /* ---------- DOM ---------- */
  function createDOM(parent){
    let root=parent.querySelector('.gx-suggest-root');
    if(root)return{root,input:root.querySelector('.gx-input'),box:root.querySelector('.gx-suggest-box')};
    root=document.createElement('div');root.className='gx-suggest-root';
    const search=document.createElement('div');search.className='gx-suggest-search';
    const input=document.createElement('input');input.className='gx-input';input.type='search';input.placeholder='예) 시설명, 주소…';input.autocomplete='off';
    search.appendChild(input);
    const box=document.createElement('div');box.className='gx-suggest-box';box.setAttribute('role','listbox');
    root.appendChild(search);root.appendChild(box);parent.appendChild(root);
    document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
    return{root,input,box};
  }

  /* ---------- 메인 ---------- */
  window.initSuggestUI=function(opts){
    const{map,data=[],parent=document,getMarkers=null,badges=[],maxItems=30,hideOnRoadview=true}=opts||{};
    if(!map)return;
    injectCSS();
    const{root,input,box}=createDOM(parent);

    let activeIdx=-1,current=[],__lastTyped='',__lastPicked='',isPanning=false;
    const openBox=()=>{if(!box.classList.contains('open'))box.classList.add('open');};
    const closeBox=()=>{box.classList.remove('open');activeIdx=-1;};
    const filterData=q=>{
      const n=toLowerNoSpace(q);if(!n)return[];
      const out=[];
      for(const o of data){
        const h=toLowerNoSpace([o.name,o.name1,o.name2,o.addr,o.line,o.encloser].filter(Boolean).join(' '));
        if(h.includes(n))out.push(o);
        if(out.length>=maxItems)break;
      }
      return out;
    };
    const getLatLng=o=>({lat:Number(o.lat||o.latlng?.getLat?.()),lng:Number(o.lng||o.latlng?.getLng?.())});
    const centerWithEffect=(lat,lng)=>{
      if(isPanning)return;
      isPanning=true;
      const pt=new kakao.maps.LatLng(lat,lng);
      try{map.panTo(pt);}catch(_){}
      try{
        const c=new kakao.maps.Circle({
          center:pt,radius:50,strokeWeight:1,strokeColor:'#ffa500',
          strokeOpacity:1,strokeStyle:'dashed',fillColor:'#FF1000',fillOpacity:0.3,zIndex:9999
        });
        c.setMap(map);setTimeout(()=>c.setMap(null),1000);
      }catch(_){}
      setTimeout(()=>isPanning=false,400);
    };

    const render=list=>{
      box.innerHTML=list.map(o=>{
        const title=normalizeText(o.name2||o.name||o.name1||o.searchName||'');
        const subs=(badges.map(k=>o[k]?`<span>${escapeHTML(o[k])}</span>`:'').join(''));
        return `<div class="gx-suggest-item"><div class="gx-suggest-title">${escapeHTML(title)}</div>${subs?`<div class="gx-suggest-sub">${subs}</div>`:''}</div>`;
      }).join('');
      box.querySelectorAll('.gx-suggest-item').forEach((el,idx)=>{
        el.addEventListener('click',()=>pick(idx));
        el.addEventListener('mouseenter',()=>activeIdx=idx);
      });
    };

    const pick=i=>{
      if(i<0||i>=current.length)return;
      const o=current[i];
      const name=extractKoreanTail(o.name,o.name1||o.name2||o.searchName);
      input.value=name;
      const {lat,lng}=getLatLng(o);
      if(isFinite(lat)&&isFinite(lng))centerWithEffect(lat,lng);
      __lastPicked=name;
      closeBox();input.blur();
    };

    input.addEventListener('input',()=>{
      const q=input.value.trim();if(q)__lastTyped=q;
      if(!q){closeBox();box.innerHTML='';return;}
      const list=filterData(q);current=list;
      if(!list.length){closeBox();return;}
      render(list);openBox();
    });

    /* --- 지도 이벤트: blur 최소화 --- */
    kakao.maps.event.addListener(map,'click',()=>closeBox());
    kakao.maps.event.addListener(map,'dragstart',()=>closeBox());
    // drag 중 blur 제거

    /* --- Safari touch 대응 개선 --- */
    const mapEl=document.getElementById('map');
    if(mapEl){
      mapEl.addEventListener('touchend',()=>{
        if(document.activeElement===input)input.blur();
      },{passive:true});
    }

    /* --- "/" 핫키 --- */
    window.addEventListener('keydown',e=>{
      if(e.key!=='/'&&e.code!=='Slash')return;
      const ae=document.activeElement;
      if(ae&&ae!==input&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable))return;
      e.preventDefault();e.stopPropagation();input.focus();
      const q=input.value.trim()||__lastPicked||__lastTyped;
      if(q){const list=filterData(q);current=list;if(list.length){render(list);openBox();}}
      input.setSelectionRange(0,input.value.length);
    },true);

    /* --- 마커 클릭 --- */
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
          const pos=mk.getPosition();
          const lat=pos.getLat?pos.getLat():pos.La;
          const lng=pos.getLng?pos.getLng():pos.Ma;
          let t='';
          const find=data.find(o=>Math.abs(o.lat-lat)<0.0001&&Math.abs(o.lng-lng)<0.0001);
          if(find)t=extractKoreanTail(find.name,find.name1||find.name2||find.searchName);
          else if(typeof mk.getTitle==='function')t=extractKoreanTail(mk.getTitle(),mk.getTitle());
          if(t){input.value=t;__lastPicked=t;closeBox();}
        });
        patched.add(mk);
      });
    }
    attachMarkers();
    document.addEventListener('markers:updated',attachMarkers);

    /* --- 로드뷰 모드 감시 --- */
    if(hideOnRoadview){
      const container=parent.closest('#container')||document.getElementById('container')||document.body;
      const update=()=>{
        const on=container.classList.contains('view_roadview');
        root.classList.toggle('is-hidden',on);
        if(on)closeBox();
      };
      update();
      const mo=new MutationObserver(update);
      mo.observe(container,{attributes:true,attributeFilter:['class']});
    }
  };
})();
