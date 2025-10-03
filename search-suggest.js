/* ===== search-suggest.js (이 파일 하나로 교체) ===== */
(function () {
  function normalizeText(s) {
    return (s || '').toString().trim();
  }
  function toLowerNoSpace(s) {
    return normalizeText(s).replace(/\s+/g, '').toLowerCase();
  }

  window.initSuggestUI = function initSuggestUI(opts) {
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

    /* === 로드뷰 상태에 따라 검색 UI(검색창+제안창) 숨김/표시 === */
    const searchWrap =
      input.closest('.search-wrap') ||
      parent.querySelector('.search-wrap') ||
      null;

    function setSearchVisible(on) {
      if (!searchWrap) return;
      searchWrap.style.display = on ? '' : 'none';
      if (!on) { // 숨길 때 제안창도 정리
        box.classList.remove('open');
        box.innerHTML = '';
        input.blur();
      }
    }

    // #container의 class에 view_roadview가 붙고/빠지는 걸 감지
    (function bindRoadviewVisibility(){
      const container = document.getElementById('container');
      if (!container) return;

      // 초기 상태 반영
      setSearchVisible(!container.classList.contains('view_roadview'));

      // class 변화 감지
      if (typeof MutationObserver !== 'undefined') {
        const mo = new MutationObserver(() => {
          setSearchVisible(!container.classList.contains('view_roadview'));
        });
        mo.observe(container, { attributes: true, attributeFilter: ['class'] });
      }
    })();
    /* ===================================================== */

    // 접근성 속성
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    box.setAttribute('role', 'listbox');
    box.id = box.id || 'gx-suggest-list';
    input.setAttribute('aria-controls', box.id);

    let activeIdx = -1;
    let current = [];     // 렌더링된 항목들(데이터) 보관
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
        if (t) spans.push(`<span>${t}</span>`);
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

    function escapeHTML(s) {
      return s.replace(/[&<>"']/g, m => ({
        '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
      }[m]));
    }

    function render(list) {
      box.innerHTML = list.map(makeItemHTML).join('');
      box.querySelectorAll('.gx-suggest-item').forEach((el, idx) => {
        el.addEventListener('mouseenter', () => setActive(idx));
        el.addEventListener('mouseleave', () => setActive(-1));
        el.addEventListener('mousedown', (e) => { e.preventDefault(); });
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
      if (current.length === 0) { closeBox(); box.innerHTML=''; return; }
      render(current);
      openBox();
    });

    // 포커스 시 열기(글자 있을 때만)
    input.addEventListener('focus', () => {
      if (!openOnFocus) return;
      const q = input.value || '';
      if (q.trim() === '') return;
      current = filterData(q);
      if (current.length > 0) {
        render(current);
        openBox();
      }
    });

    // 키보드 내비게이션
    input.addEventListener('keydown', (e) => {
      const list = items();
      const open = box.classList.contains('open') && list.length > 0;
      if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const q = input.value || '';
        if (q.trim() !== '') {
          current = filterData(q);
          if (current.length > 0) {
            render(current);
            openBox();
          }
        }
      }
      if (e.key === 'ArrowDown' && box.classList.contains('open')) {
        e.preventDefault();
        moveActive(1);
      } else if (e.key === 'ArrowUp' && box.classList.contains('open')) {
        e.preventDefault();
        moveActive(-1);
      } else if (e.key === 'Enter' && chooseOnEnter && box.classList.contains('open')) {
        if (activeIdx > -1) {
          e.preventDefault();
          pick(activeIdx);
        }
      } else if (e.key === 'Escape') {
        closeBox();
      } else if (e.key === 'Home' && box.classList.contains('open')) {
        e.preventDefault();
        setActive(0);
      } else if (e.key === 'End' && box.classList.contains('open')) {
        e.preventDefault();
        setActive(list.length - 1);
      }
    });

    // 바깥 클릭 시 닫기
    document.addEventListener('mousedown', (e) => {
      if (!box.classList.contains('open')) return;
      if (e.target === input || box.contains(e.target)) return;
      closeBox();
    });

    // 스크롤/리사이즈 등 상황에서 안전하게 닫기
    window.addEventListener('resize', closeBox);
  };
})();
