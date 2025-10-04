// btnDistance.js — 거리재기(점 위 구간박스 + 점 아래 총거리박스), 
// 툴바 정렬/토글 OFF 시 전부 초기화
(function () {
  console.log("[btnDistance] loaded");

  const mapExists = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function";

  // --- 툴바/버튼 준비 ---
  const toolbar = document.querySelector(".toolbar");
  if (!toolbar) { console.log("[btnDistance] no .toolbar found, disabled"); return; }

  // 툴바 간격 보정 + 버튼 기본 스타일(필요 시)
  if (!document.getElementById("btnDistance-toolbar-style")) {
    const st = document.createElement("style");
    st.id = "btnDistance-toolbar-style";
    st.textContent = `
      .toolbar { display:flex; flex-direction:column; gap:8px; }
      #btnDistance {
        width:40px; height:40px;
        display:inline-flex; align-items:center; justify-content:center;
        border:1px solid #ccc; border-radius:8px; background:#fff; color:#555;
        cursor:pointer; transition:all .2s ease; box-sizing:border-box;
      }
      #btnDistance:hover { box-shadow:0 3px 12px rgba(0,0,0,.12); }
      #btnDistance.active{
        border-color:#007aff; box-shadow:0 0 0 2px rgba(0,122,255,.15) inset; color:#007aff;
      }
    `;
    document.head.appendChild(st);
  }

  let btn = document.getElementById("btnDistance");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "btnDistance";
    if (document.querySelector(".btn-satellite")) btn.className = "btn-satellite";
    btn.title = "거리 재기";
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML =
      `<svg viewBox="0 0 24 24" aria-hidden="true" style="width:18px;height:18px;">
         <path d="M3 17l1.5 1.5L7 16l-2-2-2 3zm3-3l3 3 8.5-8.5-3-3L6 11zm10-8l3 3 1-1a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-1 1z"/>
       </svg>`;
    toolbar.appendChild(btn);
  }

  // 로드뷰 버튼 바로 아래에 위치 고정
  (function placeButton() {
    const rvBtn = toolbar.querySelector("#roadviewControl");
    if (!rvBtn) return;
    if (btn.previousElementSibling === rvBtn) return;
    if (rvBtn.nextSibling) toolbar.insertBefore(btn, rvBtn.nextSibling);
    else toolbar.appendChild(btn);
  })();

  // --- 측정 UI 스타일 ---
  if (!document.getElementById("btnDistance-style")) {
    const style = document.createElement("style");
    style.id = "btnDistance-style";
    style.textContent = `
      /* 분기점 점(흰색 원 + 빨간 테두리) */
      .km-dot {
        width: 12px; height: 12px;
        border: 2px solid #e53935;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 0 1px rgba(0,0,0,.06);
      }
      /* 구간 박스(점 위로, 간섭 최소) */
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
        margin-bottom: 14px; /* 점과의 간격 */
      }
      /* 총거리 박스(점 아래로, 구간 박스와 동일 간격) */
      .km-total-box {
        background: #ffeb3b;
        color: #222;
        border: 1px solid #e0c200;
        border-radius: 10px;
        padding: 6px 10px;
        font-size: 13px; font-weight: 700;
        box-shadow: 0 2px 8px rgba(0,0,0,.15);
        pointer-events: none; /* 클릭 간섭 방지 */
        margin-top: 14px;     /* 점과의 간격(구간 박스와 동일) */
        white-space:nowrap;
      }
      #btnDistance.active {
        border-color:#007aff;
        box-shadow:0 0 0 2px rgba(0,122,255,.15) inset;
        color:#007aff;
      }
    `;
    document.head.appendChild(style);
  }

  // --- 내부 상태 ---
  let drawing = false;
  let clickLine = null;        // 확정 경로 polyline
  let dots = [];               // 분기점 점(CustomOverlay) 목록
  let segOverlays = [];        // 구간 박스(CustomOverlay) 목록
  let totalOverlay = null;     // 총거리 박스(CustomOverlay, 마지막 점 아래)
  let segCount = 0;

  const fmt = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // 총거리 오버레이 생성/업데이트/제거
  function ensureTotalOverlay(position) {
    if (!totalOverlay) {
      const el = document.createElement("div");
      el.className = "km-total-box";
      el.textContent = "총 거리: 0 m";
      totalOverlay = new kakao.maps.CustomOverlay({
        position,
        content: el,
        xAnchor: 0.5,
        yAnchor: 0,   // 점 ‘아래’에 붙음
        zIndex: 5300
      });
    } else {
      totalOverlay.setPosition(position);
    }
    totalOverlay.setMap(map);
  }
  function updateTotalOverlayText() {
    if (!totalOverlay) return;
    const m = clickLine ? Math.round(clickLine.getLength()) : 0;
    const text = m >= 1000 ? `총 거리: ${(m/1000).toFixed(2)} km` : `총 거리: ${fmt(m)} m`;
    totalOverlay.getContent().textContent = text;
  }
  function removeTotalOverlay() {
    if (totalOverlay) { try { totalOverlay.setMap(null);} catch(_){} totalOverlay = null; }
  }

  // 점(분기점)
  function addDot(position) {
    const el = document.createElement("div");
    el.className = "km-dot";
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

  // 구간 박스(점 위)
  function addSegmentBox(position, text) {
    const el = document.createElement("div");
    el.className = "km-seg";
    el.textContent = text;
    const seg = new kakao.maps.CustomOverlay({
      position,
      content: el,
      yAnchor: 1,    // 아래쪽이 점에 붙음 → margin-bottom으로 위로 띄움
      zIndex: 5200
    });
    seg.setMap(map);
    segOverlays.push(seg);
  }

  // 초기화
  function resetMeasure() {
    if (clickLine) { clickLine.setMap(null); clickLine = null; }
    dots.forEach(d => { try { d.setMap(null); } catch(_){} });
    dots = [];
    segOverlays.forEach(o => { try { o.setMap(null); } catch(_){} });
    segOverlays = [];
    segCount = 0;
    removeTotalOverlay();
  }

  // 지도 클릭 → 점/선/구간/총거리
  function onMapClick(mouseEvent) {
    if (!drawing || !mapExists()) return;
    const pos = mouseEvent.latLng;

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
      segCount = 0;
    } else {
      const path = clickLine.getPath();
      const prev = path[path.length - 1];
      path.push(pos);
      clickLine.setPath(path);

      const segLine = new kakao.maps.Polyline({ path: [prev, pos] });
      const dist = Math.round(segLine.getLength());
      segCount += 1;
      addSegmentBox(pos, `구간 ${segCount}: ${fmt(dist)}m`);
      addDot(pos);
    }

    // 총거리 박스: 마지막 점 ‘바로 아래’에 표시
    ensureTotalOverlay(pos);
    updateTotalOverlayText();
  }

  // 토글
  btn.addEventListener('click', function toggleMeasure() {
    if (!mapExists()) {
      console.warn("[btnDistance] map not ready yet");
      return;
    }
    drawing = !drawing;
    btn.classList.toggle('active', drawing);
    btn.setAttribute("aria-pressed", drawing ? "true" : "false");

    if (drawing) {
      resetMeasure();                 // 시작 전 깨끗하게
      map.setCursor('crosshair');
      kakao.maps.event.addListener(map, 'click', onMapClick);
    } else {
      kakao.maps.event.removeListener(map, 'click', onMapClick);
      map.setCursor('');
      resetMeasure();                 // 선/점/구간/총거리 모두 제거
    }
  });

})();
