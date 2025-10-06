// btnDistance.js — 거리재기 (툴바형, 완성형 v2025-10-06-FINAL-STABLE)
(function () {
  console.log("[btnDistance] loaded v2025-10-06-FINAL-STABLE");

  const mapExists = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function";

  /* === 🔹 거리 UI 스타일 (생략) === */
  if (!document.getElementById("btnDistance-style")) {
    const style = document.createElement("style");
    style.id = "btnDistance-style";
    style.textContent = `
      .km-dot {
        width: 10px; height: 10px;
        border: 2px solid #e53935;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 0 1px rgba(0,0,0,.06);
      }
      .km-seg {
        background:#fff; color:#e53935; border:1px solid #e53935;
        border-radius:8px; padding:2px 6px; font-size:12px; font-weight:600;
        white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,.12);
        margin-bottom:14px;
      }
      .km-total-box {
        background:#ffeb3b; color:#222; border:1px solid #e0c200;
        border-radius:10px; padding:6px 10px; font-size:13px; font-weight:700;
        box-shadow:0 2px 8px rgba(0,0,0,.15); pointer-events:none;
        white-space:nowrap;
        transform: translate(10px, 8px); /* ✅ 오른쪽 10px, 아래 8px */
      }
    `;
    document.head.appendChild(style);
  }

  /* === 🔹 버튼 존재 확인 (생략) === */
  const btn = document.getElementById("btnDistance");
  if (!btn) {
    console.warn("[btnDistance] toolbar button (#btnDistance) not found");
    return;
  }

  /* === 내부 상태 (생략) === */
  let drawing = false;
  let clickLine = null;
  let dots = [];
  let segOverlays = [];
  let totalOverlay = null;

  const fmt = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatDist = m =>
    m >= 1000 ? (m / 1000).toFixed(2) + " km" : fmt(m) + " m";

  /* === 🔹 총거리 오버레이 (생략) === */
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

  function removeTotalOverlay() {
    if (totalOverlay) {
      try { totalOverlay.setMap(null); } catch(_) {}
      totalOverlay = null;
    }
  }

  /* === 🔹 점 / 구간 박스 (생략) === */
  function addDot(pos) {
    const el = document.createElement("div");
    el.className = "km-dot";
    const dot = new kakao.maps.CustomOverlay({
      position: pos, content: el, xAnchor: 0.5, yAnchor: 0.5, zIndex: 5000
    });
    dot.setMap(map);
    dots.push(dot);
  }

  function addSegmentBox(pos, distText) {
    const el = document.createElement("div");
    el.className = "km-seg";
    el.textContent = distText;
    const seg = new kakao.maps.CustomOverlay({
      position: pos, content: el, yAnchor: 1, zIndex: 5200
    });
    seg.setMap(map);
    segOverlays.push(seg);
  }

  /* === 🔹 초기화 (생략) === */
  function resetMeasure() {
    if (clickLine) { clickLine.setMap(null); clickLine = null; }
    dots.forEach(d => { try { d.setMap(null); } catch(_){} });
    segOverlays.forEach(o => { try { o.setMap(null); } catch(_){} });
    dots = [];
    segOverlays = [];
    removeTotalOverlay();
  }

  /* === 🔹 좌표에 점 추가 (메인 로직) === */
  // 이 함수를 외부 마커 이벤트에서 호출합니다.
  function addPoint(pos) {
    if (!mapExists()) return;

    if (!clickLine) {
      // 첫 번째 점
      clickLine = new kakao.maps.Polyline({
        map, path: [pos],
        strokeWeight: 3, strokeColor: "#db4040",
        strokeOpacity: 1, strokeStyle: "solid"
      });
      addDot(pos);
    } else {
      // 두 번째 점 이후
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

  /* === 🔹 지도 클릭 이벤트 (지도에서 클릭 시) === */
  function onMapClick(e) {
    if (!drawing) return;
    addPoint(e.latLng); // 지도 클릭 시에도 addPoint 호출
  }
  
  /* === 🔹 거리재기 모드 토글 === */
  function toggleDistanceMode(forceState) {
    if (!mapExists()) return;

    // forceState가 주어지면 해당 상태로 설정
    drawing = (typeof forceState === 'boolean') ? forceState : !drawing;
    
    btn.classList.toggle("active", drawing);
    const container = document.getElementById('container');
    container.classList.toggle('distance-on', drawing);

    if (drawing) {
      if (window.setInteractionLock) setInteractionLock(true);
      if (window.setMarkerOverlaySuppress) setMarkerOverlaySuppress(true);
      if (window.applyOverlayPointerLock) applyOverlayPointerLock(true);
      kakao.maps.event.addListener(map, "click", onMapClick);
      console.log("[거리재기] 시작");
    } else {
      if (window.setInteractionLock) setInteractionLock(false);
      if (window.setMarkerOverlaySuppress) setMarkerOverlaySuppress(false);
      if (window.applyOverlayPointerLock) applyOverlayPointerLock(false);
      kakao.maps.event.removeListener(map, "click", onMapClick);
      resetMeasure();
      console.log("[거리재기] 종료");
    }
  }

  // 툴바 버튼 클릭 이벤트
  btn.addEventListener("click", () => {
    toggleDistanceMode();
  });

  // 외부에서 사용할 수 있도록 함수를 window 객체에 노출
  window.btnDistance = {
    toggle: toggleDistanceMode,
    addPoint: addPoint, // 마커 좌표를 점으로 추가하는 함수
    isDrawing: () => drawing,
    reset: resetMeasure
  };
})();
