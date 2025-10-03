// search-suggest.js (최종 안정 버전)
(function () {
  console.log("[search-suggest] loaded FINAL-SIMPLE");

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
  if (it.enclosure) out.push(`<span>${it.enclosure}</span>`);
  if (it.address)   out.push(`<span>${it.address}</span>`);
  if (it.ip)        out.push(`<span>${it.ip}</span>`);  // 그냥 값
  if (it.line)      out.push(`<span>${it.line}</span>`); // 마지막
  return out.join(' '); // 공백 구분
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
      // 펄스 효과
      const node = document.createElement('div');
      node.className = 'pulse-marker';
      const overlay = new kakao.maps.CustomOverlay({position:pos, content:node, map, zIndex:9999});
      setTimeout(()=>overlay.setMap(null), 1500);
      box.classList.remove('open');
      kw.blur();   // 검색 후 인풋 비활성화
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

    // 지도 클릭/드래그 시 닫기
    if(map){
      kakao.maps.event.addListener(map, 'click', ()=>{ kw.blur(); box.classList.remove('open'); });
      kakao.maps.event.addListener(map, 'dragstart', ()=>{ kw.blur(); box.classList.remove('open'); });
      kakao.maps.event.addListener(map, 'zoom_start', ()=>{ kw.blur(); box.classList.remove('open'); });
    }
  };
})();
