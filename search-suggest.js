// search-suggest.js
(function () {
  console.log("[search-suggest] loaded FINAL with center pulse");

  // 검색창 UI 스타일 삽입
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
    .gx-item{padding:8px 12px;cursor:pointer;display:flex;flex-direction:column;border-bottom:1px solid #f2f2f2;}
    .gx-item:hover,.gx-item.active{background:#f5f9ff;}
    .gx-main{font-weight:600;}
    .gx-sub{font-size:12px;color:#555;margin-top:2px;}

    /* 중심 빨간 원 효과 */
    .pulse-marker {
      width:20px; height:20px;
      margin-left:-10px; margin-top:-10px;
      border:4px solid red;
      border-radius:50%;
      background:rgba(255,0,0,0.3);
      animation:pulse 1.2s ease-out forwards;
    }
    @keyframes pulse {
      0%   {transform:scale(0.5);opacity:0.8;}
      70%  {transform:scale(1.8);opacity:0;}
      100% {transform:scale(1.8);opacity:0;}
    }
  `;
  document.head.appendChild(style);

  window.initSuggestUI = function(opts) {
    const {
      map,
      data = window.SEL_SUGGEST || [],
      parent = document.getElementById('mapWrapper') || document.body,
      maxItems = 30
    } = opts || {};

    const wrap = parent.querySelector('.gx-suggest-search');
    const box = parent.querySelector('.gx-suggest-box');
    if (!wrap || !box) {
      console.warn("검색창 DOM 없음, search-suggest 중단");
      return;
    }

    const kw = wrap.querySelector('.gx-input');
    if (!kw) {
      console.warn("검색 input 없음");
      return;
    }

    // ✅ RAW 데이터 구성
    let RAW = data.map((it, idx)=>({
      id: it.id || `s_${idx}`,
      name: it.name || "",
      enclosure: it.enclosure || "",
      address: it.address || "",
      ip: it.ip || "",
      line: it.line || "",
      lat: Number(it.lat),
      lng: Number(it.lng)
    })).filter(it=>!isNaN(it.lat)&&!isNaN(it.lng));

    RAW.forEach(it => { it.key = (it.name + it.enclosure + it.address + it.ip + it.line); });

    let suggestions = [];

    // ✅ 검색 매칭 함수
    function match(q){
      if(!q) return [];
      q = q.toLowerCase();
      return RAW.filter(it => it.key.toLowerCase().includes(q)).slice(0,maxItems);
    }

    // ✅ 결과 렌더링
    function render(items){
      suggestions = items || [];
      if(!items || items.length === 0){
        box.innerHTML = "";
        box.classList.remove("open");
        return;
      }
      box.innerHTML = items.map((it,idx)=>
        `<div class="gx-item" data-index="${idx}">
           <div class="gx-main">${it.name}</div>
           <div class="gx-sub">
             ${it.enclosure? `[${it.enclosure}] `:""}
             ${it.line? it.line+" / ":""}
             ${it.address? it.address+" / ":""}
             ${it.ip? "IP:"+it.ip:""}
           </div>
         </div>`
      ).join('');
      box.classList.add("open");
    }

    // ✅ 중심 빨간 원 효과 함수
    function showPulse(latlng){
      const node = document.createElement("div");
      node.className = "pulse-marker";
      const overlay = new kakao.maps.CustomOverlay({
        position: latlng,
        content: node,
        map: map,
        zIndex: 10000
      });
      // 1.5초 뒤 자동 제거
      setTimeout(()=>overlay.setMap(null), 1500);
    }

    // ✅ 이벤트 연결
    kw.addEventListener("input", ()=>{
      const q = kw.value.trim();
      render(match(q));
    });

    box.addEventListener("click", e=>{
      const el = e.target.closest(".gx-item");
      if(!el) return;
      const idx = parseInt(el.dataset.index,10);
      if(suggestions[idx]) {
        console.log("선택:", suggestions[idx]);
        const pos = new kakao.maps.LatLng(suggestions[idx].lat, suggestions[idx].lng);
        map.panTo(pos);         // 👉 지도 중심 이동
        showPulse(pos);         // 👉 빨간 원 효과
      }
      box.classList.remove("open");
    });
  };
})();
