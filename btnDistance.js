// distance.js — v2025-10-INTERNAL-CSS-STABLE
// 거리재기 모듈 + CSS 내부관리 (기존 기능 그대로 유지)

// === [A] 스타일 자동 주입 ===
if (!document.getElementById("distance-style")) {
  const st = document.createElement("style");
  st.id = "distance-style";
  st.textContent = `
    .km-dot {
      width: 10px;
      height: 10px;
      border: 2px solid #e53935;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 1px rgba(0,0,0,.06);
    }
    .km-seg {
      background: #fff;
      color: #e53935;
      border: 1px solid #e53935;
      border-radius: 8px;
      padding: 2px 6px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,.12);
      margin-bottom: 14px;
    }
    .km-total-box {
      background: #ffeb3b;
      color: #222;
      border: 1px solid #e0c200;
      border-radius: 10px;
      padding: 6px 10px;
      font-size: 13px;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0,0,0,.15);
      pointer-events: none;
      white-space: nowrap;
      transform: translate(10px,8px);
    }
  `;
  document.head.appendChild(st);
  console.log("[distance] internal CSS injected ✅");
}

// === [B] 인터랙션 잠금 동기화 ===
window.syncInteractionLocks = function () {
  const blocked = !!(window.overlayOn || window.isDistanceMode);
  window.isMarkerInteractionEnabled = !blocked;

  if (typeof setAllMarkersClickable === 'function') {
    setAllMarkersClickable(!blocked);
    if (blocked) {
      setTimeout(() => {
        if (window.overlayOn || window.isDistanceMode)
          setAllMarkersClickable(false);
      }, 250);
    }
  }
};

// === [C] 거리재기 모듈 ===
window.DistanceModule = {};

(function (exports) {
  exports.setupDistance = function (map) {
    const btn = document.getElementById("btnDistance");
    if (!btn) return;

    let drawing = false,
      clickLine = null,
      dots = [],
      segOverlays = [],
      totalOverlay = null;

    const fmt = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const formatDist = (m) =>
      m >= 1000 ? (m / 1000).toFixed(2) + " km" : fmt(m) + " m";

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
          zIndex: 5300,
        });
      }
      totalOverlay.setPosition(position);
      totalOverlay.setMap(map);
    }

    function updateTotal() {
      if (!totalOverlay) return;
      const m = clickLine ? Math.round(clickLine.getLength()) : 0;
      totalOverlay.getContent().textContent = "총 거리: " + formatDist(m);
    }

    function addDot(pos) {
      const el = document.createElement("div");
      el.className = "km-dot";
      const dot = new kakao.maps.CustomOverlay({
        position: pos,
        content: el,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 5000,
      });
      dot.setMap(map);
      dots.push(dot);
    }

    function addSegBox(pos, txt) {
      const el = document.createElement("div");
      el.className = "km-seg";
      el.textContent = txt;
      const seg = new kakao.maps.CustomOverlay({
        position: pos,
        content: el,
        yAnchor: 1,
        zIndex: 5200,
      });
      seg.setMap(map);
      segOverlays.push(seg);
    }

    function reset() {
      if (clickLine) {
        clickLine.setMap(null);
        clickLine = null;
      }
      dots.forEach((d) => {
        try {
          d.setMap(null);
        } catch {}
      });
      dots = [];
      segOverlays.forEach((o) => {
        try {
          o.setMap(null);
        } catch {}
      });
      segOverlays = [];
      if (totalOverlay) {
        try {
          totalOverlay.setMap(null);
        } catch {}
        totalOverlay = null;
      }
    }

    function onMapClick(e) {
      if (!drawing) return;
      if (window.pickMode) return; // 로드뷰 픽모드 중에는 무시

      const pos = e.latLng;
      if (!clickLine) {
        clickLine = new kakao.maps.Polyline({
          map,
          path: [pos],
          strokeWeight: 3,
          strokeColor: "#db4040",
          strokeOpacity: 1,
          strokeStyle: "solid",
        });
        addDot(pos);
      } else {
        const path = clickLine.getPath();
        const prev = path[path.length - 1];
        const segLine = new kakao.maps.Polyline({ path: [prev, pos] });
        const dist = Math.round(segLine.getLength());
        path.push(pos);
        clickLine.setPath(path);
        addSegBox(pos, formatDist(dist));
        addDot(pos);
      }
      ensureTotalOverlay(pos);
      updateTotal();
    }

    btn.addEventListener("click", () => {
      drawing = !drawing;
      window.isDistanceMode = drawing;
      btn.classList.toggle("active", drawing);

      if (drawing) {
        document.body.classList.add("distance-active");
        kakao.maps.event.addListener(map, "click", onMapClick);
      } else {
        document.body.classList.remove("distance-active");
        kakao.maps.event.removeListener(map, "click", onMapClick);
        reset();
      }

      window.isDistanceMode = drawing;
      window.syncInteractionLocks();
    });
  };
})(window.DistanceModule);
