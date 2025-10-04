/* ===== search-suggest.js (FULL-STABLE, 2025-10-05)
   - DOM + CSS 자동 생성
   - Safari 대응 (핀치줌 차단 / touchmove blur 제거)
   - 제안/키보드 내비(↑/↓/Enter/Esc) + 즉시 펄스(panTo 가드)
   - Enter 핫키: 비포커스 → 입력창 활성화 + 제안 열기, 포커스 상태 → 본래 Enter 동작
   - 입력창 클릭: 전체선택 없이 제안만 열기(비어 있으면 마지막 검색어 복원)
   - name1 앞 6글자 제거 후 7번째부터 표시(통합)
   - 마커 클릭: 입력창에 글만 채움(포커스/전체선택/제안창 X), 로드뷰 모드면 무시
   - 로드뷰 모드일 때 입력창 자동 숨김
   - 프리징 최소화(blur 남발 제거, panTo 연속 호출 방지, setInterval 미사용)
===== */
(function () {
  /* ---------- 유틸 ---------- */
  function normalizeText(s){return (s||'').toString().trim();}
  function toLowerNoSpace(s){return normalizeText(s).replace(/\s+/g,'').toLowerCase();}
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  // name에서 "-토큰-" 다음 한글 꼬리 추출 + 최종 결과에서 앞 6글자 제거
  function extractKoreanTail(name, fallback){
    const src = normalizeText(name);
    let result = '';
    const m = src.match(/-[A-Za-z0-9가-힣]+-\s*([가-힣\s]+)/);
    if (m && m[1]) result = m[1].trim();
    else result = normalizeText(fallback || src);
    if (result.length > 6) result = result.substring(6); // ✅ 앞 6글자 제거
    return result;
  }

  /* ---------- 스타일 주입 ---------- */
  function injectCSS(){
    if (document.getElementById('gx-suggest-style')) return;
    const css = `
.gx-suggest-root{
  position:absolute; top:12px; left:50%; transform:translateX(-50%);
  width:min(520px,90vw); z-index:600;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans KR",Arial,"Apple SD Gothic Neo","Malgun Gothic","맑은 고딕",sans-serif;
}
.gx-suggest-box {
  touch-action: pan-y;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  overscroll-behavior: contain;
}
.gx-suggest-search,
.gx-suggest-search .gx-input { touch-action:auto !important; }

/* 입력창 바로 아래 2px 간격으로 제안창 고정 */
.gx-suggest-search{ position:relative; display:flex; align-items:center; gap:8px; }
.gx-suggest-search .gx-input{
  flex:1; height:42px; padding:0 14px; border:1px solid #ccc; border-radius:12px;
  background:#fff; font-size:15px; outline:none; box-sizing:border-box;
  transition:border .2s ease, box-shadow .2s ease;
}
.gx-suggest-search .gx-input:focus{
  border-color:#4a90e2; box-shadow:0 0 0 2px rgba(74,144,226,0.2);
}
.gx-suggest-search .gx-btn{ display:none; }

.gx-suggest-box{
  position:absolute; top:calc(100% + 2px); left:0; width:100%;
  max-height:45vh; overflow:auto; -webkit-overflow-scrolling:touch;
  background:#fff; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.15);
  opacity:0; pointer-events:none; transform:translateY(-8px);
  transition:opacity .25s ease, transform .25s ease;
}
.gx-suggest-box.open{ opacity:1; pointer-events:auto; transform:translateY(0); }

.gx-suggest-item{
  padding:12px 16px; cursor:pointer; display:flex; flex-direction:column; align-items:flex-start; gap:4px;
  border-bottom:1px solid #f0f0f0; transition:background .2s ease;
}
.gx-suggest-item:last-child{ border-bottom:none; }
.gx-suggest-item:hover, .gx-suggest-item.active{ background:#d9e9ff; }

.gx-suggest-title{
  font-weight:600; font-size:15px; color:#222; line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.gx-suggest-sub{
  font-size:13px; color:#666; line-height:1.4; display:flex; flex-wrap:wrap; gap:6px; min-height:18px;
}
.gx-suggest-sub span{ white-space:nowrap; }

.gx-suggest-root.is-hidden{ display:none !important; }
    `.trim();
    const tag=document.createElement('style');
    tag.id='gx-suggest-style';
    tag.textContent=css;
    document.head.appendChild(tag);
  }

  /* ---------- DOM 생성 ---------- */
  function createDOM(parent){
    let root = parent.querySelector('.gx-suggest-root');
    if (root) return { root, input: root.querySelector('.gx-input'), box: root.querySelector('.gx-suggest-box') };

    root = document.createElement('div');
    root.className = 'gx-suggest-root';

    const search = document.createElement('div');
    search.className = 'gx-suggest-search';

    const input = document.createElement('input');
    input.className = 'gx-input';
    input.type = 'search';
    input.placeholder = '예) 시설명, 주소…';
    input.autocomplete = 'off';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gx-btn';
    btn.textContent = '검색';

    search.appendChild(input);
    search.appendChild(btn);

    const box = document.createElement('div');
    box.className = 'gx-suggest-box';
    box.setAttribute('role','listbox');

    root.appendChild(search);
    root.appendChild(box);
    parent.appendChild(root);

    // 멀티터치 핀치줌 제스처 방지
    document.addEventListener('gesturestart', e => e.preventDefault(), { passive:false });

    return { root, input, box };
  }

  /* ---------- 메인 ---------- */
  window.initSuggestUI = function initSuggestUI(opts){
    const {
      map,
      data = [],
      parent = document,
      getMarkers = null,
      badges = [],
      maxItems = 30,
      hideOnRoadview = true
    } = opts || {};
    if (!map) return;

    injectCSS();
    const { root, input, box } = createDOM(parent);

    // 상태
    let activeIdx = -1;
    let current = [];
    let __lastTypedQuery = '';
    let __lastPickedQuery = '';
    let isPanning = false;

    const items = () => Array.from(box.querySelectorAll('.gx-suggest-item'));
    const openBox = () => { if (!box.classList.contains('open')) box.classList.add('open'); };
    const closeBox = () => { if (box.classList.contains('open')) box.classList.remove('open'); setActive(-1); };
    function setActive(i){
      const list = items();
      list.forEach(el => { el.classList.remove('active'); el.setAttribute('aria-selected','false'); });
      activeIdx = i;
      if (i >= 0 && i < list.length) {
        const el = list[i];
        el.classList.add('active');
        el.setAttribute('aria-selected','true');
        try { el.scrollIntoView({ block: 'nearest' }); } catch(_) {}
      }
    }

    function badgeLine(obj){
      if (!badges || !badges.length) return '';
      const spans = [];
      for (const k of badges){
        const v = obj && obj[k];
        if (!v) continue;
        spans.push(`<span>${escapeHTML(String(v).replace(/^ip\s*:\s*/i,''))}</span>`);
      }
      return spans.length ? `<div class="gx-suggest-sub">${spans.join(' ')}</div>` : '';
    }
    function titleOf(o){ return normalizeText(o.name2 || o.name || o.name1 || o.searchName || ''); }
    function makeItemHTML(o){
      const title = titleOf(o);
      const sub = badgeLine(o);
      return `<div class="gx-suggest-item" role="option" aria-selected="false">
        <div class="gx-suggest-title">${escapeHTML(title)}</div>${sub}
      </div>`;
    }
    function render(list){
      box.innerHTML = list.map(makeItemHTML).join('');
      box.querySelectorAll('.gx-suggest-item').forEach((el, idx) => {
        el.addEventListener('mouseenter', () => setActive(idx));
        el.addEventListener('mouseleave', () => setActive(-1));
        el.addEventListener('mousedown', e => e.preventDefault()); // blur 전에 클릭 처리
        el.addEventListener('click', () => pick(idx));
      });
      setActive(-1);
    }
    function filterData(q){
      const needle = toLowerNoSpace(q);
      if (!needle) return [];
      const out = [];
      for (const o of data){
        const hay = toLowerNoSpace([o.name, o.name1, o.name2, o.searchName, o.addr, o.line, o.encloser].filter(Boolean).join(' '));
        if (hay.includes(needle)) out.push(o);
        if (out.length >= maxItems) break;
      }
      return out;
    }
    const getLatLng = (o) => ({
      lat: Number(o.lat || (o.latlng && o.latlng.getLat && o.latlng.getLat())),
      lng: Number(o.lng || (o.latlng && o.latlng.getLng && o.latlng.getLng()))
    });

    // 지도 이동 + 펄스 (중복 panTo 방지)
    function centerWithEffect(lat, lng){
      const pt = new kakao.maps.LatLng(lat, lng);
      if (isPanning) return; // ✅ 중복 panTo 가드
      isPanning = true;
      try { map.panTo(pt); } catch(_) {}

      try {
        const circle = new kakao.maps.Circle({
          center: pt,
          radius: 50,
          strokeWeight: 1,
          strokeColor: '#ffa500',
          strokeOpacity: 1,
          strokeStyle: 'dashed',
          fillColor: '#FF1000',
          fillOpacity: 0.3,
          zIndex: 9999
        });
        circle.setMap(map);
        setTimeout(()=>{ try{circle.setMap(null);}catch(_){} }, 1000);
      } catch(_) {}

      setTimeout(()=>{ isPanning = false; }, 400);
    }

    function __rememberPicked(){
      const q = (input.value || '').trim();
      if (q) __lastPickedQuery = q;
    }

    function pick(idx){
      if (idx < 0 || idx >= current.length) return;
      const o = current[idx];
      const t = extractKoreanTail(o.name1 || o.name || o.searchName);
      if (t) input.value = t;

      const { lat, lng } = getLatLng(o);
      if (isFinite(lat) && isFinite(lng)) centerWithEffect(lat, lng);

      __rememberPicked();
      closeBox();
      input.blur();
    }

    // 입력 이벤트
    input.addEventListener('input', () => {
      const q = (input.value || '').trim();
      if (q) __lastTypedQuery = q;

      if (q === '') { closeBox(); box.innerHTML=''; return; }

      const list = filterData(q);
      current = list;
      if (list.length === 0) { closeBox(); box.innerHTML=''; return; }
      render(list); openBox();
    });

    // 포커스 시: 현재 값으로 즉시 제안 보여주기(자동 선택 없음)
    input.addEventListener('focus', () => {
      const q = (input.value || '').trim();
      if (!q) return;
      const list = filterData(q);
      current = list;
      if (list.length) { render(list); openBox(); }
    });

    // ✅ 키보드 내비(↑/↓/Enter/Esc) 복구
    input.addEventListener('keydown', (e) => {
      const listEls = items();
      const isOpen  = box.classList.contains('open') && listEls.length > 0;

      // 닫혀 있을 때 화살표로 열기
      if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const q = (input.value || '').trim();
        if (q) {
          const l = filterData(q); current = l;
          if (l.length) { render(l); openBox(); }
        }
      }

      if (e.key === 'ArrowDown' && isOpen) {
        e.preventDefault();
        setActive((activeIdx + 1) % listEls.length);
      } else if (e.key === 'ArrowUp' && isOpen) {
        e.preventDefault();
        setActive((activeIdx - 1 + listEls.length) % listEls.length);
      } else if (e.key === 'Enter') {
        // 입력창 활성 상태 → 본래 엔터 기능 수행
        if (isOpen) {
          e.preventDefault();
          const idx = (activeIdx >= 0 && activeIdx < current.length) ? activeIdx : 0;
          pick(idx);
        }
        // (isOpen이 아니면 기본 submit 등 외부 로직에 맡김)
      } else if (e.key === 'Escape') {
        closeBox();
      }
    });

    // 입력창 클릭: 전체선택 없이 제안만 열기
    input.addEventListener('mousedown', function () {
      setTimeout(() => {
        const q = (input.value || '').trim();
        if (q) {
          const list = filterData(q);
          current = list;
          if (list.length) { render(list); openBox(); }
        } else if (__lastPickedQuery || __lastTypedQuery) {
          input.value = __lastPickedQuery || __lastTypedQuery;
          const list = filterData(input.value);
          current = list;
          if (list.length) { render(list); openBox(); }
        }
      }, 0);
    });

    // 바깥 클릭으로 닫기
    document.addEventListener('mousedown', (e) => {
      if (!box.classList.contains('open')) return;
      if (e.target === input || box.contains(e.target)) return;
      closeBox();
    });

    // 리사이즈 시 제안 닫기(위치 흔들림 방지)
    window.addEventListener('resize', closeBox);

    // 지도 이벤트 (blur 최소화로 프리징 방지)
    kakao.maps.event.addListener(map, 'click', () => { closeBox(); });
    kakao.maps.event.addListener(map, 'dragstart', () => { closeBox(); }); // drag 중 blur 제거

    // Safari: touchmove 중 blur 금지, touchend 시에만 필요시 blur
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.addEventListener('touchend', () => {
        if (document.activeElement === input) input.blur();
      }, { passive:true });
    }

    // ===== 🔥 전역 Enter 핫키: 비포커스일 때 입력창 활성화 =====
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;

      const ae = document.activeElement;
      const isOurInput = (ae === input);
      const typingInOther =
        !isOurInput && (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable));

      // 다른 입력 필드에서 엔터면 패스
      if (typingInOther) return;

      // 우리 입력창이 비포커스면 → 포커스 + 제안 열기
      if (!isOurInput) {
        e.preventDefault();
        try { input.focus(); } catch(_) {}
        setTimeout(() => {
          const q = (input.value || '').trim();
          let seed = q;
          if (!seed) seed = __lastPickedQuery || __lastTypedQuery || '';
          if (seed) {
            input.value = seed;
            const list = filterData(seed);
            current = list;
            if (list.length) { render(list); openBox(); }
          }
        }, 0);
      }
      // 포커스 상태면 → 본래 keydown(위)에서 처리 (여기선 아무것도 안 함)
    }, true);

    /* ===== 마커 클릭 → 입력창에 글만 채우기(로드뷰 모드면 무시) ===== */
    const patched = new WeakSet();
    function attachMarkerHandlersOnce() {
      const container = parent.closest('#container') || document.getElementById('container') || document.body;
      const list = (typeof getMarkers === 'function' ? getMarkers() : (Array.isArray(window.markers) ? window.markers : [])) || [];
      if (!Array.isArray(list)) return;

      list.forEach(mk => {
        if (!mk || patched.has(mk)) return;
        if (typeof mk.getPosition !== 'function') { patched.add(mk); return; }

        kakao.maps.event.addListener(mk, 'click', function () {
          const rvOnNow = container && container.classList.contains('view_roadview');
          if (rvOnNow) return;

          try {
            const pos = mk.getPosition();
            const lat = pos.getLat ? pos.getLat() : (pos.La || pos.y || pos.latitude || pos.lat);
            const lng = pos.getLng ? pos.getLng() : (pos.Ma || pos.x || pos.longitude || pos.lng);

            let text = '';
            // data에서 가장 가까운 포인트 매칭(간단 버전)
            const found = Array.isArray(data) ? data.find(o => {
              const la = Number(o.lat); const ln = Number(o.lng);
              return isFinite(la) && isFinite(ln) && (Math.abs(la - lat) < 0.0001) && (Math.abs(ln - lng) < 0.0001);
            }) : null;

            if (found) text = extractKoreanTail(found.name1 || found.name || found.searchName);
            else if (typeof mk.getTitle === 'function') text = extractKoreanTail(mk.getTitle(), mk.getTitle());

            if (text) {
              input.value = text;
              __lastPickedQuery = text;
              closeBox(); // 제안창 열지 않고 포커스/전체선택도 하지 않음
            }
          } catch(_) {}
        });

        patched.add(mk);
      });
    }
    attachMarkerHandlersOnce();
    document.addEventListener('markers:updated', attachMarkerHandlersOnce);

    // 로드뷰 숨김(모드 전환 감시)
    if (hideOnRoadview) {
      const container = parent.closest('#container') || document.getElementById('container') || document.body;
      const update = () => {
        const on = container.classList.contains('view_roadview');
        if (on) { root.classList.add('is-hidden'); closeBox(); }
        else    { root.classList.remove('is-hidden'); }
      };
      update();
      const mo = new MutationObserver(update);
      mo.observe(container, { attributes:true, attributeFilter:['class'] });
    }
  };
})();
