<script>
// search-suggest.js
(function () {
  // ===== 스타일 주입 =====
  const CSS = `
  .gx-suggest-search {
    position:absolute; top:8px; left:50%; transform:translateX(-50%);
    display:flex; gap:8px; align-items:center;
    width: min(520px, 90vw); z-index: 600;
  }
  .gx-suggest-search input {
    flex:1; height:40px; padding:0 12px; border:1px solid #ccc; border-radius:10px;
    background:#fff; font-size:14px; outline:none;
  }
  .gx-suggest-search button { display:none; }
  .gx-suggest-box {
    position:absolute; top:48px; left:50%; transform:translateX(-50%) translateY(-6px);
    width: min(520px, 90vw);
    max-height: 40vh; overflow-y:auto;
    border:1px solid #ccc; border-radius:10px;
    background:rgba(255,255,255,0.96);
    box-shadow:0 8px 20px rgba(0,0,0,.15);
    z-index:610;
    opacity:0; pointer-events:none; transition:opacity .18s ease, transform .18s ease;
  }
  .gx-suggest-box.open { opacity:1; transform:translateX(-50%) translateY(0); pointer-events:auto; }
  .gx-suggest-item { padding:10px 12px; cursor:pointer; display:flex; align-items:center; gap:8px; }
  .gx-suggest-item:hover, .gx-suggest-item.active { background:#eef3ff; }
  .gx-suggest-title { display:inline-block; max-width:60%; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-weight:600; }
  .gx-badge { font-size:12px; color:#555; background:#f2f4f8; padding:2px 6px; border-radius:6px; }
  .gx-suggest-empty { color:#777; padding:12px; }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // ===== 한글 초성 유틸 =====
  const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const CHO_SET = new Set(CHO);
  const normalize = s => (s||"").toUpperCase().replace(/\s+/g,"");
  function buildKey(str){
    let out=""; for (const ch of (str||"")){
      const c = ch.charCodeAt(0);
      if (c>=0xAC00 && c<=0xD7A3) out += CHO[Math.floor((c-0xAC00)/588)];
      else if (CHO_SET.has(ch)) out += ch;            // 자음 단독
      else if (c>=48&&c<=57) out += ch;               // 숫자
      else if (c>=65&&c<=90) out += ch;               // A-Z
      else if (c>=97&&c<=122) out += ch.toUpperCase();// a-z → A-Z
    }
    return out;
  }
  const esc = s => (s||"").replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

  // ===== 한글 부분 추출 =====
  function extractKorean(str){
    if (!str) return "";
    // 앞의 코드(예: 쓰-001-) 제거
    let s = str.replace(/^[^-]*-\d+-/, "");
    // 숫자 및 괄호 이후 제거
    s = s.replace(/\d.*$/, "");
    s = s.replace(/\(.*\).*$/, "");
    // 한글만 남기기
    const m = s.match(/[가-힣]+/g);
    return m ? m.join("") : s.trim();
  }

  // ===== 메인 초기화 =====
  function initSuggestUI(opts){
    const {
      map,                               // kakao.maps.Map (필수)
      data = window.SEL_SUGGEST || [],   // [{id,name,encloser,addr,lat,lng,ip,line}]
      parent = document.getElementById('mapWrapper') || document.body,
      getMarkers = () => window.markers || [], // 마커 배열 공급자
      badges = ['line','encloser','ip'], // 제안에 표시할 배지 필드
      maxItems = 30,
      chooseOnEnter = true,              // Enter로 1번 자동 선택
      openOnFocus = true                 // 포커스 시 즉시 열기
    } = opts || {};
    if (!map) { console.error('initSuggestUI: map이 필요합니다.'); }

    // DOM 생성
    const wrap = document.createElement('div');
    wrap.className = 'gx-suggest-search';
    wrap.innerHTML = `
      <input type="search" class="gx-input" placeholder="예) ㅎㅇㄱㅂㄱㅅ, ㄷ032, 시설명…" autocomplete="off" />
      <button type="button" class="gx-btn">검색</button>
    `;
    const box = document.createElement('div');
    box.className = 'gx-suggest-box';
    parent.appendChild(wrap);
    parent.appendChild(box);

    const kw  = wrap.querySelector('.gx-input');
    const btn = wrap.querySelector('.gx-btn');

    // 데이터 가공
    const RAW = (data || []).filter(it => it && (it.name||it.addr||it.ip))
      .map((it, idx)=>({
        id: it.id || `s_${idx}`,
        name: it.name || "",
        line: it.line || "",
        encloser: it.encloser || "",
        addr: it.addr || "",
        lat: it.lat, lng: it.lng,
        ip: it.ip || ""
      }));
    RAW.forEach(it=>{
      it.key = buildKey([it.name, it.line, it.encloser, it.ip].filter(Boolean).join(" "));
      it.nameLen = (it.name||"").length;
    });
    const IDMAP = Object.fromEntries(RAW.map(it => [it.id, it]));

    // 매칭
    function match(q){
      const k = buildKey(q);
      if (!k) return [];
      const res=[];
      for (const it of RAW){
        if (it.key.indexOf(k) !== -1) res.push(it);
        if (res.length >= 2000) break;
      }
      res.sort((a,b)=>{
        const ai=a.key.indexOf(k), bi=b.key.indexOf(k);
        if (ai!==bi) return ai-bi;
        if (a.nameLen!==b.nameLen) return a.nameLen-b.nameLen;
        return a.id.localeCompare(b.id);
      });
      return res.slice(0, maxItems);
    }

    // 렌더
    function render(items){
      if (!items.length){
        box.innerHTML = `<div class="gx-suggest-empty">검색 결과 없음</div>`;
        return;
      }
      box.innerHTML = items.map(it=>{
        const title = esc(it.name);
        const badgeHtml = badges.map(b=>{
          const v = it[b];
          return v ? `<span class="gx-badge">${esc(String(v))}</span>` : '';
        }).join('');
        return `<div class="gx-suggest-item" data-id="${it.id}">
          <span class="gx-suggest-title">${title}</span>${badgeHtml}
        </div>`;
      }).join('');
    }

    const openBox  = ()=> box.classList.add('open');
    const closeBox = ()=> { box.classList.remove('open'); setActive(-1); };

    // 활성항목/키보드
    let active=-1, rafId=null;
    function setActive(i){
      const items = box.querySelectorAll('.gx-suggest-item');
      items.forEach((el,idx)=> el.classList.toggle('active', idx===i));
      active=i;
      if (i>=0 && items[i]) items[i].scrollIntoView({block:'nearest'});
    }
    function schedule(q){
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(()=>{
        rafId=null;
        const items = match(q);
        if (items.length){ render(items); openBox(); setActive(-1); }
        else closeBox();
      });
    }

    // 선택 적용
// search-suggest.js (인라인) 부분 수정
// ...
// ------------------------------------
// 원본: kw.value = item.name;
// 수정: 추출 함수를 사용하여 검색창에 값을 넣도록 변경
// ------------------------------------
function applySelection(item){
    if (!item) return;
    // 가운데 한글 부분만 추출하는 'extractKorean' 함수를 여기서 사용해야 합니다.
    kw.value = extractKorean(item.name); // 💥 이 부분을 수정해야 합니다.

    // ... (나머지 마커 이동/클릭 로직은 동일)
    // ...
    closeBox();
}

      // 마커 찾기
      const markers = getMarkers() || [];
      const found = markers.find(m=>{
        const p=m.getPosition?.(); if (!p) return false;
        return Math.abs(p.getLat()-item.lat) < 1e-9 && Math.abs(p.getLng()-item.lng) < 1e-9;
      });
      if (found && window.kakao && window.kakao.maps){
        kakao.maps.event.trigger(found, "mousedown");
        setTimeout(()=>kakao.maps.event.trigger(found, "mouseup"), 0);
        map.panTo(found.getPosition());
      } else if (Number.isFinite(item.lat) && Number.isFinite(item.lng)){
        map.panTo(new kakao.maps.LatLng(item.lat, item.lng));
      }
      closeBox();
    }

    // 이벤트
    kw.addEventListener('compositionupdate', ()=> {
      const v = kw.value.trim();
      if (!v) { closeBox(); return; }
      schedule(v);
    });
    kw.addEventListener('input', ()=> {
      const v = kw.value.trim();
      if (!v) { closeBox(); return; }
      schedule(v);
    });
    kw.addEventListener('keydown', (e)=>{
      const visible = box.classList.contains('open');
      if (visible){
        const nodes = box.querySelectorAll('.gx-suggest-item');
        if (e.key === 'ArrowDown'){
          e.preventDefault();
          setActive(active < nodes.length-1 ? active+1 : 0);
        } else if (e.key === 'ArrowUp'){
          e.preventDefault();
          setActive(active > 0 ? active-1 : nodes.length-1);
        } else if (e.key === 'Enter' && chooseOnEnter){
          e.preventDefault();
          const list = match(kw.value);
          if (list.length){
            const pick = (active>=0 && active<list.length) ? list[active] : list[0];
            applySelection(pick);
          } else closeBox();
        } else if (e.key === 'Escape'){
          closeBox();
        }
      } else if (e.key === 'Enter' && chooseOnEnter){
        e.preventDefault();
        const list = match(kw.value);
        if (list.length) applySelection(list[0]);
      }
    });

    // 마우스 선택
    box.addEventListener('mousedown', (e)=>{
      const el = e.target.closest('.gx-suggest-item');
      if (!el) return;
      const item = IDMAP[el.dataset.id];
      applySelection(item);
      e.preventDefault();
    });

    // 포커스 시 열기
    if (openOnFocus){
      kw.addEventListener('focus', ()=>{
        const v = kw.value.trim();
        if (v) schedule(v);
      });
    }
    // 바깥 클릭 닫기
    document.addEventListener('click', (e)=>{
      const within = e.target.closest('.gx-suggest-search') || e.target.closest('.gx-suggest-box');
      if (!within) closeBox();
    });

    // 공개 API
    return {
      destroy(){
        document.removeEventListener('click', closeBox);
        wrap.remove(); box.remove();
      },
      focus(){ kw.focus(); },
      setData(newData){
        RAW.length = 0;
        (newData||[]).forEach((it, idx)=>{
          const row = {
            id: it.id || `s_${idx}`,
            name: it.name || "",
            line: it.line || "",
            encloser: it.encloser || "",
            addr: it.addr || "",
            lat: it.lat, lng: it.lng,
            ip: it.ip || ""
          };
          row.key = buildKey([row.name, row.line, row.encloser, row.ip].filter(Boolean).join(" "));
          row.nameLen = (row.name||"").length;
          RAW.push(row);
        });
        Object.keys(IDMAP).forEach(k=>delete IDMAP[k]);
        RAW.forEach(it => IDMAP[it.id] = it);
      }
    };
  }

  window.initSuggestUI = initSuggestUI;
})();
</script>
