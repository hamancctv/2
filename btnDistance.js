// btnDistance.js — 거리재기(분기점 흰원/빨간테두리 + 구간 박스 + 우상단 총거리), 토글 OFF 시 모두 초기화
(function () {
  console.log("[btnDistance] loaded");

  // --- 버튼 삽입(없으면 생성) ---
  const toolbar = document.querySelector(".toolbar");
  if (!toolbar) {
    console.log("[btnDistance] no .toolbar found, disabled");
    return;
  }
  let btn = document.getElementById("btnDistance");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "btnDistance";
    btn.className = "btn-satellite"; // 기존 버튼 스타일 재사용(크기/간격 동일)
    btn.title = "거리 재기";
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" style="width:18px;height:18px;"><path d="M3 17l1.5 1.5L7 16l-2-2-2 3zm3-3l3 3 8.5-8.5-3-3L6 11zm10-8l3 3 1-1a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-1 1z"/></svg>`;
    toolbar.appendChild(btn);
  }

  // --- 스타일 주입(한 번만) ---
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
      /* 구간 박스(클릭한 지점에 표시) */
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
      }
      /* 총거리 박스(지도 우상단 고정, 노란색) */
      .km-total-box {
        position: absolute; right: 8px; top: 8px;
        z-index: 660;
        background: #ffeb3b;
        color: #222;
        border: 1px solid #e0c200;
        border-radius: 10px;
        padding: 6px 10px;
        font-size: 13px; font-weight: 700;
        box-shadow: 0 2px 8px rgba(0,0,0,.15);
        pointer-events: none; /* 간섭 방지 */
      }
      /* 버튼 토글 비주얼 */
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
  let clickLine = null;               // 확정 경로 polyline
  let dots = [];                      // 분기점 점(CustomOverlay) 목록
  let segOverlays = [];               // 구간 박스(CustomOverlay) 목록
  let totalBoxEl = null;              // 총거리 고정 박스(우상단)
  let segCount = 0;

  // 지도/래퍼 참조
  const mapWrapper = document.getElementById("mapWrapper");
  const mapExists = () => (typeof window !== "undefined" && window.map && window.kakao && kakao.maps);
  const fmt = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // --- 총거리 박스 생성/업데이트/숨김 ---
  function ensureTotalBox() {
    if (!totalBoxEl) {
      totalBoxEl = document.createElement("div");
      totalBoxEl.className = "km-total-box";
      totalBoxEl.style.display = "none";
      (mapWrapper || document.body).appendChild(totalBoxEl);
    }
    totalBoxEl.style.display = "block";
  }
  function hideTotalBox() {
    if (totalBoxEl) totalBoxEl.style.display = "none";
  }
  function updateTotalBox() {
    if (!totalBoxEl) return;
    if (!clickLine) { totalBoxEl.textContent = "총 거리: 0 m"; return; }
    const m = Math.round(clickLine.getLength());
    totalBoxEl.textContent = m >= 1000
      ? `총 거리: ${(m/1000).toFixed(2)} km`
      : `총 거리: ${fmt(m)} m`;
  }

  // --- 점(분기점) 추가 ---
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

  // --- 구간 박스 추가 ---
  function addSegmentBox(position, text) {
    const el = document.createElement("div");
    el.className = "km-seg";
    el.textContent = text;
    const seg = new kakao.maps.CustomOverlay({
      position,
      content: el,
      yAnchor: 1,
      zIndex: 5200
    });
    seg.setMap(map);
    segOverlays.push(seg);
  }

  // --- 초기화/리셋(모든 요소 제거) ---
  function resetMeasure() {
    if (clickLine) { clickLine.setMap(null); clickLine = null; }
    dots.forEach(d => { try { d.setMap(null); } catch(_){} });
    dots = [];
    segOverlays.forEach(o => { try { o.setMap(null); } catch(_){} });
    segOverlays = [];
    segCount = 0;
    hideTotalBox();
  }

  // --- 클릭 처리 ---
  function onMapClick(mouseEvent) {
    if (!drawing || !mapExists()) return;
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
      addDot(pos);
      segCount = 0; // 첫 점은 구간 생성 전
    } else {
      // 다음 점 → 구간 생성
      const path = clickLine.getPath();
      const prev = path[path.length - 1];
      path.push(pos);
      clickLine.setPath(path);

      // 구간 길이 계산
      const segLine = new kakao.maps.Polyline({ path: [prev, pos] });
      const dist = Math.round(segLine.getLength());
      segCount += 1;
      addSegmentBox(pos, `구간 ${segCount}: ${fmt(dist)}m`);
      addDot(pos);
    }
    ensureTotalBox();
    updateTotalBox();
  }

  // --- 토글 ---
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
      resetMeasure();                 // ← 구간 박스/점/선/총거리 전부 제거
    }
  });

})();
