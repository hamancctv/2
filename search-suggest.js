/* ===== search-suggest.js (DOM + CSS 자동 생성 통합 버전) ===== */
(function () {
  /* ---------- 유틸 ---------- */
  function normalizeText(s) { return (s || '').toString().trim(); }
  function toLowerNoSpace(s) { return normalizeText(s).replace(/\s+/g, '').toLowerCase(); }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  /* ---------- 스타일 주입(중복 방지) ---------- */
  function injectCSS() {
    if (document.getElementById('gx-suggest-style')) return;
    const css = `
/* ====== 검색 UI 루트 (mapWrapper 기준 절대배치) ====== */
.gx-suggest-root{
  position:absolute; top:12px; left:50%; transform:translateX(-50%);
  width:min(520px,90vw); z-index:600;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans KR",Arial,"Apple SD Gothic Neo","Malgun Gothic","맑은 고딕",sans-serif;
}
.gx-suggest-search,
.gx-suggest-box {
  /* ✅ 드래그/핀치 차단 */
  touch-action: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}
.gx-suggest-search .gx-input {
  /* ✅ 입력창은 키보드 동작 가능 */
  touch-action: auto;
}

/* ====== 검색바 ====== */
.gx-suggest-search{ display:flex; align-items:center; gap:8px; }
.gx-suggest-search .gx-input{
  flex:1; height:42px; padding:0 14px; border:1px solid #ccc; border-radius:12px; outline:none;
  background:#fff; font-size:15px; box-sizing:border-box;
  transition:border .2s ease, box-shadow .2s ease;
}
.gx-suggest-search .gx-input:focus{
  border-color:#4a90e2; box-shadow:0 0 0 2px rgba(74,144,226,0.2);
}
.gx-suggest-search .gx-btn{ display:none; }

/* ====== 제안창 ====== */
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

/* ====== 로드뷰 중일 때 자동 숨김 ====== */
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
      const input = root.querySelector('.gx-input');
      const box   = root.querySelector('.gx-suggest-box');
      return { root, input, box };
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

    /* ✅ JS 보강: 핀치줌/제스처 차단 */
    [input, box].forEach(el => {
      el.addEventListener('touchstart', e => {
        if (e.touches.length > 1) e.preventDefault(); // 핀치줌 방지
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
      hideOnRoadview = true,
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

    let activeIdx = -1;
    let current = [];
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
    function moveActive(delta) {
      const list = items();
      if (list.length === 0) return;
      const next = (activeIdx + delta + list.length) % list.length;
      setActive(next);
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
      return normalizeText(o.name2 || o.name || o.name1 || o.searchName || '');
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
        el.addEventListener('mousedown', (e) => e.preventDefault());
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

    function pick(idx) {
      if (idx < 0 || idx >= current.length) return;
      const o = current[idx];
      const t = titleOf(o);
      if (t) input.value = t;

      const lat = parseFloat(o.lat || (o.latlng && o.latlng.getLat && o.latlng.getLat()));
      const lng = parseFloat(o.lng || (o.latlng && o.latlng.getLng && o.latlng.getLng()));
      if (isFinite(lat) && isFinite(lng) && map) {
        const ll = new kakao.maps.LatLng(lat, lng);
        try { map.setLevel(3); } catch(_) {}
        try { map.panTo(ll); } catch(_) {}
        if (typeof getMarkers === 'function') {
          try { document.dispatchEvent(new CustomEvent('suggest:pick', { detail: o })); } catch(_) {}
        }
      }
      closeBox();
      input.blur();
    }

    // 입력 이벤트
    let last = '';
    input.addEventListener('input', () => {
      const q = input.value || '';
      if (q.trim() === '') { closeBox(); box.innerHTML=''; last = ''; return; }
      if (q === last && box.classList.contains('open')) return;
      last = q;
      const list = filterData(q);
      current = list;
      if (list.length === 0) { closeBox(); box.innerHTML=''; return; }
      render(list); openBox();
    });

    // 포커스 시 열기
    input.addEventListener('focus', () => {
      if (!openOnFocus) return;
      const q = input.value || '';
      if (q.trim() === '') return;
      const list = filterData(q);
      current = list;
      if (list.length > 0) { render(list); openBox(); }
    });

    // 키보드 내비게이션
    input.addEventListener('keydown', (e) => {
      const list = items();
      const open = box.classList.contains('open') && list.length > 0;
      if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const q = input.value || '';
        if (q.trim() !== '') {
          const l = filterData(q);
          current = l;
          if (l.length > 0) { render(l); openBox(); }
        }
      }
      if (e.key === 'ArrowDown' && open) { e.preventDefault(); moveActive(1); }
      else if (e.key === 'ArrowUp' && open) { e.preventDefault(); moveActive(-1); }
      else if (e.key === 'Enter' && open && chooseOnEnter) {
        if (list.length && document.activeElement === input) {
          e.preventDefault();
          const idx = list.findIndex(el => el.classList.contains('active'));
          if (idx > -1) pick(idx);
        }
      } else if (e.key === 'Escape') {
        closeBox();
      } else if (e.key === 'Home' && open) {
        e.preventDefault(); setActive(0);
      } else if (e.key === 'End' && open) {
        e.preventDefault(); setActive(list.length - 1);
      }
    });

    // 바깥 클릭으로 닫기
    document.addEventListener('mousedown', (e) => {
      if (!box.classList.contains('open')) return;
      if (e.target === input || box.contains(e.target)) return;
      closeBox();
    });

    // 리사이즈 시 닫기
    window.addEventListener('resize', closeBox);

    /* ----- 지도 이벤트: 클릭 / 드래그 ----- */
    if (map) {
      kakao.maps.event.addListener(map, 'click', () => { input.blur(); closeBox(); });
      kakao.maps.event.addListener(map, 'dragstart', () => { input.blur(); });
      kakao.maps.event.addListener(map, 'drag',      () => { input.blur(); });
      kakao.maps.event.addListener(map, 'dragend',   () => { input.blur(); });
    }

    /* ----- 제안창 스크롤/드래그 시 입력창 blur만 ----- */
    box.addEventListener('touchstart', () => { input.blur(); }, { passive:true });
    box.addEventListener('scroll',     () => { input.blur(); }, { passive:true });

    /* ----- 로드뷰 활성화 시 자동 숨김 ----- */
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
