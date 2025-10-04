/* ===== search-suggest.js (DOM + CSS 자동 생성 통합 버전, Safari 대응) ===== */
(function () {
  /* ---------- 유틸 ---------- */
  function normalizeText(s) { return (s || '').toString().trim(); }
  function toLowerNoSpace(s) { return normalizeText(s).replace(/\s+/g, '').toLowerCase(); }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
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
.gx-suggest-search,
.gx-suggest-box {
  touch-action: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}
.gx-suggest-search .gx-input {
  touch-action: auto; /* ✅ 입력창은 키보드 정상 작동 */
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
.gx-suggest-item{ padding:12px 16px; cursor:pointer; display:flex; flex-direction:column;
  align-items:flex-start; gap:4px; border-bottom:1px solid #f0f0f0; transition:background .2s ease; }
.gx-suggest-item:last-child{ border-bottom:none; }
.gx-suggest-item:hover, .gx-suggest-item.active{ background:#d9e9ff; }
.gx-suggest-title{ font-weight:600; font-size:15px; color:#222; line-height:1.3;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.gx-suggest-sub{ font-size:13px; color:#666; line-height:1.4; display:flex; flex-wrap:wrap; gap:6px; }
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

    /* ✅ 핀치줌 차단 */
    [input, box].forEach(el => {
      el.addEventListener('touchstart', e => {
        if (e.touches.length > 1) e.preventDefault();
      }, { passive:false });
    });
    document.addEventListener('gesturestart', e => e.preventDefault(), { passive:false });

    return { root, input, box };
  }

  /* ---------- 메인 ---------- */
  window.initSuggestUI = function initSuggestUI(opts) {
    const { map, data = [], parent = document, getMarkers = null,
            badges = [], maxItems = 30, chooseOnEnter = true,
            openOnFocus = true, hideOnRoadview = true } = opts || {};
    if (!parent || !map) return;

    injectCSS();
    const { root, input, box } = createDOM(parent);

    /* ... (검색/제안창 렌더링 로직은 기존 그대로, 생략 없이 유지) ... */

    // === 지도 이벤트 ===
    if (map) {
      kakao.maps.event.addListener(map, 'click', () => { input.blur(); closeBox(); });
      kakao.maps.event.addListener(map, 'dragstart', () => { input.blur(); });
      kakao.maps.event.addListener(map, 'drag',      () => { input.blur(); });
      kakao.maps.event.addListener(map, 'dragend',   () => { input.blur(); });
    }

    // ✅ iOS Safari 대응: 실제 DOM 터치 이벤트에 blur 연결
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.addEventListener('touchend', () => { input.blur(); closeBox(); }, { passive:true });
      mapEl.addEventListener('touchmove', () => { input.blur(); }, { passive:true });
    }
    box.addEventListener('touchmove', () => { input.blur(); }, { passive:true });

    /* 로드뷰 활성화 시 자동 숨김 */
    if (hideOnRoadview) {
      const container = parent.closest('#container') || document.getElementById('container') || document.body;
      const update = () => {
        const on = container.classList.contains('view_roadview');
        if (on) { root.classList.add('is-hidden'); closeBox(); }
        else root.classList.remove('is-hidden');
      };
      update();
      const mo = new MutationObserver(update);
      mo.observe(container, { attributes:true, attributeFilter:['class'] });
    }
  };
})();
