// btnDistance.js — 거리재기 (툴바형 + InputShield 완전 연동)
(function () {
  console.log("[btnDistance] loaded v2025-10-STABLE-SHIELD-FINAL");

  const mapExists = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function";

  const btn = document.getElementById("btnDistance");
  if (!btn) {
    console.warn("[btnDistance] toolbar button (#btnDistance) not found");
    return;
  }

  let drawing = false;
  let clickLine = null;
  let dots = [];
  let segOverlays = [];
  let totalOverlay = null;

  const fmt = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatDist = m => (m >= 1000 ? (m / 1000).toFixed(2) + " km" : fmt(m) + " m");

  function ensureTotalOverlay(position) {
    const el = document.createElement("div");
    el.className = "km-total-box";
    el.textContent = "총 거리: 0 m";
    totalOverlay = new kakao.maps.CustomOverlay({
      position, content: el, xAnchor: 0, yAnchor: 0, zIndex: 5300,
    });
    totalOverlay.setMap(map);
  }

  function updateTotalOverlayText() {
    if (!totalOverlay) return;
    const m = clickLine ? Math.round(clickLine.getLength()) : 0;
    totalOverlay.getContent().textContent = "총 거리: " + formatDist(m);
  }

  function removeAll() {
    if (clickLine) clickLine.setMap(null);
    dots.forEach(d => { try { d.setMap(null); } catch(_){} });
    segOverlays.forEach(o => { try { o.setMap(null); } catch(_){} });
    if (totalOverlay) totalOverlay.setMap(null);
    dots = []; segOverlays = []; totalOverlay = null; clickLine = null;
  }

  function onMapClick(e) {
    if (!drawing || !mapExists()) return;
    const pos = e.latLng;
    if (!clickLine) {
      clickLine = new kakao.maps.Polyline({
        map, path: [pos],
        strokeWeight: 3, strokeColor: "#db4040",
        strokeOpacity: 1, strokeStyle: "solid",
      });
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
      const segOverlay = new kakao.maps.CustomOverlay({
        position: pos, content: segEl, yAnchor: 1, zIndex: 5200,
      });
      segOverlay.setMap(map);
      segOverlays.push(segOverlay);
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
      if (window.InputShield) InputShield.enable("measure"); // ✅ 거리재기 중 차단
      kakao.maps.event.addListener(map, "click", onMapClick);
      console.log("[거리재기] 시작");
    } else {
      if (window.InputShield) InputShield.disable(); // ✅ 해제
      kakao.maps.event.removeListener(map, "click", onMapClick);
      removeAll();
      console.log("[거리재기] 종료");
    }
  });
})();
