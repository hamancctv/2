// btnDistance.js — 거리재기(툴바 내장형, STABLE-LAYERFIX 기반)
(function () {
  console.log("[btnDistance] loaded v2025-10-STABLE-LAYERFIX-TOOLBAR");

  const mapExists = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function";

  // --- 버튼 가져오기 (툴바 내장형) ---
  const btn = document.getElementById("btnDistance");
  if (!btn) {
    console.warn("[btnDistance] toolbar button not found");
    return;
  }

  // --- 내부 상태 ---
  let drawing = false;
  let clickLine = null;
  let dots = [];
  let segOverlays = [];
  let totalOverlay = null;

  const fmt = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatDist = m =>
    m >= 1000 ? (m / 1000).toFixed(2) + " km" : fmt(m) + " m";

  function ensureTotalOverlay(position) {
    const xOffset = 8, yOffset = -8;
    if (!totalOverlay) {
      const el = document.createElement("div");
      el.className = "km-total-box";
      el.textContent = "총 거리: 0 m";
      totalOverlay = new kakao.maps.CustomOverlay({
        position, content: el, xAnchor: 0, yAnchor: 0, zIndex: 5300
      });
    }
    totalOverlay.setPosition(position);
    totalOverlay.setMap(map);
    totalOverlay.getContent().style.transform =
      `translate(${xOffset}px, ${-yOffset}px)`;
  }

  function updateTotalOverlayText() {
    if (!totalOverlay) return;
    const m = clickLine ? Math.round(clickLine.getLength()) : 0;
    totalOverlay.getContent().textContent = "총 거리: " + formatDist(m);
  }

  function removeTotalOverlay() {
    if (totalOverlay) {
      try { totalOverlay.setMap(null); } catch(_) {}
      totalOverlay = null;
    }
  }

  function addDot(pos) {
    const el = document.createElement("div");
    el.className = "km-dot";
    const dot = new kakao.maps.CustomOverlay({
      position: pos,
      content: el,
      xAnchor: 0.5,
      yAnchor: 0.5,
      zIndex: 5000
    });
    dot.setMap(map);
    dots.push(dot);
  }

  function addSegmentBox(pos, distText) {
    const el = document.createElement("div");
    el.className = "km-seg";
    el.textContent = distText;
    const seg = new kakao.maps.CustomOverlay({
      position: pos,
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
    segOverlays.forEach(o => { try { o.setMap(null); } catch(_){} });
    dots = [];
    segOverlays = [];
    removeTotalOverlay();
  }

  function onMapClick(e) {
    if (!drawing || !mapExists()) return;
    const pos = e.latLng;

    if (!clickLine) {
      clickLine = new kakao.maps.Polyline({
        map, path: [pos],
        strokeWeight: 3, strokeColor: "#db4040",
        strokeOpacity: 1, strokeStyle: "solid"
      });
      addDot(pos);
    } else {
      const path = clickLine.getPath();
      const prev = path[path.length - 1];
      const segLine = new kakao.maps.Polyline({ path: [prev, pos] });
      const dist = Math.round(segLine.getLength());
      path.push(pos);
      clickLine.setPath(path);
      addSegmentBox(pos, formatDist(dist));
      addDot(pos);
    }
    ensureTotalOverlay(pos);
    updateTotalOverlayText();
  }

  // --- 버튼 클릭 이벤트 (툴바용) ---
  btn.addEventListener("click", () => {
    if (!mapExists()) return;
    drawing = !drawing;
    btn.classList.toggle("active", drawing);
    map.setCursor(drawing ? "crosshair" : "");

    if (drawing) {
      if (window.setInteractionLock) setInteractionLock(true);
      kakao.maps.event.addListener(map, "click", onMapClick);
      console.log("[거리재기] 시작");
    } else {
      if (window.setInteractionLock) setInteractionLock(false);
      kakao.maps.event.removeListener(map, "click", onMapClick);
      resetMeasure();
      console.log("[거리재기] 종료");
    }
  });

  // --- 거리 UI 스타일 (STABLE 버전 그대로) ---
  if (!document.getElementById("btnDistance-style")) {
    const style = document.createElement("style");
    style.id = "btnDistance-style";
    style.textContent = `
      .km-dot {
        width: 12px; height: 12px;
        border: 2px solid #e53935;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 0 1px rgba(0,0,0,.06);
      }
      .km-seg {
        background:#fff; color:#e53935; border:1px solid #e53935;
        border-radius:8px; padding:2px 6px; font-size:12px; font-weight:600;
        white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,.12); margin-bottom:14px;
      }
      .km-total-box {
        background:#ffeb3b; color:#222; border:1px solid #e0c200;
        border-radius:10px; padding:6px 10px; font-size:13px; font-weight:700;
        box-shadow:0 2px 8px rgba(0,0,0,.15); pointer-events:none; white-space:nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  // --- 🔝 제안창 항상 최상단 유지 ---
  const styleTop = document.createElement("style");
  styleTop.textContent = `
    .gx-suggest-box, .gx-suggest-search {
      position: relative !important;
      z-index: 9999 !important;
    }
  `;
  document.head.appendChild(styleTop);
})();
