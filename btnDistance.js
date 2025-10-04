// btnDistance.js (툴바 정렬 + 토글 표시 + 기존 로직 유지)
(function () {
  // DOM 준비
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(function(){
    console.log("[btnDistance] loaded");

    const toolbar = document.querySelector('.toolbar');
    if(!toolbar){
      console.log("[btnDistance] .toolbar not found");
      return;
    }

    // 버튼 확보/생성
    let btn = document.getElementById("btnDistance");
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btnDistance';
      btn.type = 'button';
      btn.title = '거리재기';
      // 아이콘이 필요하면 SVG나 글자 넣어도 됨: btn.innerHTML = '🔎';
    }

    // 툴바에 정확히 붙이고, 겹침 방지 스타일 초기화
    btn.classList.add('btn-satellite'); // 40x40, 테두리/호버 동일
    btn.style.position = 'static';
    btn.style.margin = '0';
    btn.style.left = '';
    btn.style.top = '';

    // 로드뷰 버튼(#roadviewControl) 바로 아래(다음)로 배치 → 세 버튼 일렬
    const rvBtn = toolbar.querySelector('#roadviewControl');
    if (rvBtn && rvBtn.nextSibling) toolbar.insertBefore(btn, rvBtn.nextSibling);
    else toolbar.appendChild(btn);

    // 중복 바인딩 방지
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';

    // ====== 측정 로직 (기존 유지) ======
    let drawing = false;
    let clickLine = null;
    let moveLine = null;
    let lastPoint = null;
    let segOverlay = null;
    let totalOverlay = null;
    let segCount = 0;

    btn.addEventListener('click', toggleMeasure);

    function toggleMeasure() {
      drawing = !drawing;
      if (drawing) {
        resetMeasure();
        // 시각적 토글: 기존 코드의 active + 툴바 스타일(selected) 둘 다
        btn.classList.add('active', 'selected');
        try { map.setCursor && map.setCursor('crosshair'); } catch(_) {}
        kakao.maps.event.addListener(map, 'click', onMapClick);
      } else {
        kakao.maps.event.removeListener(map, 'click', onMapClick);
        btn.classList.remove('active', 'selected');
        try { map.setCursor && map.setCursor(''); } catch(_) {}
        resetMeasure();
      }
    }

    function onMapClick(mouseEvent) {
      if (!drawing) return;
      const pos = mouseEvent.latLng;

      if (!clickLine) {
        // 첫 점
        clickLine = new kakao.maps.Polyline({
          map: map,
          path: [pos],
          strokeWeight: 3,
          strokeColor: '#db4040',
          strokeOpacity: 1,
          strokeStyle: 'solid'
        });
        lastPoint = pos;
        segCount = 0;
      } else {
        // 선 이어서 추가
        const path = clickLine.getPath();
        path.push(pos);
        clickLine.setPath(path);

        showSegmentDistance(lastPoint, pos);
        lastPoint = pos;
      }
    }

    function showSegmentDistance(from, to) {
      const poly = new kakao.maps.Polyline({ path: [from, to] });
      const dist = Math.round(poly.getLength());

      segCount++;
      const content = `<div class="dotOverlay">구간 ${segCount}: ${dist}m</div>`;

      segOverlay = new kakao.maps.CustomOverlay({
        position: to,
        content: content,
        yAnchor: 1
      });
      segOverlay.setMap(map);

      // 총 거리 표시
      const totalDist = Math.round(clickLine.getLength());
      const totalContent = `<div class="totalBox">총 거리: ${totalDist}m</div>`;

      if (totalOverlay) totalOverlay.setMap(null);
      totalOverlay = new kakao.maps.CustomOverlay({
        position: to,
        content: totalContent,
        yAnchor: 1
      });
      totalOverlay.setMap(map);
    }

    function resetMeasure() {
      if (clickLine) { clickLine.setMap(null); clickLine = null; }
      if (moveLine) { moveLine.setMap(null); moveLine = null; }
      if (segOverlay) { segOverlay.setMap(null); segOverlay = null; }
      if (totalOverlay) { totalOverlay.setMap(null); totalOverlay = null; }
      lastPoint = null;
      segCount = 0;
    }
  });
})();
