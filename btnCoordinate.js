// btnCoordinate.js — v2025-10 SAVE-DELETE-FINAL
console.log("[btnCoordinate] loaded — save/delete persist version");

(function(){
  const STORAGE_KEY = "coordinatePins";
  const btn = document.getElementById("btnCoordinate");
  let active = false;
  let pins = [];

  // ========== 핀 생성 ==========
  function createPin(lat, lng) {
    const el = document.createElement("div");
    el.className = "coord-pin";
    el.style.position = "absolute";
    el.style.zIndex = 9999;
    el.style.transform = "translate(-50%, -100%)";
    el.innerHTML = "📍<span class='x-btn' style='margin-left:4px;cursor:pointer;'>❌</span>";

    const overlay = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(lat, lng),
      content: el,
      yAnchor: 1,
      zIndex: 9999
    });
    overlay.setMap(map);
    pins.push({ overlay, lat, lng });

    // 삭제 버튼
    el.querySelector(".x-btn").onclick = e => {
      e.stopPropagation();
      overlay.setMap(null);
      pins = pins.filter(p => p.overlay !== overlay);
      savePins();
    };

    savePins();
  }

  // ========== 저장 ==========
  function savePins() {
    const arr = pins.map(p => ({ lat: p.lat, lng: p.lng }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  // ========== 복원 ==========
  function restorePins() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;
    try {
      const arr = JSON.parse(data);
      arr.forEach(obj => createPin(obj.lat, obj.lng));
      console.log(`[btnCoordinate] ${arr.length}개 핀 복원됨`);
    } catch(e) {
      console.warn("[btnCoordinate] 핀 복원 실패:", e);
    }
  }

  // ========== 클릭 이벤트 ==========
  kakao.maps.event.addListener(map, "click", function(e){
    if(!active) return;
    const lat = e.latLng.getLat();
    const lng = e.latLng.getLng();
    createPin(lat, lng);
  });

  // ========== 토글 버튼 ==========
  btn.onclick = () => {
    active = !active;
    btn.classList.toggle("active", active);
    if (active) {
      map.setCursor("crosshair");
    } else {
      map.setCursor("");
    }
  };

  // ========== 초기 복원 ==========
  restorePins();

})();
