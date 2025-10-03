(function () {
  console.log("[search-suggest] loaded FINAL");

  // 검색창 스타일 추가
  const style = document.createElement("style");
  style.textContent = `
    .gx-suggest-search{
      position:absolute;top:8px;left:50%;transform:translateX(-50%);
      display:flex;gap:8px;align-items:center;width:min(520px,90vw);z-index:600;
    }
    .gx-suggest-search input{
      flex:1;height:40px;padding:0 12px;border:1px solid #ccc;border-radius:10px;
      background:#fff;font-size:14px;outline:none;
    }
    .gx-suggest-box{
      position:absolute;top:48px;left:50%;transform:translateX(-50%) translateY(-6px);
      width:min(520px,90vw);max-height:40vh;overflow-y:auto;
      border:1px solid #ccc;border-radius:10px;background:rgba(255,255,255,0.96);
      box-shadow:0 8px 20px rgba(0,0,0,.15);z-index:610;
      opacity:0;pointer-events:none;transition:opacity .18s ease, transform .18s ease;
    }
    .gx-suggest-box.open{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto;}
    .gx-item{padding:10px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;}
    .gx-item:hover,.gx-item.active{background:#eef3ff;}
  `;
  document.head.appendChild(style);

  window.initSuggestUI = function(opts) {
    const {
      map,
      data = window.SEL_SUGGEST || [],
      parent = document.getElementById('mapWrapper') || document.body,
      getMarkers = () => window.markers || [],
      maxItems = 30
    } = opts || {};

    let wrap = parent.querySelector('.gx-suggest-search');
    let box = parent.querySelector('.gx-suggest-box');
    if (!wrap || !box) {
      console.warn("검색창 DOM 없음, search-suggest 중단");
      return;
    }

    const kw = wrap.querySelector('.gx-input');
    if (!kw) {
      console.warn("검색 input 없음");
      return;
    }

    // === 기존 로직 안전하게 유지 ===
    let RAW = data.map((it, idx)=>({
      id: it.id||`s_${idx}`,
      name: it.name||it.name1||"",
      line: it.line||"",
      encloser: it.encloser||"",
      addr: it.addr||"",
      lat:Number(it.lat), lng:Number(it.lng), ip:it.ip||""
    })).filter(it=>!isNaN(it.lat)&&!isNaN(it.lng));

    RAW.forEach(it=>{ it.key=(it.name+it.line+it.encloser+it.addr+it.ip); });

    let suggestions=[], active=-1;

    function match(q){ if(!q) return []; return RAW.filter(it=>it.key.includes(q)).slice(0,maxItems); }

    function render(items){
      suggestions = items||[];
      if(!items||items.length===0){ box.innerHTML=""; box.classList.remove("open"); return; }
      box.innerHTML = items.map((it,idx)=>
        `<div class="gx-item" data-index="${idx}">
           <div class="name">${it.name}</div>
         </div>`).join('');
      box.classList.add('open');
      active=-1;
    }

    kw.addEventListener("input",()=>{
      const q=kw.value.trim();
      render(match(q));
    });

    box.addEventListener("click",e=>{
      const el=e.target.closest(".gx-item");
      if(!el) return;
      const idx=parseInt(el.dataset.index,10);
      if(suggestions[idx]) {
        console.log("선택:", suggestions[idx]);
        // 👉 여기서 map.panTo() 같은 기능 연결 가능
      }
      box.classList.remove("open");
    });
  };
})();
