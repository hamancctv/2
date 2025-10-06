// btnDistance.js — 거리재기 (툴바형, 완성형 v2025-10-06-FINAL-STABLE)
(function () {
  console.log("[btnDistance] loaded v2025-10-06-FINAL-STABLE");

  const mapExists = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function";

  // ... (UI 스타일 및 내부 상태 정의 부분은 생략) ...
    // 

    /* === 🔹 거리 UI 스타일 (기존 코드와 동일) === */
    if (!document.getElementById("btnDistance-style")) {
        const style = document.createElement("style");
        style.id = "btnDistance-style";
        style.textContent = `
          .km-dot { /* ... */ }
          .km-seg { /* ... */ }
          .km-total-box { /* ... */ }
        `;
        document.head.appendChild(style);
    }
    
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
    const formatDist = m =>
        m >= 1000 ? (m / 1000).toFixed(2) + " km" : fmt(m) + " m";

    /* === 🔹 총거리 오버레이 (기존 코드와 동일) === */
    function ensureTotalOverlay(position) { /* ... */ }
    function updateTotalOverlayText() { /* ... */ }
    function removeTotalOverlay() { /* ... */ }

    /* === 🔹 점 / 구간 박스 (기존 코드와 동일) === */
    function addDot(pos) { /* ... */ }
    function addSegmentBox(pos, distText) { /* ... */ }

    /* === 🔹 초기화 (기존 코드와 동일) === */
    function resetMeasure() { /* ... */ }

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
      // 두 번째 점 이후: 무조건 경로에 추가
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
    addPoint(e.latLng); 
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
