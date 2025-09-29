<!-- sel_suggest.js 다음에 로드하세요 -->
<script>
/** =========================
 *  검색 UI (자동완성 드롭다운)
 *  - SEL_SUGGEST: [{name, encloser, addr, lat, lng, ip, line}, ...]
 *  - 한글 초성 매칭(순서 유지), 숫자/영문도 지원
 *  - Enter 누르면 1번 제안 선택
 *  - 공개 API: window.searchSuggest.setQuery(text)
 * ========================= */

(function(){
  // CSS 주입
  const css = `
  .search-container{position:relative}
  #suggest-box{
    position:absolute; top:44px; left:0; right:0;
    max-height:0; overflow:hidden;
    border:1px solid #ccc; border-radius:10px;
    background:rgba(255,255,255,.96);
    box-shadow:0 8px 20px rgba(0,0,0,.15);
    z-index:610; opacity:0; transform:translateY(-6px);
    transition:max-height .22s ease, opacity .18s ease, transform .18s ease;
    will-change:max-height, opacity, transform;
    display:block;
  }
  #suggest-box.open { max-height:320px; opacity:1; transform:translateY(0); }
  #suggest-box .suggest-item{padding:10px 12px; cursor:pointer; display:flex; flex-wrap:wrap; gap:8px; align-items:center}
  #suggest-box .title{font-weight:600}
  #suggest-box .badge{font-size:12px; color:#555; background:#eef1f7; padding:2px 6px; border-radius:6px}
  #suggest-box .suggest-item:hover, #suggest-box .suggest-item.active{background:#eef3ff}
  #suggest-box .empty{color:#777; padding:12px}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // DOM 핸들
  const kw = document.getElementById('keyword');
  if (!kw) return; // 검색창 없으면 종료

  let box = document.getElementById('suggest-box');
  if (!box) { // 없으면 만들어서 검색창 오른쪽 버튼 앞(또는 컨테이너 안) 넣기
    box = document.createElement('div');
    box.id = 'suggest-box';
    const container = kw.closest('.search-container') || document.body;
    container.appendChild(box);
  }

  // 초성 테이블
  const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const CHO_SET = new Set(CHO);

  // 한글→초성, 숫자/영문 유지, 기호/공백 제거
  function buildKey(str){
    let out=""; for (const ch of (str||"")){
      const c = ch.charCodeAt(0);
      if (c>=0xAC00 && c<=0xD7A3) out += CHO[Math.floor((c-0xAC00)/588)];
      else if (CHO_SET.has(ch)) out += ch;                 // 자음 단독
      else if (c>=48&&c<=57) out += ch;                    // 0-9
      else if (c>=65&&c<=90) out += ch;                    // A-Z
      else if (c>=97&&c<=122) out += ch.toUpperCase();     // a-z→A-Z
    }
    return out;
  }

  // 데이터 준비
  const RAW = Array.isArray(window.SEL_SUGGEST) ? window.SEL_SUGGEST : [];
  const DATA = RAW.map((it, idx) => ({
    idx,
    name: it.name || "",
    encloser: it.encloser || "",
    ip: it.ip || "",
    // addr/lat/lng는 보관만 하고 UI에 표시 X
    addr: it.addr || "",
    lat: parseFloat(it.lat),
    lng: parseFloat(it.lng),
    key: buildKey(it.name || "")
  })).filter(d => isFinite(d.lat) && isFinite(d.lng));

  // 매칭: 순서 유지(연속 부분문자열)
  function matchQuery(q){
    const k = buildKey(q);
    if (!k) return [];
    const out = [];
    for (const it of DATA){
      if (it.key.indexOf(k) !== -1) out.push(it); // "ㅅㅂ"→"소방서" OK, "보건소" NO
      if (out.length >= 2000) break;
    }
    return out;
  }

  function render(items){
    box.innerHTML = "";
    if (!items.length){
      const div = document.createElement('div'); div.className = "empty";
      div.textContent = "검색 결과 없음";
      box.appendChild(div);
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach((it, i) => {
      const el = document.createElement('div'); el.className = "suggest-item"; el.dataset.idx = i;
      // name + (선택적) encloser, ip 배지 — addr/lat/lng는 표시 안 함
      el.innerHTML =
        `<span class="title">${it.name}</span>` +
        (it.encloser ? ` <span class="badge">${it.encloser}</span>` : "") +
        (it.ip ? ` <span class="badge">${it.ip}</span>` : "");
      el.addEventListener('mousedown', e => { e.preventDefault(); applySelection(it); });
      frag.appendChild(el);
    });
    box.appendChild(frag);
  }

  // 스크롤에서 활성 항목 보이기
  let active = -1;
  function setActive(i){
    const items = box.querySelectorAll('.suggest-item');
    items.forEach((el, idx) => el.classList.toggle('active', idx === i));
    active = i;
    if (i>=0 && items[i]){
      const el = items[i];
      const elTop = el.offsetTop, elBottom = elTop + el.offsetHeight;
      const viewTop = box.scrollTop, viewBottom = viewTop + box.clientHeight;
      if (elTop < viewTop) box.scrollTo({ top: elTop, behavior: "smooth" });
      else if (elBottom > viewBottom) box.scrollTo({ top: elBottom - box.clientHeight, behavior: "smooth" });
    }
  }
  const openBox = () => box.classList.add('open');
  const closeBox = () => { box.classList.remove('open'); setActive(-1); box.scrollTop = 0; };

  // 선택 적용: 마커 찾아 클릭 트리거
  function applySelection(item){
    kw.value = item.name;
    const m = (window.markers || []).find(mm => {
      const p = mm.getPosition();
      return Math.abs(p.getLat() - item.lat) < 1e-9 && Math.abs(p.getLng() - item.lng) < 1e-9;
    });
    if (m && window.kakao && window.kakao.maps){
      kakao.maps.event.trigger(m, 'mousedown');
      setTimeout(() => kakao.maps.event.trigger(m, 'mouseup'), 0);
      if (window.map) window.map.panTo(m.getPosition());
    } else if (window.map) {
      window.map.panTo(new kakao.maps.LatLng(item.lat, item.lng));
    }
    closeBox();
    gateFirstCho = true; // 다음 입력에서 첫 초성 1글자 게이트 재활성화
  }

  // 입력 처리: 첫 초성 1글자면 열지 않음
  const CHO_ONLY = (s) => s.length === 1 && CHO_SET.has(s);
  let rafId = null, prevVal = "", gateFirstCho = true;

  function schedule(q){
    if (gateFirstCho && prevVal==="" && CHO_ONLY(q)){ prevVal = q; closeBox(); return; }
    prevVal = q;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const items = matchQuery(q);
      if (!items.length) { closeBox(); return; }
      render(items); openBox(); setActive(-1);
    });
  }

  // IME 조합 중에도 업데이트
  kw.addEventListener('compositionupdate', () => schedule(kw.value));
  kw.addEventListener('input', e => {
    if (e.target.value.length >= 2) gateFirstCho = false;
    schedule(e.target.value);
  });

  // 키 조작
  kw.addEventListener('keydown', e => {
    const opened = box.classList.contains('open');
    if (opened){
      const items = box.querySelectorAll('.suggest-item');
      if (e.key === 'ArrowDown'){ e.preventDefault(); setActive(active < items.length - 1 ? active + 1 : 0); }
      else if (e.key === 'ArrowUp'){ e.preventDefault(); setActive(active > 0 ? active - 1 : items.length - 1); }
      else if (e.key === 'Enter'){
        e.preventDefault();
        const list = matchQuery(kw.value || "");
        if (list.length){
          const pick = (active>=0 && active<list.length) ? list[active] : list[0];
          applySelection(pick);
        } else closeBox();
      } else if (e.key === 'Escape'){ closeBox(); }
    } else if (e.key === 'Enter'){
      e.preventDefault();
      const list = matchQuery(kw.value || "");
      if (list.length) applySelection(list[0]);
    }
  });

  kw.addEventListener('focus', () => { if (kw.value) schedule(kw.value); });
  kw.addEventListener('blur',  () => setTimeout(closeBox, 120));

  // 외부에서 제어할 공개 API
  window.searchSuggest = {
    setQuery(text, open = true){
      kw.value = text || "";
      gateFirstCho = false;    // 프로그램 주입 시 바로 열리게
      schedule(kw.value);
    },
    close(){ closeBox(); },
    selectByIndex(i=0){
      const list = matchQuery(kw.value || "");
      if (list.length) applySelection(list[Math.max(0, Math.min(i, list.length-1))]);
    }
  };
})();
</script>
