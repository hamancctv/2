// btnDistance-fixed.js — 거리재기(지도 컨트롤 통합형, 제안창 아래, 막대·테두리만 빨강)
(function () {
  console.log("[btnDistance] loaded v2025-10-STABLE-CONTROL");

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
      /* 거리 버튼 기본 스타일 */
      #btnDistance {
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
      #btnDistance:hover { box-shadow: 0 3px 12px rgba(0,0,0,.12); }

      #btnDistance svg { width: 26px; height: 26px; display: block; }
      #btnDistance svg rect {
        fill: #555; stroke: #555; stroke-width: 2.4; transition: all .2s ease;
      }

      /* 토글 ON → 막대·테두리만 빨강 */
      #btnDistance.active {
        border-color: #db4040;
        background: #fff !important;
      }
      #btnDistance.active svg rect {
        fill: #db4040; stroke: #db4040; stroke-width: 3;
      }
    `;
    document.head.appendChild(st);
  }

  // --- 버튼 생성 및 지도 컨트롤 레이어에 삽입 ---
  let btn = document.getElementById("btnDistance");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "btnDistance";
    btn.title = "거리 재기";
    btn.innerHTML = `
      <svg viewBox="0 0 36 24" aria-hidden="true">
        <rect x="2" y="5" width="32" height="14" rx="3" ry="3"></rect>
      </svg>
    `;

    // ✅ Kakao control 레이어에 삽입
    const ctrlLayer = document.querySelector(".map_controls, .custom_typecontrol");
    if (ctrlLayer) {
      // 로드뷰 아래에 붙이기
      const rvBtn = ctrlLayer.querySelector(".btn_roadview");
      if (rvBtn && rvBtn.parentElement) {
        rvBtn.parentElement.insertBefore(btn, rvBtn.nextSibling);
      } else {
        ctrlLayer.appendChild(btn);
      }
    } else {
      // fallback
      document.body.appendChild(btn);
      btn.style.position = "fixed";
      btn.style.top = "156px";
      btn.style.left = "10px";
      btn.style.zIndex = 300;
    }
  }

  // --- 거리 UI 스타일 ---
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
        background:#fff;
        color:#e53935;
        border:1px solid #e53935;
        border-radius:8px;
        padding:2px 6px;
        font-size:12px;
        font-weight:600;
        white-space:nowrap;
        box-shadow:0 2px 6px rgba(0,0,0,.12);
        margin-bottom:14px;
      }
      .km-total-box {
        background:#ffeb3b;
        color:#222;
        border:1px solid #e0c200;
        border-radius:10px;
        padding:6px 10px;
        font-size:13px;
        font-weight:700;
        box-shadow:0 2px 8px rgba(0,0,0,.15);
        pointer-events:none;
        white-space:nowrap;
      }
    `;
    document.head.appendChild(style);
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
        position,
        content: el,
        xAnchor: 0,
        yAnchor: 0,
        zIndex: 5300
      });
    }
    totalOverlay.setPosition(position);
    totalOverlay.setMap(map);
    totalOverlay.getContent().style.transform = `translate(${xOffset}px, ${-yOffset}px)`;
  }

  function updateTotalOverlayText() {
    if (!totalOverlay) return;
    const m = clickLine ? Math.round(clickLine.getLength()) : 0;
    totalOverlay.getContent().textContent = "총 거리: " + formatDist(m);
  }

  function removeTotalOverlay() {
    if (totalOverlay) { try { totalOverlay.setMap(null); } catch(_){} totalOverlay = null; }
  }

  function addDot(pos) {
    const el = document.createElement("div");
    el.className = "km-dot";
    const dot = new kakao.maps.CustomOverlay({
      position: pos,
      content: el,
      xAnchor: 0.5, yAnchor: 0.5, zIndex: 5000
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

  btn.addEventListener("click", () => {
    if (!mapExists()) return;
    drawing = !drawing;
    btn.classList.toggle("active", drawing);
    map.setCursor(drawing ? "crosshair" : "");
    if (drawing) {
      kakao.maps.event.addListener(map, "click", onMapClick);
    } else {
      kakao.maps.event.removeListener(map, "click", onMapClick);
      resetMeasure();
    }
  });
})();
