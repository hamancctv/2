// overlay-hover + click 상태관리 통합버전 (v2025-10-05)
(function(){
  console.log("[overlay-hover handler] loaded v2025-10-05");

  // === 스타일 정의 ===
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover{
      padding:2px 6px;
      background-color:#fff !important;
      background:#fff !important;
      opacity:0.8 !important;
      border:1px solid rgba(204,204,204,1) !important;
      border-radius:5px;
      font-size:14px;
      white-space:nowrap;
      user-select:none;
      cursor:default; 
      transition:transform .15s ease, border .15s ease, background .15s ease;
      will-change:transform, border;
      transform:translateZ(0);
      backface-visibility:hidden;
      z-index:101;
    }
    .overlay-hover.front {
      z-index:9999 !important;
      border-color:#4a90e2 !important; /* 임시 강조 */
    }
    .overlay-hover.selected {
      border:2px solid #007bff !important;
      z-index:10000 !important;
    }
  `;
  document.head.appendChild(style);

  // === 상태 관리 ===
  let selectedOverlay = null;

  // === 전역 hover/클릭 이벤트 바인딩 ===
  document.addEventListener("mouseover", e => {
    const el = e.target.closest(".overlay-hover");
    if (!el) return;
    if (el.classList.contains("selected")) return; // 선택 상태는 그대로 둠
    el.classList.add("front");
  });

  document.addEventListener("mouseout", e => {
    const el = e.target.closest(".overlay-hover");
    if (!el) return;
    if (el.classList.contains("selected")) return;
    el.classList.remove("front");
  });

  document.addEventListener("click", e => {
    const el = e.target.closest(".overlay-hover");
    if (el) {
      // 다른 선택 해제
      if (selectedOverlay && selectedOverlay !== el){
        selectedOverlay.classList.remove("selected");
      }
      // 현재 선택 토글
      if (el.classList.contains("selected")) {
        el.classList.remove("selected");
        selectedOverlay = null;
      } else {
        el.classList.add("selected");
        selectedOverlay = el;
      }
      e.stopPropagation();
    } else {
      // 지도 클릭 등 외부 클릭 시 선택 해제
      if (selectedOverlay) {
        selectedOverlay.classList.remove("selected");
        selectedOverlay = null;
      }
    }
  });

})();
