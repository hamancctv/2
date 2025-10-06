// btnDistance.js — v2025-10-07 STABLE+SHIELD (거리재기)
(function () {
  console.log("[btnDistance] loaded v2025-10-07 STABLE+SHIELD");

  const mapExists = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function";

  const btn = document.getElementById("btnDistance");
  if (!btn) {
    console.warn("[btnDistance] #btnDistance not found");
    return;
  }

  // === UI 스타일 (필요시 중복 방지)
  if (!document.getElementById("btnDistance-style")) {
    const style = document.createElement("style");
    style.id = "btnDistance-style";
    style.textContent = `
      .km-dot{width:12px;height:12px;border:2px solid #e53935;background:#fff;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.06);}
      .km-seg{background:#fff;color:#e53935;border:1px solid #e53935;border-radius:8px;padding:2px 6px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.12);margin-bottom:14px;}
      .km-total-box{background:#ffeb3b;color:#222;border:1px solid #e0c200;border-radius:10px;padding:6px 10px;font-size:13px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.15);pointer-events:none;white-space:nowrap;}
    `;
    document.head.appendChild(style);
  }

  let drawing = false;
  let clickLine = null;
  let dots = [];
  let segOverlays = [];
  let totalOverlay = null;

  const fmt = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatDist = m => (m >= 1000 ? (m / 1000).toFixed(2) + " km" : fmt(m) + " m");

  function ensureTotalOverlay(position) {
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
  }

  function updateTotalOverlayText() {
    if (!totalOverlay) return;
    const m = clickLine ? Math.round(clickLine.getLength()) : 0;
    totalOverlay.getContent().textContent = "총 거리: " + formatDist(m);
  }

  function removeAll() {
    if (clickLine) { clickLine.setMap(null); clickLine = null; }
    dots.forEach(d => { try { d.setMap(null); } catch(_){} });
    segOverlays.forEach(o => { try { o.setMap(null); } catch(_){} });
    dots = []; segOverlays = [];
    if (totalOverlay) { try { totalOverlay.setMap(null); } catch(_){} totalOverlay = null; }
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
      const el = document.createElement("div");
      el.className = "km-dot";
      new kakao.maps.CustomOverlay({ position: pos, content: el, xAnchor:0.5, yAnchor:0.5, zIndex:5000 }).setMap(map);
      dots.push(el);
    } else {
      const path = clickLine.getPath();
      const prev = path[path.length - 1];
      const segLine = new kakao.maps.Polyline({ path: [prev, pos] });
      const dist = Math.round(segLine.getLength());
      path.push(pos);
      clickLine.setPath(path);

      const segEl = document.createElement("div");
      segEl.className = "km-seg";
      segEl.textContent = formatDist(dist);
      const segOverlay = new kakao.maps.CustomOverlay({ position: pos, content: segEl, yAnchor:1, zIndex:5200 });
      segOverlay.setMap(map);
      segOverlays.push(segOverlay);

      const dotEl = document.createElement("div");
      dotEl.className = "km-dot";
      new kakao.maps.CustomOverlay({ position: pos, content: dotEl, xAnchor:0.5, yAnchor:0.5, zIndex:5000 }).setMap(map);
      dots.push(dotEl);
    }
    ensureTotalOverlay(pos);
    updateTotalOverlayText();
  }

  btn.addEventListener("click", () => {
    if (!mapExists()) return;
    drawing = !drawing;
    btn.classList.toggle("active", drawing);
    map.setCursor(drawing ? "crosshair" : "");

    if (drawing) {
      // ✅ 쉴드 ON (지도는 클릭/드래그 가능, 마커/오버레이는 완전 무시)
      if (window.InputShield) InputShield.enable("measure");
      kakao.maps.event.addListener(map, "click", onMapClick);
      console.log("[거리재기] 시작");
    } else {
      // ✅ 쉴드 OFF
      if (window.InputShield) InputShield.disable();
      kakao.maps.event.removeListener(map, "click", onMapClick);
      removeAll();
      console.log("[거리재기] 종료");
    }
  });
})();
