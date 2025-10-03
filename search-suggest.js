// search-suggest.js (오빠 HTML 전용 FINAL+++ : 모바일 최적화 + 드래그 방지)
(function () {
  console.log("[search-suggest] loaded FINAL+++");

  // 최소 스타일
  const style = document.createElement("style");
  style.textContent = `
    .gx-suggest-box{font-family:sans-serif;overflow-y:auto;-webkit-overflow-scrolling:touch;}
    .gx-suggest-item{padding:8px 12px;cursor:pointer;display:flex;flex-direction:column;border-bottom:1px solid #f2f2f2;}
    .gx-suggest-item:hover,.gx-suggest-item.active{background:#f5f9ff;}
    .gx-suggest-title{font-weight:600;}
    .gx-suggest-sub{font-size:12px;color:#555;margin-top:2px;}
    .pulse-marker {
      width:20px;height:20px;margin-left:-10px;margin-top:-10px;
      border:4px solid red;border-radius:50%;background:rgba(255,0,0,0.3);
      animation:pulse 1.2s ease-out forwards;
    }
    @keyframes pulse {
      0%{transform:scale(0.5);opacity:0.8;}
      70%{transform:scale(2.0);opacity:0;}
      100%{transform:scale(2.0);opacity:0;}
    }
  `;
  document.head.appendChild(style);

  window.initSuggestUI = function(opts) {
    const {
      map,
      data = window.SEL_SUGGEST || [],
      parent = document.getElementById('mapWrapper') || document.body,
      badges = [],
      maxItems = 30,
      openOnFocus = false,
      chooseOnEnter = false
    } = opts || {};

    const wrap = parent.querySelector('.gx-suggest-search');
    const box  = parent.querySelector('.gx-suggest-box');
    const kw   = wrap ? wrap.querySelector('.gx-input') : null;

    if (!wrap || !box || !kw) {
      console.warn("search-suggest: 필요한 DOM을 찾지 못함");
      return;
    }

    // 데이터 정규화
    const RAW = (data || []).map((it, idx) => {
      const enclosure = it.enclosure ?? it.encloser ?? "";
      const address   = it.address   ?? it.addr     ?? "";
      const name      = it.name      ?? "";
      const line      = it.line      ?? "";
      const ip        = it.ip        ?? "";
      const lat = Number(it.lat), lng = Number(it.lng);
      return isFinite(lat) && isFinite(lng) ? {
        id: it.id || `s_${idx}`,
        name, enclosure, address, ip, line,
        lat, lng,
        key: (name + enclosure + address + ip + line).toLowerCase()
      } : null;
    }).filter(Boolean);

    let suggestions = [];
    let active = -1;

    function match(q){
      if(!q) return openOnFocus ? RAW.slice(0, maxItems) : [];
      const s = q.toLowerCase();
      return RAW.filter(it => it.key.includes(s)).slice(0, maxItems);
    }

    function buildSub(it){
      const out = [];
      if ((badges.includes('enclosure') || badges.includes('encloser')) && it.enclosure) out.push(`[${it.enclosure}]`);
      if (badges.includes('line') && it.line) out.push(it.line);
      if ((badges.includes('address') || badges.includes('addr')) && it.address) out.push(it.address);
      if (badges.includes('ip') && it.ip) out.push('IP:'+it.ip);
      return out.join(' / ');
    }

    function render(items){
      suggestions = items || [];
      active = -1;
      if(!items || !items.length){
        box.innerHTML = "";
        box.classList.remove('open');
        return;
      }
      box.innerHTML = items.map((it,idx)=>(
        `<div class="gx-suggest-item" data-index="${idx}">
           <div class="gx-suggest-title">${it.name}</div>
           ${buildSub(it) ? `<div class="gx-suggest-sub">${buildSub(it)}</div>` : ""}
         </div>`
      )).join('');
      box.classList.add('open');
    }

    function moveActive(delta){
      if(!box.classList.contains('open') || suggestions.length===0) return;
      active = (active + delta + suggestions.length) % suggestions.length;
      [...box.querySelectorAll('.gx-suggest-item')].forEach((el,i)=>{
        el.classList.toggle('active', i===active);
        if(i===active) el.scrollIntoView({block:'nearest'});
      });
    }

    function choose(index){
      const item = suggestions[index];
      if(!item) return;
      const pos = new kakao.maps.LatLng(item.lat, item.lng);
      map.panTo(pos);
      // 빨간 원 펄스
      const node = document.createElement('div');
      node.className = 'pulse-marker';
      const overlay = new kakao.maps.CustomOverlay({position:pos, content:node, map, zIndex:9999});
      setTimeout(()=>overlay.setMap(null), 1500);
      box.classList.remove('open');
      kw.blur();   // 검색 완료 후 input 비활성화
    }

    // 이벤트
    kw.addEventListener('input', ()=>render(match(kw.value.trim())));
    if(openOnFocus){
      kw.addEventListener('focus', ()=>render(match(kw.value.trim())));
    }

    kw.addEventListener('keydown', (e)=>{
      if(e.key==='ArrowDown'){ e.preventDefault(); moveActive(1); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); moveActive(-1); }
      else if(e.key==='Enter' && chooseOnEnter){
        e.preventDefault();
        if(active>=0) choose(active);
        else if(suggestions.length) choose(0);
      } else if(e.key==='Escape'){
        box.classList.remove('open');
        kw.blur();
      }
    });

    box.addEventListener('click', (e)=>{
      const el = e.target.closest('.gx-suggest-item');
      if(!el) return;
      choose(parseInt(el.dataset.index,10));
    });

    // 바깥 클릭 시 닫기
    document.addEventListener('click', (e)=>{
      if(!wrap.contains(e.target) && !box.contains(e.target)) {
        box.classList.remove('open');
        kw.blur();
      }
    });

    // ✅ 모바일 대응: 지도 조작 시 키보드 닫기
    if(map){
      kakao.maps.event.addListener(map, 'click', ()=>{ kw.blur(); box.classList.remove('open'); });
      kakao.maps.event.addListener(map, 'dragstart', ()=>{ kw.blur(); box.classList.remove('open'); });
      kakao.maps.event.addListener(map, 'zoom_start', ()=>{ kw.blur(); box.classList.remove('open'); });
    }

    // ✅ 제안창 드래그 시 페이지/지도까지 같이 끌리는 현상 방지
    box.addEventListener('touchmove', (e) => {
      const atTop = box.scrollTop === 0;
      const atBottom = box.scrollHeight - box.scrollTop === box.clientHeight;
      const movingDown = e.touches[0].clientY > (box._lastY || 0);
      const movingUp   = e.touches[0].clientY < (box._lastY || 0);
      box._lastY = e.touches[0].clientY;

      if ((atTop && movingDown) || (atBottom && movingUp)) {
        e.preventDefault(); // 바운스 방지
      }
      e.stopPropagation(); // 지도 이벤트로 전달 방지
    }, { passive:false });
  };
})();
