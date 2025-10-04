// btnDistance-fixed.js — 거리재기(픽스형, 제안창 아래, 위성뷰·로드뷰 정상, 막대·테두리만 빨강)
(function () {
  console.log("[btnDistance] loaded v2025-10-FINAL-STABLE");

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
        z-index: 400; /* ✅ 제안창(600~700)보다 아래 */
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

      /* ✅ 기본 막대 색 (회색) */
      #btnDistance svg {
        width: 26px; height: 26px; display: block;
      }
      #btnDistance svg rect {
        fill: #555;
        stroke: #555;
        stroke-width: 2.4;
        transition: all .2s ease;
      }

      /* ✅ 토글 ON → 막대·테두리만 빨강 (배경은 흰색 고정) */
      #btnDistance.active {
        border-color: #db4040;
        background: #fff !important;
      }
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
        <rect x="2" y="5" width="32" height="14" rx="3" ry="3"></rect>
      </svg>
    `;
    // ✅ body가 아니라 mapWrapper 내부에 추가 (제안창과 같은 컨텍스트)
    (document.getElementById("mapWrapper") || document.body).appendChild(btn);
  }

  // --- 거리 UI 스타일 ---
  if (!document.getElementById("btnDistance-style")) {
    const style = document.createElement("style");
    style.id = "btnDistance-style";
    style.textContent = `
      /* 점 */
      .km-dot {
        width: 12px; height: 12px;
        border: 2px solid #e53935;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 0 1px rgba(0,0,0,.06);
      }
      /* 구간 박스 */
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
      /* 총거리 박스 */
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

  // --- 총거리 박스 (마지막 점 오른쪽 아래 8px) ---
  function ensureTotalOverlay(position) {
    const xOffset = 8;
    const yOffset = -8;
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
    const el = totalOverlay.getContent();
    el.style.transform = `translate(${xOffset}px, ${-yOffset}px)`;
  }

  function updateTotalOverlayText() {
    if (!totalOverlay) return;
    const m = clickLine ? Math.round(clickLine.getLength()) : 0;
    totalOverlay.getContent().textContent =
      "총 거리: " + formatDist(m);
  }

  function removeTotalOverlay() {
    if (totalOverlay) {
      try { totalOverlay.setMap(null); } catch (_) {}
      totalOverlay = null;
    }
  }

  // --- 점/구간 ---
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

  // --- 초기화 ---
  function resetMeasure() {
    if (clickLine) { clickLine.setMap(null); clickLine = null; }
    dots.forEach(d => { try { d.setMap(null); } catch (_) {} });
    segOverlays.forEach(o => { try { o.setMap(null); } catch (_) {} });
    dots = [];
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

  // --- 토글 ---
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
