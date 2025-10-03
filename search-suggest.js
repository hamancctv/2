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
        // 스크롤 가시화
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
        // ip: 같은 prefix 제거 + 공백만 구분(점 X)
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
      // 이벤트 위임
      box.querySelectorAll('.gx-suggest-item').forEach((el, idx) => {
        el.addEventListener('mouseenter', () => setActive(idx));
        el.addEventListener('mouseleave', () => setActive(-1));
        el.addEventListener('mousedown', (e) => {
          // focusout 되기 전에 pick 실행되도록
          e.preventDefault();
        });
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

      // 입력창에 제목 반영
      const t = titleOf(o);
      if (t) input.value = t;

      // 지도 이동(좌표 있으면)
      const lat = parseFloat(o.lat || (o.latlng && o.latlng.getLat && o.latlng.getLat()));
      const lng = parseFloat(o.lng || (o.latlng && o.latlng.getLng && o.latlng.getLng()));
      if (isFinite(lat) && isFinite(lng) && map) {
        const ll = new kakao.maps.LatLng(lat, lng);
        try { map.setLevel(3); } catch(_) {}
        try { map.panTo(ll); } catch(_) {}
        // 기존 마커 제어 훅(있으면)
        if (typeof getMarkers === 'function') {
          // 선택된 포지션에 펄스 오버레이/점프 등은 기존 handlers에서 처리
          // 여기서는 선택만 트리거
          // 필요하면 커스텀 이벤트 발행
          try {
            const ev = new CustomEvent('suggest:pick', { detail: o });
            document.dispatchEvent(ev);
          } catch(_) {}
        }
      }

      closeBox();
      input.blur(); // 모바일에서 키보드 내리는 용도
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
      if (q.trim() === '') return; // “처음엔 아무것도 안 나오게”
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
      // ↓/↑/Enter/Esc/Home/End
      if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        // 닫혀있는데 ↓를 누르면 열어주기
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

    // 스크롤/리사이즈 등 상황에서 안전하게 닫기(선택)
    window.addEventListener('resize', closeBox);
  };
})();
