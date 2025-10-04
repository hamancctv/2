/* ===== search-suggest.js (이 파일 하나로 교체) ===== */
(function () {
  /* ---------- CSS 한 번만 주입 ---------- */
  function injectStylesOnce() {
    if (document.getElementById('gx-suggest-style')) return;
    const css = `
/* 컨테이너(검색창은 오빠 HTML의 .search-wrap 그대로 사용) */
.gx-input { outline: none; }

/* 제안 박스 */
.gx-suggest-box{
  position:absolute; top:52px; left:50%;
  transform:translateX(-50%) translateY(-8px);
  width:min(520px,90vw); max-height:45vh; overflow:auto; -webkit-overflow-scrolling:touch;
  background:#fff; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.15);
  z-index:610; opacity:0; pointer-events:none;
  transition:opacity .25s ease, transform .25s ease;
}
.gx-suggest-box.open{ opacity:1; pointer-events:auto; transform:translateX(-50%) translateY(0); }

/* 제안 아이템 */
.gx-suggest-item{
  padding:12px 16px; cursor:pointer; display:flex; flex-direction:column; gap:6px;
  border-bottom:1px solid #f0f0f0; transition:background .18s ease;
}
.gx-suggest-item:last-child{ border-bottom:none; }
.gx-suggest-item:hover, .gx-suggest-item.active{ background:#eaf2ff; }

/* 타이틀/서브 */
.gx-suggest-title{ font-weight:600; font-size:15px; color:#222; line-height:1.34; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.gx-suggest-sub{ font-size:12.5px; color:#666; line-height:1.34; display:flex; flex-wrap:wrap; gap:6px; min-height:18px; }
.gx-suggest-sub span{ white-space:nowrap; }

/* 키워드 하이라이트 */
.gx-hl{ background:#fff3bf; padding:0 .06em; border-radius:3px; }

/* 스크롤바(옵션) */
.gx-suggest-box::-webkit-scrollbar{ width:10px; }
.gx-suggest-box::-webkit-scrollbar-thumb{ background:#d0d0d0; border-radius:8px; border:2px solid #fff; }
.gx-suggest-box::-webkit-scrollbar-track{ background:transparent; }
    `.trim();
    const style = document.createElement('style');
    style.id = 'gx-suggest-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---------- 유틸 ---------- */
  function normalizeText(s) {
    return (s || '').toString().trim();
  }
  function toLowerNoSpace(s) {
    return normalizeText(s).replace(/\s+/g, '').toLowerCase();
  }
  function escapeHTML(s) {
    return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function escReg(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function highlight(title, q){
    const t = normalizeText(title);
    const raw = normalizeText(q);
    if (!t || !raw) return escapeHTML(t);
    const words = raw.split(/\s+/).filter(w => w.length >= 2);
    if (!words.length) return escapeHTML(t);
    let html = escapeHTML(t);
    for (const w of words) {
      const re = new RegExp(`(${escReg(w)})`, 'ig');
      html = html.replace(re, '<span class="gx-hl">$1</span>');
    }
    return html;
  }

  /* ---------- 본체 ---------- */
  window.initSuggestUI = function initSuggestUI(opts) {
    injectStylesOnce();

    const {
      map,
      data = [],
      parent = document,
      getMarkers = null,
      badges = [],
      maxItems = 30,
      chooseOnEnter = true,
      openOnFocus = true
    } = opts || {};

    const input = parent.querySelector('.gx-input');
    const box   = parent.querySelector('.gx-suggest-box');
    if (!input || !box) return;

    // 접근성
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    box.setAttribute('role', 'listbox');
    box.id = box.id || 'gx-suggest-list';
    input.setAttribute('aria-controls', box.id);

    let activeIdx = -1;
    let current = []; // 렌더 데이터 보관
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
      if (!list.length) return;
      const next = (activeIdx + delta + list.length) % list.length;
      setActive(next);
    }

    function badgeLine(obj) {
      if (!badges || !badges.length) return '';
      const spans = [];
      for (const key of badges) {
        const raw = obj && obj[key];
        if (!raw) continue;
        const t = normalizeText(String(raw).replace(/^ip\s*:\s*/i, ''));
        if (t) spans.push(`<span>${escapeHTML(t)}</span>`);
      }
      return spans.length ? `<div class="gx-suggest-sub">${spans.join(' ')}</div>` : '';
    }

    function titleOf(o) {
      return normalizeText(o.name2 || o.name || o.name1 || o.searchName || '');
    }

    function makeItemHTML(o, q) {
      const title = titleOf(o);
      const sub = badgeLine(o);
      return `
        <div class="gx-suggest-item" role="option" aria-selected="false">
          <div class="gx-suggest-title">${highlight(title, q)}</div>
          ${sub}
        </div>
      `;
    }

    function render(list, q) {
      box.innerHTML = list.map(o => makeItemHTML(o, q)).join('');
      box.querySelectorAll('.gx-suggest-item').forEach((el, idx) => {
        el.addEventListener('mouseenter', () => setActive(idx));
        el.addEventListener('mouseleave', () => setActive(-1));
        el.addEventListener('mousedown', (e) => e.preventDefault()); // pick 이전 blur 방지
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

      // 입력 반영
      const t = titleOf(o);
      if (t) input.value = t;

      // 지도 이동
      const lat = parseFloat(o.lat || (o.latlng && o.latlng.getLat && o.latlng.getLat()));
      const lng = parseFloat(o.lng || (o.latlng && o.latlng.getLng && o.latlng.getLng()));
      if (isFinite(lat) && isFinite(lng) && map) {
        const ll = new kakao.maps.LatLng(lat, lng);
        try { map.setLevel(3); } catch(_) {}
        try { map.panTo(ll); } catch(_) {}
        if (typeof getMarkers === 'function') {
          try {
            const ev = new CustomEvent('suggest:pick', { detail: o });
            document.dispatchEvent(ev);
          } catch(_) {}
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
      current = filterData(q);
      if (!current.length) { closeBox(); box.innerHTML=''; return; }
      render(current, q);
      openBox();
    });

    // 포커스 시 열기
    input.addEventListener('focus', () => {
      if (!openOnFocus) return;
      const q = input.value || '';
      if (q.trim() === '') return;
      current = filterData(q);
      if (current.length > 0) { render(current, q); openBox(); }
    });

    // 키보드 내비
    input.addEventListener('keydown', (e) => {
      const list = items();
      const open = box.classList.contains('open') && list.length > 0;

      if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const q = input.value || '';
        if (q.trim() !== '') {
          current = filterData(q);
          if (current.length > 0) { render(current, q); openBox(); }
        }
      }
      if (e.key === 'ArrowDown' && open) { e.preventDefault(); moveActive(1); }
      else if (e.key === 'ArrowUp' && open) { e.preventDefault(); moveActive(-1); }
      else if (e.key === 'Enter' && chooseOnEnter && open) {
        if (activeIdx > -1) { e.preventDefault(); pick(activeIdx); }
      } else if (e.key === 'Escape') {
        closeBox();
      } else if (e.key === 'Home' && open) {
        e.preventDefault(); setActive(0);
      } else if (e.key === 'End' && open) {
        e.preventDefault(); setActive(list.length - 1);
      }
    });

    // 바깥 클릭 시 닫기
    document.addEventListener('mousedown', (e) => {
      if (!box.classList.contains('open')) return;
      if (e.target === input || box.contains(e.target)) return;
      closeBox();
    });

    // 리사이즈 시 닫기(선택)
    window.addEventListener('resize', closeBox);
  };
})();
