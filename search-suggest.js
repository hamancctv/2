/* ===== search-suggest.js (DOM + CSS 자동 생성 통합 버전)
   - Safari 대응 (핀치줌 차단)
   - 제안/키보드 내비/엔터 이동 + 펄스
   - "/" 핫키: 슬래시 입력 방지 + 마지막 검색어 복원 + 제안 열기 + 전체선택
   - 입력창 클릭 시에도 제안 열기 + 전체선택
   - 선택 텍스트: name에서 "-문자/숫자/한글-" 다음 ~ 한글이 끝날 때까지 추출
===== */
(function () {
  /* ---------- 유틸 ---------- */
  function normalizeText(s) { return (s || '').toString().trim(); }
  function toLowerNoSpace(s) { return normalizeText(s).replace(/\s+/g, '').toLowerCase(); }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  // name에서 "-문자/숫자/한글-" 다음부터 '한글 연속 구간' 추출
  function extractKoreanTail(name, fallback) {
    const src = normalizeText(name);
    // -[A-Za-z0-9가-힣]+- 이후의 한글/공백 연속
    const m = src.match(/-[A-Za-z0-9가-힣]+-\s*([가-힣\s]+)/);
    if (m && m[1]) {
      const picked = m[1].trim();
      if (picked) return picked;
    }
    return normalizeText(fallback || src);
  }

  /* ---------- 스타일 주입 ---------- */
  function injectCSS() {
    if (document.getElementById('gx-suggest-style')) return;
    const css = `
.gx-suggest-root{
  position:absolute; top:12px; left:50%; transform:translateX(-50%);
  width:min(520px,90vw); z-index:600;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans KR",Arial,"Apple SD Gothic Neo","Malgun Gothic","맑은 고딕",sans-serif;
}
/* 제안창: 세로 스크롤 허용 + 핀치/더블탭 확대 차단 */
.gx-suggest-box {
  touch-action: pan-y;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  overscroll-behavior: contain;
}
/* 검색창은 정상 입력되도록 허용 */
.gx-suggest-search,
.gx-suggest-search .gx-input {
  touch-action:auto !important;
}

.gx-suggest-search{ display:flex; align-items:center; gap:8px; }
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
  position:absolute; top:52px; left:0; width:100%;
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
    const tag = document.createElement('style');
    tag.id = 'gx-suggest-style';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  /* ---------- DOM 생성 ---------- */
  function createDOM(parent) {
    let root = parent.querySelector('.gx-suggest-root');
    if (root) {
      return {
        root,
        input: root.querySelector('.gx-input'),
        box: root.querySelector('.gx-suggest-box')
      };
    }

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

    /* 핀치줌 차단(멀티터치만 막음: 드래그는 그대로 동작) */
    [box].forEach(el => {
      el.addEventListener('touchstart', e => {
        if (e.touches.length > 1) e.preventDefault();
      }, { passive:false });
    });
    document.addEventListener('gesturestart', e => e.preventDefault(), { passive:false });

    return { root, input, box };
  }

  /* ---------- 메인 ---------- */
  window.initSuggestUI = function initSuggestUI(opts) {
    const {
      map,
      data = [],
      parent = document,
      getMarkers = null,
      badges = [],
      maxItems = 30,
      chooseOnEnter = true,
      openOnFocus = true,
      hideOnRoadview = true
    } = opts || {};
    if (!parent || !map) return;

    injectCSS();
    const { root, input, box } = createDOM(parent);

    // 접근성
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    box.id = box.id || 'gx-suggest-list';
    input.setAttribute('aria-controls', box.id);

    // 상태
    let activeIdx = -1;
    let current = [];
    let last = '';
    let __lastTypedQuery = '';   // 마지막 타이핑 비공백 쿼리
    let __lastPickedQuery = '';  // 마지막 확정(Enter/클릭)

    const items = () => Array.from(box.querySelectorAll('.gx-suggest-item'));

    function openBox() {
      if (!box.classList.contains('open')) {
        box.classList.add('open');
        input.setAttribute('aria-expanded', 'true');
      }
    }
    function closeBox() {
      if (box.classList.contains('open')) {
        box.classList.remove('open');
        input.setAttribute('aria-expanded', 'false');
      }
      setActive(-1);
    }
    function setActive(i) {
      const list = items();
      list.forEach(el => {
        el.classList.remove('active');
        el.setAttribute('aria-selected', 'false');
      });
      activeIdx = i;
      if (i >= 0 && i < list.length) {
        const el = list[i];
        el.classList.add('active');
        el.setAttribute('aria-selected', 'true');
        try { el.scrollIntoView({ block: 'nearest' }); } catch(_) {}
      }
    }

    function badgeLine(obj) {
      if (!badges || badges.length === 0) return '';
      const spans = [];
      for (const key of badges) {
        if (!obj) continue;
        const raw = obj[key];
        if (!raw) continue;
        const t = normalizeText(String(raw).replace(/^ip\s*:\s*/i, ''));
        if (t) spans.push(`<span>${escapeHTML(t)}</span>`);
      }
      return spans.length ? `<div class="gx-suggest-sub">${spans.join(' ')}</div>` : '';
    }
    function titleOf(o) {
      // 화면에 보이는 타이틀 (원본 name2/name/name1 등)
      return normalizeText(o.name2 || o.name || o.name1 || o.searchName || '');
    }
    function inputTitleOf(o) {
      // 입력창에 넣을 텍스트: name의 규칙 추출 우선, 없으면 name1 → 그 외
      const fallback = normalizeText(o.name1 || o.name2 || o.name || o.searchName || '');
      return extractKoreanTail(o.name, fallback);
    }
    function makeItemHTML(o) {
      const title = titleOf(o);
      const sub = badgeLine(o);
      return `
        <div class="gx-suggest-item" role="option" aria-selected="false">
          <div class="gx-suggest-title">${escapeHTML(title)}</div>
          ${sub}
        </div>
      `;
    }
    function render(list) {
      box.innerHTML = list.map(makeItemHTML).join('');
      box.querySelectorAll('.gx-suggest-item').forEach((el, idx) => {
        el.addEventListener('mouseenter', () => setActive(idx));
        el.addEventListener('mouseleave', () => setActive(-1));
        el.addEventListener('mousedown', (e) => e.preventDefault()); // blur 전에 클릭 처리
        el.addEventListener('click', () => pick(idx));
      });
      setActive(-1);
    }
    function filterData(q) {
      const needle = toLowerNoSpace(q);
      if (!needle) return [];
      const out = [];
      for (const o of data) {
        const hay = toLowerNoSpace(
          [o.name, o.name1, o.name2, o.searchName, o.addr, o.line, o.encloser]
            .filter(Boolean).join(' ')
        );
        if (hay.includes(needle)) out.push(o);
        if (out.length >= maxItems) break;
      }
      return out;
    }
    function getLatLngFromItem(o) {
      // lat/lng → kakao LatLng
      const lat = Number(o.lat || (o.latlng && o.latlng.getLat && o.latlng.getLat()));
      const lng = Number(o.lng || (o.latlng && o.latlng.getLng && o.latlng.getLng()));
      return { lat, lng };
    }

    // 중심 이동 + 원: 전역 setCenter가 있으면 위임(중복 방지)
    function centerWithEffect(lat, lng){
      const pt = new kakao.maps.LatLng(lat, lng);

      if (typeof window.setCenter === 'function') {
        try { window.setCenter(lat, lng); } catch(_) {}
        return;
      }

      // 부드러운 줌 + 팬
      try { map.setLevel(1, { animate: true }); } catch(_) { try { map.setLevel(1); } catch(_) {} }

      let drawn = false;
      function drawPulse() {
        if (drawn) return; drawn = true;
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
          setTimeout(()=>{ try { circle.setMap(null); } catch(_) {} }, 1000);
        } catch(_) {}
      }

      try {
        if (window.requestAnimationFrame) {
          requestAnimationFrame(() => {
            try { map.panTo(pt); } catch(_) {}
            requestAnimationFrame(drawPulse);
          });
        } else {
          setTimeout(() => { try { map.panTo(pt); } catch(_) {}; setTimeout(drawPulse, 50); }, 16);
        }
      } catch(_) {
        try { map.panTo(pt); } catch(_) {}
        setTimeout(drawPulse, 60);
      }
      setTimeout(drawPulse, 180);
    }

    function __rememberPicked() {
      const q = (input.value || '').trim();
      if (q) __lastPickedQuery = q;
    }

    function pick(idx) {
      if (idx < 0 || idx >= current.length) return;
      const o = current[idx];
      const t = inputTitleOf(o); // ← 규칙 기반 텍스트
      if (t) input.value = t;

      const { lat, lng } = getLatLngFromItem(o);
      if (isFinite(lat) && isFinite(lng) && map) {
        centerWithEffect(lat, lng);
      }
      __rememberPicked();
      closeBox();
      input.blur();
    }

    // 입력 이벤트
    input.addEventListener('input', () => {
      const q = (input.value || '').trim();
      if (q) __lastTypedQuery = q;

      if (q === '') { closeBox(); box.innerHTML=''; last=''; return; }
      if (q === last && box.classList.contains('open')) return;

      last = q;
      const list = filterData(q);
      current = list;
      if (list.length === 0) { closeBox(); box.innerHTML=''; return; }
      render(list); openBox();
    });

    // 포커스 시
    input.addEventListener('focus', () => {
      if (!openOnFocus) return;
      const q = input.value || '';
      if (q.trim() === '') return;
      const list = filterData(q);
      current = list;
      if (list.length > 0) { render(list); openBox(); }
    });

    // 키보드 내비 + Enter
    input.addEventListener('keydown', (e) => {
      const listEls = items();
      const isOpen  = box.classList.contains('open') && listEls.length > 0;

      if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const q = (input.value || '').trim();
        if (q !== '') {
          const l = filterData(q);
          current = l;
          if (l.length > 0) { render(l); openBox(); }
        }
      }

      if (e.key === 'ArrowDown' && isOpen) { e.preventDefault(); setActive((activeIdx + 1) % listEls.length); }
      else if (e.key === 'ArrowUp' && isOpen) { e.preventDefault(); setActive((activeIdx - 1 + listEls.length) % listEls.length); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        let useList = current;
        if (!isOpen) {
          const q = (input.value || '').trim();
          useList = q ? filterData(q) : [];
          current = useList;
          if (useList.length) { render(useList); openBox(); }
        }
        if (useList.length) {
          const idx = (activeIdx >= 0 && activeIdx < useList.length) ? activeIdx : 0;
          const { lat, lng } = getLatLngFromItem(useList[idx]);
          const t = inputTitleOf(useList[idx]);
          if (t) input.value = t;
          if (isFinite(lat) && isFinite(lng)) centerWithEffect(lat, lng);
          __rememberPicked();
          closeBox(); input.blur();
        }
      } else if (e.key === 'Escape') {
        closeBox();
      }
    });

    // 바깥 클릭으로 닫기
    document.addEventListener('mousedown', (e) => {
      if (!box.classList.contains('open')) return;
      if (e.target === input || box.contains(e.target)) return;
      closeBox();
    });
    window.addEventListener('resize', closeBox);

    // 지도 이벤트
    if (map) {
      kakao.maps.event.addListener(map, 'click', () => { closeBox(); });
      kakao.maps.event.addListener(map, 'dragstart', () => { input.blur(); });
      kakao.maps.event.addListener(map, 'drag',      () => { input.blur(); });
      kakao.maps.event.addListener(map, 'dragend',   () => { input.blur(); });
    }

    // Safari 대응: 지도 DOM touchend → blur (지연)
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.addEventListener('touchend', () => { setTimeout(()=>input.blur(), 100); }, { passive:true });
      mapEl.addEventListener('touchmove', () => { input.blur(); }, { passive:true });
    }
    // 제안창 스크롤/드래그 시 키보드만 내림 (제안창은 유지)
    box.addEventListener('touchmove', () => { input.blur(); }, { passive:true });

    // 로드뷰 숨김
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

    /* ===== "/" 핫키 + 클릭 포커스 보강 ===== */
    function __rememberPickedSafe() {
      const q = (input.value || '').trim();
      if (q) __lastPickedQuery = q;
    }
    // 기존 input 이벤트에서 __lastTypedQuery 갱신(위에 구현됨)

    // 비어있으면 마지막 검색어 복원 + 제안 열기 + 전체 선택
    function __showLastQueryIfEmpty() {
      if ((input.value || '').trim() !== '') return;
      const fallback = __lastPickedQuery || __lastTypedQuery || '';
      if (!fallback) return;
      input.value = fallback;
      try {
        const list = filterData(fallback);
        if (list && list.length) { render(list); openBox(); }
      } catch(_) {}
      try { input.focus(); input.setSelectionRange(0, input.value.length); } catch(_) {}
    }
    // 현재 내용으로도 제안 열기 + 전체선택
    function __openWithCurrent() {
      const q = (input.value || '').trim();
      if (q) {
        const list = filterData(q);
        current = list;
        if (list.length) { render(list); openBox(); }
      } else {
        __showLastQueryIfEmpty();
      }
      try { input.setSelectionRange(0, input.value.length); } catch(_) {}
    }

    // 전역 "/" 핫키: 슬래시 입력 자체를 차단하고 포커스/제안만
    function __onSlashHotkey(e) {
      const isSlash = (e.key === '/' || e.code === 'Slash' || e.keyCode === 191);
      if (!isSlash) return;

      const ae = document.activeElement;
      const isOurInput = (ae === input);
      const isOtherEditable =
        !isOurInput && (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable));
      if (isOtherEditable) return; // 다른 입력 필드면 간섭 금지

      e.preventDefault();
      e.stopPropagation();

      try { input.focus(); } catch(_) {}
      if ((input.value || '').trim() === '') __showLastQueryIfEmpty();
      else __openWithCurrent();

      try { input.setSelectionRange(0, input.value.length); } catch(_) {}
    }
    window.addEventListener('keydown', __onSlashHotkey, true);

    // 입력창 클릭해도 제안 열기 + 전체 선택 (포커스 유무 상관없이)
    input.addEventListener('mousedown', function () {
      setTimeout(() => {
        __openWithCurrent();
        try { input.setSelectionRange(0, input.value.length); } catch(_) {}
      }, 0);
    });
  };
})();
