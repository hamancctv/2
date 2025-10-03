// search-suggest.js
(function () {
  console.log("[search-suggest] loaded FINAL");

  // 스타일 (빨간 원 포함)
  const style = document.createElement("style");
  style.textContent = `
    .gx-suggest-box{font-family:sans-serif;}
    .gx-item{padding:8px 12px;cursor:pointer;display:flex;flex-direction:column;border-bottom:1px solid #f2f2f2;}
    .gx-item:hover{background:#f5f9ff;}
    .gx-main{font-weight:600;}
    .gx-sub{font-size:12px;color:#555;margin-top:2px;}
    .pulse-marker {
      width:20px;height:20px;
      margin-left:-10px;margin-top:-10px;
      border:4px solid red;
      border-radius:50%;
      background:rgba(255,0,0,0.3);
      animation:pulse 1.2s ease-out forwards;
    }
    @keyframes pulse {
      0%{transform:scale(0.5);opacity:0.8;}
      70%{transform:scale(2.0);opacity:0;}
      100%{transform:scale(2.0);opacity:0;}
    }
  `;
  document.head.appendChild(style);

  // 초기화 함수
  window.initSuggestUI = function(opts) {
    const {
      map,
      data = window.SEL_SUGGEST || [],
      parent = document.body,
      badges = [],
      maxItems = 30
    } = opts || {};

    const wrap = parent.querySelector('.gx-suggest-search');
    const box = parent.querySelector('.gx-suggest-box');
    const kw  = wrap ? wrap.querySelector('.gx-input') : null;

    if (!wrap || !box || !kw) {
      console.warn("search-suggest: DOM 없음");
      return;
    }

    // RAW 데이터 준비
    let RAW = data.map((it, idx)=>({
      id: it.id || `s_${idx}`,
      name: it.name || "",
      enclosure: it.enclosure || it.encloser || "",
      address: it.address || it.addr || "",
      ip: it.ip || "",
      line: it.line || "",
      lat: Number(it.lat),
      lng: Number(it.lng)
    })).filter(it=>!isNaN(it.lat)&&!isNaN(it.lng));

    RAW.forEach(it=>{ it.key = (it.name+it.enclosure+it.address+it.ip+it.line); });

    let suggestions = [];

    // 검색 함수
    function match(q){
      if(!q) return [];
      q = q.toLowerCase();
      return RAW.filter(it=>it.key.toLowerCase().includes(q)).slice(0,maxItems);
    }

    // 빨간 원 표시
    function showPulse(latlng){
      const node = document.createElement("div");
      node.className = "pulse-marker";
      const overlay = new kakao.maps.CustomOverlay({
        position: latlng,
        content: node,
        map: map,
        zIndex: 9999
      });
      setTimeout(()=>overlay.setMap(null),1500);
    }

    // 렌더링
    function render(items){
      suggestions = items || [];
      if(!items.length){
        box.innerHTML = "";
        box.classList.remove("open");
        return;
      }
      box.innerHTML = items.map((it,idx)=>{
        let subs = [];
        if(badges.includes("enclosure") && it.enclosure) subs.push(`[${it.enclosure}]`);
        if(badges.includes("line") && it.line) subs.push(it.line);
        if(badges.includes("address") && it.address) subs.push(it.address);
        if(badges.includes("ip") && it.ip) subs.push("IP:"+it.ip);
        return `
          <div class="gx-item" data-index="${idx}">
            <div class="gx-main">${it.name}</div>
            ${subs.length? `<div class="gx-sub">${subs.join(" / ")}</div>` : ""}
          </div>`;
      }).join('');
      box.classList.add("open");
    }

    // 이벤트 연결
    kw.addEventListener("input",()=>{
      render(match(kw.value.trim()));
    });

    box.addEventListener("click",e=>{
      const el = e.target.closest(".gx-item");
      if(!el) return;
      const idx = parseInt(el.dataset.index,10);
      if(suggestions[idx]) {
        const pos = new kakao.maps.LatLng(suggestions[idx].lat, suggestions[idx].lng);
        map.panTo(pos);
        showPulse(pos);
      }
      box.classList.remove("open");
    });
  };
})();
