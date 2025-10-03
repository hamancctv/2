// search-suggest.js (FINAL with full CSS inlined)
(function () {
    console.log("[search-suggest] loaded FINAL");

    // ✅ 검색창 & 제안창 CSS 동적 삽입
    const style = document.createElement("style");
    style.textContent = `
      /* 검색창 컨테이너 */
      .gx-suggest-search {
        position:absolute;
        top:8px;
        left:50%;
        transform:translateX(-50%);
        display:flex;
        gap:8px;
        align-items:center;
        width:min(520px,90vw);
        z-index:600;
      }
      .gx-suggest-search input {
        flex:1;
        height:40px;
        padding:0 12px;
        border:1px solid #ccc;
        border-radius:10px;
        background:#fff;
        font-size:14px;
        outline:none;
      }
      .gx-suggest-search button {
        display:none;
      }

      /* 제안박스 */
      .gx-suggest-box {
        position:absolute;
        top:48px;
        left:50%;
        transform:translateX(-50%) translateY(-6px);
        width:min(520px,90vw);
        max-height:40vh;
        overflow-y:auto;
        border:1px solid #ccc;
        border-radius:10px;
        background:rgba(255,255,255,0.96);
        box-shadow:0 8px 20px rgba(0,0,0,.15);
        z-index:610;
        opacity:0;
        pointer-events:none;
        transition:opacity .18s ease, transform .18s ease;
        display:block;
      }
      .gx-suggest-box.open {
        opacity:1;
        transform:translateX(-50%) translateY(0);
        pointer-events:auto;
      }

      /* 아이템 */
      .gx-item {
        padding:10px 12px;
        cursor:pointer;
        display:flex;
        align-items:center;
        gap:8px;
      }
      .gx-item:hover,
      .gx-item.active {
        background:#eef3ff;
      }

      /* 제목/뱃지 */
      .gx-suggest-title {
        display:inline-block;
        max-width:60%;
        overflow:hidden;
        white-space:nowrap;
        text-overflow:ellipsis;
        font-weight:600;
      }
      .gx-badge {
        font-size:12px;
        color:#555;
        background:#f2f4f8;
        padding:2px 6px;
        border-radius:6px;
      }
    `;
    document.head.appendChild(style);

    // ✅ 제안창 UI 초기화
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

        let wrap = parent.querySelector('.gx-suggest-search');
        let box = parent.querySelector('.gx-suggest-box');
        const kw = wrap.querySelector('.gx-input');

        let RAW = data.map((it, idx)=>({
            id: it.id||`s_${idx}`, name: it.name||it.name1||"",
            line: it.line||"", encloser: it.encloser||"", addr: it.addr||"",
            lat:Number(it.lat), lng:Number(it.lng), ip:it.ip||""
        }));
        RAW.forEach(it=>{ it.key=(it.name+it.line+it.encloser+it.addr+it.ip); });

        let suggestions=[], active=-1, updateTimer=null, lastNonEmpty=[], closeTimer=null;

        function match(q){ if(!q) return []; return RAW.filter(it=>it.key.includes(q)).slice(0,maxItems); }

        function render(items){
            suggestions = items||[];
            if(!items||items.length===0) return; // 유지
            box.innerHTML = items.map((it,idx)=>
              `<div class="gx-item" data-index="${idx}">
                 <div class="name">${it.name}</div>
               </div>`).join('');
            box.classList.add('open');
            active=-1;
            lastNonEmpty = items;
        }

        function closeBox(){
            box.classList.remove('open');
            box.innerHTML='';
            suggestions=[]; active=-1;
        }

        function scheduleUpdate(){
            clearTimeout(updateTimer);
            updateTimer=setTimeout(()=>{
                const q=kw.value.trim();
                const res=match(q);
                if(res.length>0){
                    clearTimeout(closeTimer);
                    render(res);
                } else {
                    if(lastNonEmpty.length>0){
                        clearTimeout(closeTimer);
                        closeTimer=setTimeout(()=>{ closeBox(); lastNonEmpty=[]; },5000);
                    } else {
                        closeBox();
                    }
                }
            },100);
        }

        kw.addEventListener('input',scheduleUpdate);
        kw.addEventListener('focus',()=>{ if(openOnFocus&&lastNonEmpty.length>0) box.classList.add('open'); });
        kw.addEventListener('blur',()=>{ setTimeout(closeBox,150); });

        box.addEventListener('click',e=>{
            const el=e.target.closest('.gx-item'); if(!el) return;
            const idx=parseInt(el.dataset.index,10);
            if(suggestions[idx]){ /* marker 선택 로직 (생략: 기존 유지) */ }
            closeBox();
        });
    }

    window.initSuggestUI=initSuggestUI;
})();
