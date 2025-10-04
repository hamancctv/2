// btnDistance.js — 거리재기(픽스형 버튼)
(function () {
  console.log("[btnDistance] loaded");

  const mapExists = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function";

  // --- 버튼 스타일 ---
  if (!document.getElementById("btnDistance-style-main")) {
    const st = document.createElement("style");
    st.id = "btnDistance-style-main";
    st.textContent = `
      #btnDistance {
        position: fixed;
        top: 156px;           /* 원하는 위치 */
        left: 10px;          /* 왼쪽 여백 */
        z-index: 1000;       /* 지도 위 표시 */
        width: 40px; height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #ccc;
        border-radius: 8px;
        background: #fff;
        color: #555;
        cursor: pointer;
        transition: all .2s ease;
        box-sizing: border-box;
      }
      #btnDistance:hover { box-shadow: 0 3px 12px rgba(0,0,0,.12); }
      #btnDistance.active {
        border-color: #db4040;
        color: #db4040;
        box-shadow: 0 0 0 2px rgba(219,64,64,.15) inset;
      }
      #btnDistance svg { width: 18px; height: 18px; display: block; }
      #btnDistance svg rect { fill: currentColor; stroke: currentColor; stroke-width: 1.6; }
    `;
    document.head.appendChild(st);
  }

  // --- 버튼 생성 ---
  let btn = document.getElementById("btnDistance");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "btnDistance";
    btn.title = "거리 재기";
btn.innerHTML = `
  <svg viewBox="0 0 32 24" aria-hidden="true">
    <rect x="2" y="5" width="28" height="14" rx="3" ry="3"></rect>
  </svg>
`;
    document.body.appendChild(btn); // ✅ 픽스형으로 body에 바로 추가
  }

  // --- 측정 UI 스타일 ---
if (!document.getElementById("btnDistance-style-main")) {
  const st = document.createElement("style");
  st.id = "btnDistance-style-main";
  st.textContent = `
    #btnDistance {
      position: fixed;
      top: 70px;
      left: 10px;
      z-index: 1000;
      width: 40px; height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #ccc;
      border-radius: 8px;
      background: #fff;
      color: #555;
      cursor: pointer;
      transition: all .2s ease;
      box-sizing: border-box;
    }
    #btnDistance:hover {
      box-shadow: 0 3px 12px rgba(0,0,0,.12);
    }
    /* 활성화 시: 테두리와 아이콘 윤곽만 빨간색 */
    #btnDistance.active {
      border-color: #db4040;
    }
    #btnDistance svg {
      width: 22px;  /* 버튼보다 조금 작게 */
      height: 22px;
      display: block;
    }
    #btnDistance svg rect {
      fill: currentColor;
      stroke: currentColor;
      stroke-width: 2;
    }
    #btnDistance.active svg rect {
      fill: none;
      stroke: #db4040;
      stroke-width: 3;   /* ✅ 더 두껍게 */
    }
  `;
  document.head.appendChild(st);
}

  // --- 내부 상태 ---
  let drawing = false;
  let clickLine = null;
  let dots = [];
  let segOverlays = [];
  let totalOverlay = null;

  const fmt = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatDist = m => (m >= 1000 ? (m / 1000).toFixed(2) + " km" : fmt(m) + " m");

  // --- 총거리 표시 ---
  function ensureTotalOverlay(position) {
    if (!totalOverlay) {
      const el = document.createElement("div");
      el.className = "km-total-box";
      el.textContent = "총 거리: 0 m";
      totalOverlay = new kakao.maps.CustomOverlay({
        position,
        content: el,
        xAnchor: 0,
        yAnchor: 0,
        zIndex: 5300
      });
    } else totalOverlay.setPosition(position);
    totalOverlay.setMap(map);
  }
  function updateTotalOverlayText() {
    if (!totalOverlay) return;
    const m = clickLine ? Math.round(clickLine.getLength()) : 0;
    totalOverlay.getContent().textContent = "총 거리: " + formatDist(m);
  }
  function removeTotalOverlay() {
    if (totalOverlay) { try { totalOverlay.setMap(null); } catch(_){} totalOverlay = null; }
  }

  // --- 점/선/거리 ---
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
  function addSegmentBox(position, distText) {
    const el = document.createElement("div");
    el.className = "km-seg";
    el.textContent = distText;
    const seg = new kakao.maps.CustomOverlay({
      position,
      content: el,
      yAnchor: 1,
      zIndex: 5200
    });
    seg.setMap(map);
    segOverlays.push(seg);
  }
  function resetMeasure() {
    if (clickLine) { clickLine.setMap(null); clickLine = null; }
    dots.forEach(d => { try { d.setMap(null); } catch(_){} });
    dots = [];
    segOverlays.forEach(o => { try { o.setMap(null); } catch(_){} });
    segOverlays = [];
    removeTotalOverlay();
  }

  // --- 지도 클릭 ---
  function onMapClick(e) {
    if (!drawing || !mapExists()) return;
    const pos = e.latLng;

    if (!clickLine) {
      clickLine = new kakao.maps.Polyline({
        map,
        path: [pos],
        strokeWeight: 3,
        strokeColor: "#db4040",
        strokeOpacity: 1,
        strokeStyle: "solid"
      });
      addDot(pos);
    } else {
      const path = clickLine.getPath();
      const prev = path[path.length - 1];
      path.push(pos);
      clickLine.setPath(path);
      const segLine = new kakao.maps.Polyline({ path: [prev, pos] });
      addSegmentBox(pos, formatDist(segLine.getLength()));
      addDot(pos);
    }
    ensureTotalOverlay(pos);
    updateTotalOverlayText();
  }

  // --- 토글 ---
  btn.addEventListener("click", () => {
    if (!mapExists()) return;
    drawing = !drawing;
    btn.classList.toggle("active", drawing);
    map.setCursor(drawing ? "crosshair" : "");
    if (drawing) {
      resetMeasure();
      kakao.maps.event.addListener(map, "click", onMapClick);
    } else {
      kakao.maps.event.removeListener(map, "click", onMapClick);
      resetMeasure();
    }
  });
})();
