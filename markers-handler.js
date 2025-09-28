// markers-handler.js
(function () {
  // 기본 스타일
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover {
      padding:2px 6px;
      background:rgba(255,255,255,0.9);
      border:1px solid #ccc;
      border-radius:5px;
      font-size:12px;
      white-space: nowrap;
      user-select: none;
      transition: transform 0.15s ease;
    }
    .overlay-click {
      padding:5px 8px;
      background:rgba(255,255,255,0.95);
      border:1px solid #666;
      border-radius:5px;
      font-size:13px;
      white-space: nowrap;
      user-select: none;
    }
  `;
  document.head.appendChild(style);

  // 마커 초기화 함수
  window.initMarkers = function (map, positions) {
    const markers = [];
    const overlays = [];
    const clickOverlays = [];

    const normalHeight = 42;     // 마커 normal 높이
    const hoverHeight  = 50.4;   // 마커 hover  높이
    const baseY   = -(normalHeight + 2); // -44px
    const hoverY  = -(hoverHeight  + 2); // -54.4px

    // 마커 이미지 (normal / hover / click)
// normal 이미지 (기본)
const normalImage = new kakao.maps.MarkerImage(
  "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
  new kakao.maps.Size(30, 42),
  { offset: new kakao.maps.Point(15, 42) }
);

// hover 이미지 (마커 커짐)
const hoverImage = new kakao.maps.MarkerImage(
  "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
  new kakao.maps.Size(36, 50.4),
  { offset: new kakao.maps.Point(18, 50.4) }
);

// 클릭 "점프용" (같은 크기인데 offset만 내려감)
const jumpImage = new kakao.maps.MarkerImage(
  "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
  new kakao.maps.Size(30, 42),             // normal과 동일
  { offset: new kakao.maps.Point(15, 70) } // 👈 Y값을 70으로 내려 점프
);



    // zIndex 전면 유지용 카운터 (hover마다 1씩 증가, 해제해도 낮추지 않음)
    let zCounter = 100;

    // 선택(클릭) 상태
    let selectedMarker = null;
    let clickStartTime = 0;

    for (let i = 0; i < positions.length; i++) {
      (function (i) {
        // 1) 마커
        const marker = new kakao.maps.Marker({
          map,
          position: positions[i].latlng,
          image: normalImage,
          clickable: true,
        });

            // 🔽 여기에 넣으면 됨
kakao.maps.event.addListener(marker, "click", function () {
  // ✅ 좌표 input 업데이트
  const lat = positions[i].latlng.getLat();
  const lng = positions[i].latlng.getLng();
  document.getElementById("gpsyx").value = lat + ", " + lng;

  // ✅ 태그 제거 후 순수 텍스트 추출
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = positions[i].content;
  const nameText = (tempDiv.textContent || tempDiv.innerText || "").trim();

  // ✅ 앞 5글자 추출
  const prefix = nameText.substring(0, 5).toUpperCase();

  // ✅ 검색창 값 갱신 후 filter() 실행
  document.getElementById("keyword").value = prefix;
  filter();
});




        
            // ✅ 그룹 정보 주입 (없으면 null)
marker.group = positions[i].group ? String(positions[i].group) : null;

        
        // 2) hover 오버레이 (DOM 노드로 생성 → 이벤트/스타일 유지)
        const overlayContent = document.createElement("div");
        overlayContent.className = "overlay-hover";
        overlayContent.style.transform = `translateY(${baseY}px)`;
        overlayContent.textContent = positions[i].content;

        const overlay = new kakao.maps.CustomOverlay({
          position: positions[i].latlng,
          content: overlayContent,
          yAnchor: 1,
          map: null,
        });

        // 3) 클릭 오버레이 (크기 변화 없음, 기본 -44px 위치)
        const clickOverlayContent = document.createElement("div");
        clickOverlayContent.className = "overlay-click";
        clickOverlayContent.style.transform = `translateY(${baseY}px)`;
        clickOverlayContent.textContent = positions[i].content;

        const clickOverlay = new kakao.maps.CustomOverlay({
          position: positions[i].latlng,
          content: clickOverlayContent,
          yAnchor: 1,
          map: null,
        });

        // === Hover 공통 동작 (마커/오버레이 둘 다) ===
        function activateHover() {
          marker.__isMouseOver = true;

          // zIndex: 항상 증가 → 이전 전면 상태 유지
          zCounter++;
          marker.setZIndex(zCounter);
          overlay.setZIndex(zCounter);

          // 마커 이미지 hover
          if (marker !== selectedMarker) marker.setImage(hoverImage);

          // 오버레이 표시 + 위치를 hover 위치(-54.4px)로
          overlay.setMap(map);
          overlayContent.style.transform = `translateY(${hoverY}px)`;
        }

        function deactivateHover() {
          marker.__isMouseOver = false;

          // 마커 이미지는 선택된 마커가 아니면 normal로 복귀
          if (marker !== selectedMarker) marker.setImage(normalImage);

          // 오버레이 위치는 기본(-44px)로 복귀
          overlayContent.style.transform = `translateY(${baseY}px)`;

          // 레벨 > 3 이면 mouseout 시 자동 숨김
          if (map.getLevel() > 3) overlay.setMap(null);

          // zIndex는 내리지 않음(전면 유지)
        }

        // 마커 hover
        kakao.maps.event.addListener(marker, "mouseover", activateHover);
        kakao.maps.event.addListener(marker, "mouseout",  deactivateHover);

        // 오버레이 hover (오버레이 위로 마우스 이동해도 동일 효과)
        overlayContent.addEventListener("mouseover", activateHover);
        overlayContent.addEventListener("mouseout",  deactivateHover);

        // === Click (mousedown/up 분리) ===
// 클릭 시작 (mousedown)
let selectedMarker = null;
let selectedOverlay = null; // 🔹 현재 강조된 오버레이

// === 마커 클릭 ===
kakao.maps.event.addListener(marker, "mouseup", function () {
  const elapsed = Date.now() - clickStartTime;
  const delay = Math.max(0, 100 - elapsed);

  setTimeout(function () {
    if (marker === selectedMarker) {
      marker.setImage(normalImage); // 크기 그대로 복귀

      // 🔹 기존 강조 해제
      if (selectedOverlay) {
        selectedOverlay.style.transform = `translateY(${baseY}px)`;
        selectedOverlay.style.border = "1px solid #ccc";
      }

      // 🔹 현재 마커 hover 오버레이 숨김 (겹치지 않게)
      overlay.setMap(null);

      // 🔹 클릭 오버레이만 강조 상태로 표시
      clickOverlay.setZIndex(zCounter);
      clickOverlay.setMap(map);
      clickOverlay.getContent().style.border = "2px solid blue";
      clickOverlay.getContent().style.transform = `translateY(${hoverY}px) scale(1.1)`;

      selectedOverlay = clickOverlay.getContent(); // 현재 강조 저장

      // 좌표 input 업데이트
      const gpsyx = document.getElementById("gpsyx");
      if (gpsyx) {
        gpsyx.value =
          positions[i].latlng.getLat() + ", " + positions[i].latlng.getLng();
      }
    }
  }, delay);
});

// === 오버레이 클릭 → 마커 클릭과 동일 효과 ===
overlayContent.addEventListener("click", function () {
  // ✅ 좌표 input 업데이트
  const lat = positions[i].latlng.getLat();
  const lng = positions[i].latlng.getLng();
  document.getElementById("gpsyx").value = lat + ", " + lng;

  // ✅ 필터 적용
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = positions[i].content;
  const nameText = (tempDiv.textContent || tempDiv.innerText || "").trim();
  const prefix = nameText.substring(0, 5).toUpperCase();
  document.getElementById("keyword").value = prefix;
  filter();

  // 🔹 기존 강조 해제
  if (selectedOverlay) {
    selectedOverlay.style.transform = `translateY(${baseY}px)`;
    selectedOverlay.style.border = "1px solid #ccc";
  }

  // 🔹 현재 hover 오버레이 숨김
  overlay.setMap(null);

  // 🔹 클릭 오버레이 강조
  clickOverlay.setZIndex(zCounter);
  clickOverlay.setMap(map);
  clickOverlay.getContent().style.border = "2px solid blue";
  clickOverlay.getContent().style.transform = `translateY(${hoverY}px) scale(1.1)`;

  selectedOverlay = clickOverlay.getContent();
});
