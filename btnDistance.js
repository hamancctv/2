<!-- ====================== 거리 재기 버튼(JS만 수정) ====================== -->
<script>
/*
  btnDistance.js — 고정형 버튼(top:60px, 화면 고정) + 분기점/세그먼트/총거리 오버레이
  - 버튼: position:fixed 로 바꿨습니다(로드뷰/미니맵에서도 항상 보임)
  - 나머지 기능 동일
*/
(function () {
  // ----- 스타일 1회 주입 -----
  if (!document.getElementById('btnDistance-style')) {
    const st = document.createElement('style');
    st.id = 'btnDistance-style';
    st.textContent = `
      /* 버튼(40x40) 화면 고정 */
      #btnDistance {
        position:fixed; top:58px; left:10px;       /* ← 고정형으로 변경 */
        width:40px; height:40px;
        display:inline-flex; align-items:center; justify-content:center;
        border:1px solid #ccc; border-radius:8px; background:#fff; color:#555;
        cursor:pointer; transition:all .2s ease; box-sizing:border-box;
        z-index:1200; margin:0;                    /* z-index 크게 */
      }
      #btnDistance:hover { box-shadow:0 3px 12px rgba(0,0,0,.12); }
      #btnDistance.active {
        border-color:#e53935;
        box-shadow:0 0 0 2px rgba(229,57,53,.15) inset;
        color:#e53935;
      }
      /* 버튼 내부 아이콘: 굵고 긴 직사각형(활성 시 빨간 배경/테두리) */
      #btnDistance .km-rect {
        width:26px; height:12px; border-radius:5px;
        border:2px solid currentColor;
        background: currentColor;
      }
      #btnDistance:not(.active) .km-rect {
        background: transparent;
      }

      /* 점(흰 원 + 빨간 테두리) */
      .km-dot {
        width: 12px; height: 12px;
        border: 2px solid #e53935;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 0 1px rgba(0,0,0,.06);
      }

      /* 세그먼트 라벨: 점 '위'로 8px 띄우기 */
      .km-seg {
        background:#fff;
        color:#e53935;
        border:1px solid #e53935;
        border-radius:8px;
        padding:2px 6px;
        font-size:12px;
        font-weight:600;
        white-space:nowrap;
        box-shadow:0 2px 6px rgba(0,0,0,.12);
        transform: translateY(-8px);   /* 위로 8px */
        pointer-events: none;
      }

      /* 총거리 박스: 마지막 점 '오른쪽 대각선 아래'로 8px 이동 */
      .km-total-box {
        background: #ffeb3b;
        color: #222;
        border: 1px solid #e0c200;
        border-radius: 10px;
        padding: 6px 10px;
        font-size: 13px; font-weight: 700;
        box-shadow: 0 2px 8px rgba(0,0,0,.15);
        transform: translate(8px, 8px); /* ↘ 8px */
        pointer-events: none;
      }
    `;
    document.head.appendChild(st);
  }

  // ----- 버튼 준비(이제 body에 고정 장착) -----
  (function ensureButton() {
    const mount = document.body;   // ← 고정형이므로 body에 부착
    let btn = document.getElementById('btnDistance');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btnDistance';
      btn.type = 'button';
      btn.title = '거리 재기';
      btn.setAttribute('aria-pressed','false');
      btn.innerHTML = '<span class="km-rect" aria-hidden="true"></span>';
      mount.appendChild(btn);
    } else if (btn.parentElement !== mount) {
      mount.appendChild(btn);
    }
  })();

  const btn = document.getElementById('btnDistance');

  // ----- 내부 상태 -----
  let drawing = false;
  let clickLine = null;          // 확정 경로 polyline
  let dots = [];                 // 분기점 점(CustomOverlay)
  let segOverlays = [];          // 세그먼트 라벨(CustomOverlay)
  let totalOverlay = null;       // 총거리 라벨(CustomOverlay)
  const mapExists = () => (typeof window !== "undefined" && window.map && window.kakao && kakao.maps);

  const fmt = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // ----- 도트 추가 -----
  function addDot(position) {
    const el = document.createElement('div');
    el.className = 'km-dot';
    const dot = new kakao.maps.CustomOverlay({
      position,
      content: el,
      xAnchor: 0.5,
      yAnchor: 0.5,
      zIndex: 5000
    });
    dot.setMap(map);
    dots.push(dot);
  }

  // ----- 세그먼트 라벨 추가 (거리만 표시) -----
  function addSegmentBox(position, meters) {
    const el = document.createElement('div');
    el.className = 'km-seg';
    el.textContent = meters >= 1000 ? `${(meters/1000).toFixed(2)} km` : `${fmt(meters)} m`;

    const seg = new kakao.maps.CustomOverlay({
      position,
      content: el,
      yAnchor: 1,
      zIndex: 5200
    });
    seg.setMap(map);
    segOverlays.push(seg);
  }

  // ----- 총거리 라벨(마지막 점 기준 ↘8px) -----
  function showTotalAt(position, totalMeters) {
    if (totalOverlay) { try { totalOverlay.setMap(null); } catch(_) {} totalOverlay = null; }

    const el = document.createElement('div');
    el.className = 'km-total-box';
    el.textContent = totalMeters >= 1000 ? `총 거리: ${(totalMeters/1000).toFixed(2)} km`
                                         : `총 거리: ${fmt(totalMeters)} m`;

    totalOverlay = new kakao.maps.CustomOverlay({
      position,
      content: el,
      xAnchor: 0,  // 좌상단 기준
      yAnchor: 0,
      zIndex: 5300
    });
    totalOverlay.setMap(map);
  }

  // ----- 초기화 -----
  function resetMeasure() {
    if (clickLine) { clickLine.setMap(null); clickLine = null; }
    dots.forEach(d => { try { d.setMap(null); } catch(_){} });
    dots = [];
    segOverlays.forEach(o => { try { o.setMap(null); } catch(_){} });
    segOverlays = [];
    if (totalOverlay) { try { totalOverlay.setMap(null); } catch(_){} totalOverlay = null; }
  }

  // ----- 맵 클릭 핸들러 -----
  function onMapClick(e) {
    if (!drawing || !mapExists()) return;
    const pos = e.latLng;

    if (!clickLine) {
      clickLine = new kakao.maps.Polyline({
        map: map,
        path: [pos],
        strokeWeight: 3,
        strokeColor: '#db4040',
        strokeOpacity: 1,
        strokeStyle: 'solid'
      });
      addDot(pos);
      showTotalAt(pos, 0);
    } else {
      const path = clickLine.getPath();
      const prev = path[path.length - 1];
      path.push(pos);
      clickLine.setPath(path);

      const segLine = new kakao.maps.Polyline({ path: [prev, pos] });
      const segDist = Math.round(segLine.getLength());
      addSegmentBox(pos, segDist);
      addDot(pos);

      const total = Math.round(clickLine.getLength());
      showTotalAt(pos, total);
    }
  }

  // ----- 토글 -----
  btn.addEventListener('click', function() {
    if (!mapExists()) return;
    drawing = !drawing;
    btn.classList.toggle('active', drawing);
    btn.setAttribute('aria-pressed', drawing ? 'true' : 'false');

    if (drawing) {
      resetMeasure();
      map.setCursor('crosshair');
      kakao.maps.event.addListener(map, 'click', onMapClick);
    } else {
      kakao.maps.event.removeListener(map, 'click', onMapClick);
      map.setCursor('');
      resetMeasure();
    }
  });
})();
</script>
