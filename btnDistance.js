// btnDistance.js — 버튼/스타일 자동 주입 + 거리측정(로드뷰 모드일 때 자동 비활성)
// HTML 수정 불필요

(function () {
  console.log("[btnDistance] loaded");

  // -------- CSS 주입 --------
  function injectCSS() {
    if (document.getElementById("btnDistance-style")) return;
    const css = `
/* 버튼 스타일 (기존 툴바 톤과 유사) */
#btnDistance{
  width:40px; height:40px;
  display:inline-flex; align-items:center; justify-content:center;
  border:1px solid #ccc; border-radius:8px; background:#fff; color:#555;
  cursor:pointer; transition:all .2s ease; box-sizing:border-box;
  background: #fff center/18px 18px no-repeat;
}
#btnDistance:hover{ box-shadow:0 3px 12px rgba(0,0,0,.12); }
#btnDistance.active{
  border-color:#ff375f;
  box-shadow:0 0 0 2px rgba(255,55,95,.15) inset;
  color:#ff375f;
}
#btnDistance:disabled{
  opacity:.5; cursor:not-allowed; box-shadow:none;
}

/* 오버레이(구간/총거리) */
.km-dotOverlay, .km-totalOverlay{
  position:relative;
  background:#fff; border:1px solid #888; border-radius:6px;
  padding:4px 8px; font-size:12px; color:#222;
  box-shadow:0 2px 8px rgba(0,0,0,.15);
  white-space:nowrap;
}
.km-dotOverlay::after{
  content:""; position:absolute; left:50%; bottom:-6px; transform:translateX(-50%);
  border:6px solid transparent; border-top-color:#888;
}
.km-totalOverlay{ font-weight:600; }
    `.trim();
    const tag = document.createElement("style");
    tag.id = "btnDistance-style";
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  // -------- 버튼 주입 --------
  function ensureButton() {
    let btn = document.getElementById("btnDistance");
    if (btn) return btn;

    const toolbar = document.querySelector(".toolbar") || document.body;
    btn = document.createElement("button");
    btn.id = "btnDistance";
    btn.type = "button";
    btn.title = "거리측정";
    // 아이콘(자) — data URL SVG
    btn.style.backgroundImage =
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'><path fill='%23666' d='M2 17.5 17.5 2a2.121 2.121 0 0 1 3 3L5 20.5H2zM6.414 18 18 6.414 17.586 6 6 17.586zM8 20H5l3-3zM14 7l1-1l1 1l-1 1zM11 10l1-1l1 1l-1 1zM8 13l1-1l1 1l-1 1z'/></svg>\")";

    // 툴바에 붙이기(로드뷰 버튼 바로 아래 위치를 원하면 roadviewControl 다음에 삽입)
    const rvBtn = document.getElementById("roadviewControl");
    if (toolbar && rvBtn && rvBtn.parentElement === toolbar) {
      rvBtn.insertAdjacentElement("afterend", btn);
    } else {
      toolbar.appendChild(btn);
    }
    return btn;
  }

  // -------- Kakao 준비 대기 --------
  function whenReady(fn, tries = 0) {
    if (window.kakao && kakao.maps && window.map) return fn();
    if (tries > 200) return console.warn("[btnDistance] map not ready");
    setTimeout(() => whenReady(fn, tries + 1), 150);
  }

  // -------- 메인 --------
  function init() {
    injectCSS();
    const btn = ensureButton();

    let drawing = false;
    let clickLine = null;
    let lastPoint = null;
    let segOverlayList = []; // 여러 구간 라벨
    let totalOverlay = null;
    let segCount = 0;

    function addMapClick() {
      kakao.maps.event.addListener(map, "click", onMapClick);
    }
    function removeMapClick() {
      try { kakao.maps.event.removeListener(map, "click", onMapClick); } catch (e) {}
    }

    function resetMeasure() {
      if (clickLine) { clickLine.setMap(null); clickLine = null; }
      if (totalOverlay) { totalOverlay.setMap(null); totalOverlay = null; }
      segOverlayList.forEach(o => o.setMap(null));
      segOverlayList = [];
      lastPoint = null;
      segCount = 0;
    }

    function toggleMeasure() {
      // 로드뷰 모드에선 동동이가 우선 → 거리측정 비활성
      if (window.overlayOn) {
        // 시각적으로도 비활성
        btn.classList.remove("active");
        btn.blur();
        return;
      }
      drawing = !drawing;
      if (drawing) {
        resetMeasure();
        btn.classList.add("active");
        try { map.setCursor("crosshair"); } catch (_) {}
        addMapClick();
      } else {
        removeMapClick();
        btn.classList.remove("active");
        try { map.setCursor(""); } catch (_) {}
        resetMeasure();
      }
    }

    function onMapClick(mouseEvent) {
      if (!drawing) return;
      if (window.overlayOn) return; // 로드뷰 모드면 무시

      const pos = mouseEvent.latLng;

      if (!clickLine) {
        // 첫 점
        clickLine = new kakao.maps.Polyline({
          map,
          path: [pos],
          strokeWeight: 3,
          strokeColor: "#db4040",
          strokeOpacity: 1,
          strokeStyle: "solid",
        });
        lastPoint = pos;
        segCount = 0;
      } else {
        // 선 이어 추가
        const path = clickLine.getPath();
        path.push(pos);
        clickLine.setPath(path);

        showSegmentDistance(lastPoint, pos);
        lastPoint = pos;
      }
    }

    function showSegmentDistance(from, to) {
      const poly = new kakao.maps.Polyline({ path: [from, to] });
      const dist = Math.round(poly.getLength());

      segCount++;
      const seg = new kakao.maps.CustomOverlay({
        position: to,
        yAnchor: 1,
        content: `<div class="km-dotOverlay">구간 ${segCount}: ${dist}m</div>`,
      });
      seg.setMap(map);
      segOverlayList.push(seg);

      // 총 거리
      const totalDist = clickLine ? Math.round(clickLine.getLength()) : dist;
      if (totalOverlay) totalOverlay.setMap(null);
      totalOverlay = new kakao.maps.CustomOverlay({
        position: to,
        yAnchor: 1,
        content: `<div class="km-totalOverlay">총 거리: ${totalDist}m</div>`,
      });
      totalOverlay.setMap(map);
    }

    // 버튼 클릭 토글
    btn.addEventListener("click", toggleMeasure);

    // 로드뷰 모드 전환 감지 → 자동 종료/버튼 상태 갱신
    const container = document.getElementById("container");
    if (container) {
      const mo = new MutationObserver(() => {
        const rvOn = container.classList.contains("view_roadview");
        if (rvOn) {
          // 로드뷰 들어가면 끔
          if (drawing) {
            drawing = false;
            removeMapClick();
            btn.classList.remove("active");
            try { map.setCursor(""); } catch (_) {}
            resetMeasure();
          }
          // 버튼만 비활성화(클릭 자체는 막지 않지만 toggleMeasure에서 무시)
          btn.disabled = false; // 눌러도 무시하도록만 처리
        } else {
          btn.disabled = false;
        }
      });
      mo.observe(container, { attributes: true, attributeFilter: ["class"] });
    }

    console.log("[btnDistance] ready");
  }

  // 시작
  whenReady(init);

})();
