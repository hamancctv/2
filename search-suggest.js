// search-suggest.js (FINAL, no "결과 없음")
(function () {
    console.log("[search-suggest] loaded FINAL");

    const style = document.createElement("style");
    style.textContent = `
      .gx-suggest-box.open .gx-item.active,
      .gx-suggest-box.open .gx-item:hover {
        background:#eef3ff;
      }
    `;
    document.head.appendChild(style);

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
