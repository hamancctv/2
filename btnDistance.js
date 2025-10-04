// btnDistance-fixed.js — 거리재기(픽스형, 윤곽 빨강 + 총거리박스 위치 보정)
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
      top: 156px;
      left: 10px;
      z-index: 1000;
      width: 40px; height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #ccc;
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      transition: all .2s ease;
      box-sizing: border-box;
    }

    #btnDistance:hover {
      box-shadow: 0 3px 12px rgba(0,0,0,.12);
    }

    /* 기본 상태: 회색 막대 */
    #btnDistance svg {
      width: 26px;
      height: 26px;
      display: block;
    }
    #btnDistance svg rect {
      fill: #555;
      stroke: #555;
      stroke-width: 2.4;
      transition: all .2s ease;
    }

    /* ✅ 활성화 시: 안의 막대만 빨간색 (채움+테두리) */
    #btnDistance.active svg rect {
      fill: #db4040;
      stroke: #db4040;
      stroke-width: 3;
    }
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
  <svg viewBox="0 0 36 24" aria-hidden="true">
    <rect x="2" y="5" width="32" height="14" rx="3" ry="3"
      style="fill:#555;stroke:#555;stroke-width:2.2;transition:all .2s ease"></rect>
  </svg>
    `;
    document.body.appendChild(btn);
  }

  // --- 측정 관련 스타일 ---
 if (!document.getElementById("btnDistance-style-main")) {
  const st = document.createElement("style");
  st.id = "btnDistance-style-main";
  st.textContent = `
    #btnDistance {
      position: fixed;
      top: 156px;
      left: 10px;
      z-index: 1000;
      width: 40px; height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #ccc;
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      transition: all .2s ease;
      box-sizing: border-box;
    }
    #btnDistance:hover {
      box-shadow: 0 3px 12px rgba(0,0,0,.12);
    }
    #btnDistance.active {
      border-color: #db4040;
    }
    #btnDistance.active svg rect {
      fill: none !important;
      stroke: #db4040 !important;
      stroke-width: 3 !important;
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

  // --- 총거리 표시 (오른쪽 아래 8px 간격) ---
  function ensureTotalOverlay(position) {
    const xOffset = 8; // 오른쪽
    const yOffset = -8; // 아래쪽 (yAnchor는 위쪽 기준이므로 음수로)
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
    }
    totalOverlay.setPosition(position);
    totalOverlay.setMap(map);

    // 🔧 위치 오프셋 직접 적용 (right/bottom 방향)
    const el = totalOverlay.getContent();
    el.style.transform = `translate(${xOffset}px, ${-yOffset}px)`;
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

  // --- 지도 클릭 (거리 계산 순서 수정 + 총거리박스 위치 보정)
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

      // ✅ 거리 먼저 계산
      const segLine = new kakao.maps.Polyline({ path: [prev, pos] });
      const dist = Math.round(segLine.getLength());

      // ✅ 경로 갱신 후 오버레이 표시
      path.push(pos);
      clickLine.setPath(path);
      addSegmentBox(pos, formatDist(dist));
      addDot(pos);
    }

    ensureTotalOverlay(pos); // 🔧 오른쪽-아래 위치 적용
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
