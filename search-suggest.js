/* ===== search-suggest.js (FULL-STABLE-LAST-HYPHEN-NOFREEZE-KUP, 2025-10-05)
   - Safari 대응 / 핀치줌 차단
   - 제안창 자동 생성 + 입력창과 2px 간격
   - Enter 포커싱(비포커스) → keydown, 선택 확정은 keyup에서 1회만
   - 마지막 하이픈(-) 이후 텍스트만 표시 ("도-002-마산고등학교" → "마산고등학교")
   - 마커 클릭 시 입력창만 갱신(로드뷰 시 무시)
   - 로드뷰 모드 시 자동 숨김
   - 프리징 최소화: Circle 재사용, pick 스로틀, 동일좌표/오토리핏/IME 가드, blur 제거
===== */
(function () {
  /* ---------- 유틸 ---------- */
  function normalizeText(s){return (s||'').toString().trim();}
  function toLowerNoSpace(s){return normalizeText(s).replace(/\s+/g,'').toLowerCase();}
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  // ✅ 마지막 하이픈 이후 문자열만 사용
  function extractKoreanTail(name, fallback) {
    const src = normalizeText(name);
    let result = normalizeText(fallback || src);
    if (src.includes('-')) result = src.substring(src.lastIndexOf('-') + 1).trim();
    return result;
  }

  /* ---------- 스타일 주입 ---------- */
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

  /* ---------- DOM ---------- */
  function createDOM(parent){
    let root=parent.querySelector('.gx-suggest-root');
    if(root)return{root,input:root.querySelector('.gx-input'),box:root.querySelector('.gx-suggest-box')};
    root=document.createElement('div');root.className='gx-suggest-root';
    const search=document.createElement('div');search.className='gx-suggest-search';
    const input=document.createElement('input');input.className='gx-input';input.type='search';input.placeholder='예) 시설명, 주소…';input.autocomplete='off';
    const box=document.createElement('div');box.className='gx-suggest-box';box.setAttribute('role','listbox');
    search.appendChild(input);root.appendChild(search);root.appendChild(box);parent.appendChild(root);
    // iOS Safari 핀치 제스처 방지
    document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
    return{root,input,box};
  }

  /* ---------- 메인 ---------- */
  window.initSuggestUI=function(opts){
    const {map,data=[],parent=document,getMarkers=null,badges=[],maxItems=30,hideOnRoadview=true}=opts||{};
    if(!map)return;
    injectCSS();
    const {root,input,box}=createDOM(parent);

    // 상태
    let activeIdx=-1,current=[],__lastTypedQuery='',__lastPickedQuery='';
    // 프리징 방지 상태
    let pickBlockUntil=0;            // pick 연타 방지 (ms 기준)
    let pulseCircle=null;            // Circle 재사용 인스턴스
    let pulseHideTimer=null;         // Circle 숨김 타이머
    let lastPan={t:0,lat:null,lng:null}; // 동일 좌표/빈도 가드

    const items=()=>Array.from(box.querySelectorAll('.gx-suggest-item'));
    const openBox=()=>{if(!box.classList.contains('open'))box.classList.add('open');};
    const closeBox=()=>{if(box.classList.contains('open'))box.classList.remove('open');setActive(-1);};
    function setActive(i){
      const list=items();
      list.forEach(el=>{el.classList.remove('active');el.setAttribute('aria-selected','false');});
      activeIdx=i;
      if(i>=0&&i<list.length){
        const el=list[i];
        el.classList.add('active');el.setAttribute('aria-selected','true');
        try{el.scrollIntoView({block:'nearest'});}catch{}
      }
    }

    function badgeLine(o){
      if(!badges.length)return'';
      const spans=[];
      for(const k of badges){ if(o[k]) spans.push(`<span>${escapeHTML(String(o[k]).replace(/^ip\s*:\s*/i,''))}</span>`); }
      return spans.length?`<div class="gx-suggest-sub">${spans.join(' ')}</div>`:'';
    }
    function makeItemHTML(o){
      const title=normalizeText(o.name2||o.name||o.name1||o.searchName||'');
      return `<div class="gx-suggest-item" role="option" aria-selected="false">
        <div class="gx-suggest-title">${escapeHTML(title)}</div>${badgeLine(o)}
      </div>`;
    }
    function render(list){
      box.innerHTML=list.map(makeItemHTML).join('');
      box.querySelectorAll('.gx-suggest-item').forEach((el,i)=>{
        el.addEventListener('mouseenter',()=>setActive(i));
        el.addEventListener('mouseleave',()=>setActive(-1));
        el.addEventListener('mousedown',e=>e.preventDefault()); // blur 전에 클릭 처리
        el.addEventListener('click',()=>pick(i));
      });
      setActive(-1);
    }

    function filterData(q){
      const n=toLowerNoSpace(q); if(!n) return [];
      const out=[];
      for(const o of data){
        const hay=toLowerNoSpace([o.name,o.name1,o.name2,o.searchName,o.addr,o.line,o.encloser].filter(Boolean).join(' '));
        if(hay.includes(n)) out.push(o);
        if(out.length>=maxItems) break;
      }
      return out;
    }
    const getLatLng=o=>({lat:Number(o.lat||o.latlng?.getLat?.()),lng:Number(o.lng||o.latlng?.getLng?.())});

    // ✅ 써클 재사용 + 동일좌표/빈도 가드
    function centerWithEffect(lat,lng){
      const now=Date.now();
      const same = lastPan.lat!==null && Math.abs(lastPan.lat-lat)<1e-7 && Math.abs(lastPan.lng-lng)<1e-7;
      if(same && now-lastPan.t<300) return; // 300ms 내 동일 좌표 스킵

      const pt=new kakao.maps.LatLng(lat,lng);
      try{ map.panTo(pt); }catch{}
      lastPan={t:now,lat,lng};

      try{
        if(!pulseCircle){
          pulseCircle=new kakao.maps.Circle({
            center:pt,radius:50,strokeWeight:1,strokeColor:'#ffa500',strokeOpacity:1,
            strokeStyle:'dashed',fillColor:'#FF1000',fillOpacity:.3,zIndex:9999
          });
        }else{
          pulseCircle.setCenter(pt);
        }
        pulseCircle.setMap(map);
        if(pulseHideTimer) clearTimeout(pulseHideTimer);
        pulseHideTimer=setTimeout(()=>{ try{pulseCircle.setMap(null);}catch{} },600);
      }catch{}
    }

    function __rememberPicked(){ const q=(input.value||'').trim(); if(q) __lastPickedQuery=q; }

    function pick(i){
      if(i<0||i>=current.length) return;

      // ✅ 연타/오토리핏 스로틀 (0.45s)
      const now=Date.now();
      if(now<pickBlockUntil) return;
      pickBlockUntil = now + 450;

      const o=current[i];
      const t=extractKoreanTail(o.name1||o.name||o.searchName);
      if(t) input.value=t;

      const {lat,lng}=getLatLng(o);
      if(isFinite(lat)&&isFinite(lng)) centerWithEffect(lat,lng);

      __rememberPicked();
      closeBox(); // 🔸 포커스는 유지 (blur 호출 안 함)
    }

    // 입력 이벤트
    input.addEventListener('input',()=>{
      const q=(input.value||'').trim();
      if(q) __lastTypedQuery=q;
      if(!q){ closeBox(); box.innerHTML=''; return; }
      const list=filterData(q); current=list;
      if(!list.length){ closeBox(); box.innerHTML=''; return; }
      render(list); openBox();
    });

    // 포커스 시 현재 값 기준으로 열기
    input.addEventListener('focus',()=>{
      const q=(input.value||'').trim(); if(!q) return;
      const list=filterData(q); current=list;
      if(list.length){ render(list); openBox(); }
    });

    // 키보드 내비: keydown에서는 ↑/↓/Esc만, IME 조합 중이면 무시
    input.addEventListener('keydown',(e)=>{
      if(e.isComposing || e.keyCode===229) return; // IME 조합 입력 가드

      const listEls=items();
      const isOpen=box.classList.contains('open') && listEls.length>0;

      if(!isOpen && (e.key==='ArrowDown'||e.key==='ArrowUp')){
        const q=(input.value||'').trim();
        if(q){ const l=filterData(q); current=l; if(l.length){ render(l); openBox(); } }
      }

      if(e.key==='ArrowDown' && isOpen){
        e.preventDefault(); setActive((activeIdx+1)%listEls.length);
      }else if(e.key==='ArrowUp' && isOpen){
        e.preventDefault(); setActive((activeIdx-1+listEls.length)%listEls.length);
      }else if(e.key==='Escape'){
        closeBox();
      }
      // ❌ Enter 확정은 keyup에서 단 1회 처리
    });

    // ✅ Enter 확정은 keyup에서 1회만 (IME 가드)
    input.addEventListener('keyup',(e)=>{
      if(e.isComposing || e.keyCode===229) return;
      if(e.key!=='Enter') return;

      const listEls=items();
      const isOpen=box.classList.contains('open') && listEls.length>0;
      if(!isOpen) return;

      pick(activeIdx>=0 && activeIdx<current.length ? activeIdx : 0);
    });

    // 입력창 클릭: 전체선택 없이 제안만 열기 (비어있으면 최근 질의 복원)
    input.addEventListener('mousedown',()=>{
      setTimeout(()=>{
        let q=(input.value||'').trim();
        if(!q) q=__lastPickedQuery||__lastTypedQuery||'';
        if(!q) return;
        const list=filterData(q); current=list;
        if(list.length){ render(list); openBox(); }
      },0);
    });

    // 바깥 클릭 닫기
    document.addEventListener('mousedown',(e)=>{
      if(!box.classList.contains('open')) return;
      if(e.target===input || box.contains(e.target)) return;
      closeBox();
    });

    window.addEventListener('resize', closeBox);

    // 지도 이벤트: blur는 안 걸고, 박스만 닫아 프리징 방지
    kakao.maps.event.addListener(map,'click',()=>closeBox());
    kakao.maps.event.addListener(map,'dragstart',()=>closeBox());

    // Safari: touchend에서만 필요 시 blur
    const mapEl=document.getElementById('map');
    if(mapEl){
      mapEl.addEventListener('touchend',()=>{
        if(document.activeElement===input) input.blur();
      },{passive:true});
    }

    // ✅ 전역 Enter: 비포커스면 입력창 활성화 + 제안 열기 (autorepeat/IME 가드)
    window.addEventListener('keydown',(e)=>{
      if(e.key!=='Enter') return;
      if(e.repeat || e.isComposing || e.keyCode===229) return; // autorepeat & IME 가드

      const ae=document.activeElement;
      const isOurInput=(ae===input);
      const typingElsewhere = !isOurInput && (ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable));
      if(typingElsewhere) return; // 다른 입력필드면 패스

      if(!isOurInput){
        e.preventDefault();
        try{input.focus();}catch{}
        setTimeout(()=>{
          let seed=(input.value||'').trim();
          if(!seed) seed=__lastPickedQuery||__lastTypedQuery||'';
          if(seed){
            input.value=seed;
            const list=filterData(seed); current=list;
            if(list.length){ render(list); openBox(); }
          }
        },0);
      }
      // 포커스 상태 Enter는 keyup에서 확정
    },true);

    /* ===== 마커 클릭 → 입력창만 갱신 (로드뷰 모드면 무시) ===== */
    const patched=new WeakSet();
    function attachMarkerHandlersOnce(){
      const container=parent.closest('#container')||document.getElementById('container')||document.body;
      const list=(typeof getMarkers==='function'?getMarkers(): (Array.isArray(window.markers)?window.markers:[]) )||[];
      if(!Array.isArray(list)) return;

      list.forEach(mk=>{
        if(!mk||patched.has(mk)) return;
        if(typeof mk.getPosition!=='function'){ patched.add(mk); return; }

        kakao.maps.event.addListener(mk,'click',()=>{
          if(container && container.classList.contains('view_roadview')) return;
          try{
            const pos=mk.getPosition();
            const lat=pos.getLat?pos.getLat():pos.La;
            const lng=pos.getLng?pos.getLng():pos.Ma;

            let text='';
            const found = Array.isArray(data) ? data.find(o=>{
              const la=Number(o.lat), ln=Number(o.lng);
              return isFinite(la)&&isFinite(ln)&&Math.abs(la-lat)<0.0001&&Math.abs(ln-lng)<0.0001;
            }) : null;

            if(found) text=extractKoreanTail(found.name1||found.name||found.searchName);
            else if(typeof mk.getTitle==='function') text=extractKoreanTail(mk.getTitle(),mk.getTitle());

            if(text){
              input.value=text;
              __lastPickedQuery=text;
              closeBox(); // 제안창은 닫되 포커스는 유지
            }
          }catch{}
        });

        patched.add(mk);
      });
    }
    attachMarkerHandlersOnce();
    document.addEventListener('markers:updated', attachMarkerHandlersOnce);

    // 로드뷰 모드 감시: 입력창 자동 숨김
    if(hideOnRoadview){
      const container=parent.closest('#container')||document.getElementById('container')||document.body;
      const update=()=>{
        const on=container.classList.contains('view_roadview');
        if(on){ root.classList.add('is-hidden'); closeBox(); }
        else  { root.classList.remove('is-hidden'); }
      };
      update();
      const mo=new MutationObserver(update);
      mo.observe(container,{attributes:true,attributeFilter:['class']});
    }
  };
})();
