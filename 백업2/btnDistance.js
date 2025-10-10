// distance.js - 거리재기 모듈
// 상태 동기화: 두 모드 중 하나라도 켜져 있으면 차단
window.syncInteractionLocks = function () {
  const blocked = !!(window.overlayOn || window.isDistanceMode);
  window.isMarkerInteractionEnabled = !blocked;

  if (typeof setAllMarkersClickable === 'function') {
    setAllMarkersClickable(!blocked);
    // 지도 relayout/idle 이후에도 확실히 잠그기 위한 약간의 지연 재적용
    if (blocked) {
      setTimeout(() => {
        if (window.overlayOn || window.isDistanceMode) setAllMarkersClickable(false);
      }, 250);
    }
  }
};

// 전역에서 접근할 수 있도록 DistanceModule에 캡슐화
window.DistanceModule = {};

(function(exports) {
    /**
     * 거리재기 기능을 초기화하고 이벤트 핸들러를 설정합니다.
     * @param {object} map - 카카오맵 객체
     */
    exports.setupDistance = function(map) {
        // 거리재기 로직 전체
        const btn = document.getElementById("btnDistance");
        if (!btn) return;

        let drawing = false, clickLine = null, dots = [], segOverlays = [], totalOverlay = null;

        const fmt = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const formatDist = m => m >= 1000 ? (m / 1000).toFixed(2) + " km" : fmt(m) + " m";

        function ensureTotalOverlay(position) {
            if (!totalOverlay) {
                const el = document.createElement("div");
                el.className = "km-total-box"; el.textContent = "총 거리: 0 m";
                totalOverlay = new kakao.maps.CustomOverlay({ position, content: el, xAnchor: 0, yAnchor: 0, zIndex: 5300 });
            }
            totalOverlay.setPosition(position); totalOverlay.setMap(map);
        }
        function updateTotal() {
            if (!totalOverlay) return;
            const m = clickLine ? Math.round(clickLine.getLength()) : 0;
            totalOverlay.getContent().textContent = "총 거리: " + formatDist(m);
        }
        function addDot(pos) {
            const el = document.createElement("div"); el.className = "km-dot";
            const dot = new kakao.maps.CustomOverlay({ position: pos, content: el, xAnchor: 0.5, yAnchor: 0.5, zIndex: 5000 });
            dot.setMap(map); dots.push(dot);
        }
        function addSegBox(pos, txt) {
            const el = document.createElement("div"); el.className = "km-seg"; el.textContent = txt;
            const seg = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1, zIndex: 5200 });
            seg.setMap(map); segOverlays.push(seg);
        }
        function reset() {
            if (clickLine) { clickLine.setMap(null); clickLine = null; }
            dots.forEach(d => { try { d.setMap(null); } catch { } }); dots = [];
            segOverlays.forEach(o => { try { o.setMap(null); } catch { } }); segOverlays = [];
            if (totalOverlay) { try { totalOverlay.setMap(null); } catch {}; totalOverlay = null; }
        }
        function onMapClick(e) {
            if (!drawing) return;
            // ⭐ 거리재기 중에는 로드뷰 픽모드 및 이동을 막아야 함
            if(window.pickMode) return; 

            const pos = e.latLng;
            if (!clickLine) {
                clickLine = new kakao.maps.Polyline({
                    map, path: [pos], strokeWeight: 3, strokeColor: "#db4040", strokeOpacity: 1, strokeStyle: "solid"
                });
                addDot(pos);
            } else {
                const path = clickLine.getPath();
                const prev = path[path.length - 1];
                const segLine = new kakao.maps.Polyline({ path: [prev, pos] });
                const dist = Math.round(segLine.getLength());
                path.push(pos); clickLine.setPath(path);
                addSegBox(pos, formatDist(dist)); addDot(pos);
            }
            ensureTotalOverlay(pos); updateTotal();
        }

btn.addEventListener("click", ()=> {
  drawing = !drawing;
  window.isDistanceMode = drawing; // ✅ 거리재기 상태 저장
  btn.classList.toggle("active", drawing);

  if (drawing){
  document.body.classList.add("distance-active");
  kakao.maps.event.addListener(map, "click", onMapClick);
} else {
  document.body.classList.remove("distance-active");
  kakao.maps.event.removeListener(map, "click", onMapClick);
  reset();
}
window.isDistanceMode = drawing;            // 상태만 바꾸고
window.syncInteractionLocks();              // 여기서 일괄 반영
});




    }

})(window.DistanceModule);