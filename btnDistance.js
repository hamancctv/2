// btnDistance.js — 거리재기(툴바 자동삽입 + fallback 고정형)
(function () {
  console.log("[btnDistance] loaded hybrid version");

  const mapExists = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function";

  // ===== 스타일 (버튼 + 측정요소)
  if (!document.getElementById("btnDistance-style")) {
    const st = document.createElement("style");
    st.id = "btnDistance-style";
    st.textContent = `
      /* 기본 버튼 */
      #btnDistance {
        width:40px; height:40px;
        display:inline-flex; align-items:center; justify-content:center;
        border:1px solid #ccc; border-radius:8px;
        background:#fff; color:#555; cursor:pointer;
        transition:all .2s ease; box-sizing:border-box;
      }
      #btnDistance:hover { box-shadow:0 3px 12px rgba(0,0,0,.12); }
      #btnDistance.active{
        border-color:#007aff; box-shadow:0 0 0 2px rgba(0,122,255,.15) inset; color:#007aff;
      }

      /* toolbar 없을 때 고정형 fallback */
      body > #btnDistance.fallback {
        position:fixed; top:68px; left:10px; z-index:9999;
      }

      /* 점(흰 원 + 빨간 테두리) */
      .km-dot {
        width:12px; height:12px; border:2px solid #e53935;
        background:#fff; border-radius:50%;
        box-shadow:0 0 0 1px rgba(0,0,0,.06);
      }
      /* 구간 박스 */
      .km-seg {
        background:#fff; color:#e53935; border:1px solid #e53935;
        border-radius:8px; padding:2px 6px;
        font-size:12px; font-weight:600; white-space:nowrap;
        box-shadow:0 2px 6px rgba(0,0,0,.12);
      }
      /* 총거리 박스: 지도 우상단 고정 */
      .km-total-box {
        position:absolute; right:8px; top:8px; z-index:660;
        background:#ffeb3b; color:#222; border:1px solid #e0c200;
        border-radius:10px; padding:6px 10px;
        font-size:13px; font-weight:700;
        box-shadow:0 2px 8px rgba(0,0,0,.15);
        pointer-events:none;
      }
    `;
    document.head.appendChild(st);
  }

  // ===== 버튼 준비
  const toolbar = document.querySelector(".toolbar");
  let btn = document.getElementById("btnDistance");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "btnDistance";
    btn.title = "거리 재기";
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" style="width:18px;height:18px;">
        <path d="M3 17l1.5 1.5L7 16l-2-2-2 3zm3-3l3 3 8.5-8.5-3-3L6 11zm10-8l3 3 1-1a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-1 1z"/>
      </svg>`;
  }

  // 툴바에 있으면 로드뷰 버튼 아래에, 없으면 body에 fallback으로
  if (toolbar) {
    const rvBtn = toolbar.querySelector("#roadviewControl");
    if (rvBtn && rvBtn.nextSibling) toolbar.insertBefore(btn, rvBtn.nextSibling);
    else if (rvBtn) toolbar.appendChild(btn);
    else toolbar.appendChild(btn);
    btn.classList.remove("fallback");
  } else {
    document.body.appendChild(btn);
    btn.classList.add("fallback");
  }

  // ===== 내부 상태
  let drawing = false;
  let clickLine = null;
  let dots = [];
  let segOverlays = [];
  let totalBoxEl = null;
  const fmt = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const mapWrapper = document.getElementById("mapWrapper") || document.body;

  // 총거리 박스
  function ensureTotalBox() {
    if (!totalBoxEl) {
      totalBoxEl = document.createElement("div");
      totalBoxEl.className = "km-total-box";
      totalBoxEl.style.display = "none";
      mapWrapper.appendChild(totalBoxEl);
    }
    totalBoxEl.style.display = "block";
  }
  function hideTotalBox() {
    if (totalBoxEl) totalBoxEl.style.display = "none";
  }
  function updateTotalBox() {
    if (!totalBoxEl) return;
    if (!clickLine) { totalBoxEl.textContent = "총 거리: 0 m"; return; }
    const m = Math.round(clickLine.getLength());
    totalBoxEl.textContent = m >= 1000
      ? `총 거리: ${(m/1000).toFixed(2)} km`
      : `총 거리: ${fmt(m)} m`;
  }

  // 점 추가
  function addDot(pos) {
    const el = document.createElement("div");
    el.className = "km-dot";
    const dot = new kakao.maps.CustomOverlay({
      position: pos, content: el, xAnchor: 0.5, yAnchor: 0.5, zIndex: 5000
    });
    dot.setMap(map);
    dots.push(dot);
  }

  // 구간 박스 추가
  function addSegmentBox(pos, txt) {
    const el = document.createElement("div");
    el.className = "km-seg"; el.textContent = txt;
    const seg = new kakao.maps.CustomOverlay({
      position: pos, content: el, yAnchor: 1, zIndex: 5200
    });
    seg.setMap(map);
    segOverlays.push(seg);
  }

  // 초기화
  function resetMeasure() {
    if (clickLine) { clickLine.setMap(null); clickLine = null; }
    dots.forEach(d => { try { d.setMap(null); } catch(_){} });
    segOverlays.forEach(o => { try { o.setMap(null); } catch(_){} });
    dots = []; segOverlays = [];
    hideTotalBox();
  }

  // 지도 클릭
  function onMapClick(e) {
    if (!drawing || !mapExists()) return;
    const pos = e.latLng;
    if (!clickLine) {
      clickLine = new kakao.maps.Polyline({
        map, path: [pos], strokeWeight: 3, strokeColor: "#db4040",
        strokeOpacity: 1, strokeStyle: "solid"
      });
      addDot(pos);
    } else {
      const path = clickLine.getPath();
      const prev = path[path.length - 1];
      path.push(pos);
      clickLine.setPath(path);

      const segLine = new kakao.maps.Polyline({ path: [prev, pos] });
      const dist = Math.round(segLine.getLength());
      addSegmentBox(pos, `${fmt(dist)} m`);
      addDot(pos);
    }
    ensureTotalBox(); updateTotalBox();
  }

  // 토글
  btn.addEventListener("click", function() {
    if (!mapExists()) return console.warn("[btnDistance] map not ready");
    drawing = !drawing;
    btn.classList.toggle("active", drawing);
    btn.setAttribute("aria-pressed", drawing ? "true" : "false");

    if (drawing) {
      resetMeasure();
      map.setCursor("crosshair");
      kakao.maps.event.addListener(map, "click", onMapClick);
    } else {
      kakao.maps.event.removeListener(map, "click", onMapClick);
      map.setCursor("");
      resetMeasure();
    }
  });
})();
