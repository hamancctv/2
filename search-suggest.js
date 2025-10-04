/* ===== 마커 클릭 → 입력창에 특수 규칙으로 텍스트 주입 (제안창은 열지 않음) ===== */

// 문자열 보정 (독립 사용)
function _gxNormalize(s){ return (s||'').toString().trim(); }

// name에서 "-문자/숫자-" 이후부터 '연속 한글' 부분만 추출
function _gxExtractAfterCodeToKorean(name){
  const src = _gxNormalize(name);
  if(!src) return '';
  // "-  (문자/숫자)+  -" 패턴 기준으로 분리
  const parts = src.split(/-\s*[A-Za-z0-9]+\s*-/);
  if (parts.length <= 1) return '';
  // 그 이후 문자열에서 선행 한글(공백 허용)만
  const after = _gxNormalize(parts.slice(1).join('-'));
  const m = after.match(/^[\uAC00-\uD7A3\s]+/);
  return _gxNormalize(m ? m[0] : after);
}

// 입력창/제안창 엘리먼트 얻기
function _gxGetSearchEls(){
  const input = document.querySelector('#mapWrapper .gx-suggest-root .gx-input') ||
                document.querySelector('.gx-suggest-root .gx-input') ||
                document.querySelector('.gx-input');
  const box   = document.querySelector('#mapWrapper .gx-suggest-box') ||
                document.querySelector('.gx-suggest-box');
  return { input, box };
}

// SEL_SUGGEST에서 가장 가까운 아이템 찾기(마커 좌표 기준)
function _gxNearestItemByLatLng(lat, lng){
  const arr = Array.isArray(window.SEL_SUGGEST) ? window.SEL_SUGGEST : [];
  let best = null, bestD = Infinity;
  for (const o of arr){
    const la = parseFloat(o.lat), ln = parseFloat(o.lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) continue;
    const dx = la - lat, dy = ln - lng;
    const d2 = dx*dx + dy*dy;
    if (d2 < bestD){ bestD = d2; best = o; }
  }
  return best;
}

// 마커 클릭 시 입력창 업데이트(제안창은 닫기)
function _gxBindMarkerClicksOnce(){
  if (!Array.isArray(window.markers) || window.markers.length === 0) return;

  const { input, box } = _gxGetSearchEls();
  if (!input) return;

  window.markers.forEach(mk => {
    if (mk.__gxClickBound) return; // 중복 방지
    mk.__gxClickBound = true;

    kakao.maps.event.addListener(mk, 'click', function(){
      // 로드뷰 모드에서는 기존 정책상 마커 클릭 무시(원하면 이 줄 제거)
      if (window.overlayOn) return;

      const p = mk.getPosition && mk.getPosition();
      if (!p) return;

      const item = _gxNearestItemByLatLng(p.getLat(), p.getLng());
      if (!item) return;

      // 규칙 추출 → 없으면 name1 → name/name2/searchName 순
      let val = _gxExtractAfterCodeToKorean(item.name);
      if (!val) val = _gxNormalize(item.name1 || item.name2 || item.name || item.searchName);

      // 값만 넣고, 제안창은 열지 않음(열려있으면 닫기)
      input.value = val || '';
      if (box && box.classList.contains('open')){
        box.classList.remove('open');
        try { input.setAttribute('aria-expanded','false'); } catch(_){}
      }
      // 포커스/선택은 요구사항에 없으니 건드리지 않음
    });
  });
}

// window.markers가 늦게 생기는 경우를 대비해 몇 번 재시도
(function _gxTryBind(i=12){
  if (Array.isArray(window.markers) && window.markers.length){
    _gxBindMarkerClicksOnce();
    return;
  }
  if (i <= 0) return;
  setTimeout(()=>_gxTryBind(i-1), 250);
})();
