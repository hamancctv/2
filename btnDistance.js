// btnCapture.js — v2025-10-09 RV-SIMPLE-STABLE-DUAL-FIX
console.log("[btnCapture] 로딩됨 (RV-SIMPLE-STABLE-DUAL-FIX)");

(function () {
  function flash(msg) {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText =
      "position:fixed;left:50%;top:14px;transform:translateX(-50%);"+
      "background:rgba(0,0,0,.85);color:#fff;padding:8px 12px;border-radius:8px;"+
      "font-size:13px;z-index:9999;pointer-events:none";
    document.body.appendChild(el);
    setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .25s';},1100);
    setTimeout(()=>el.remove(),1500);
  }

  async function getAddressForCenter(latlng){
    return new Promise(resolve=>{
      if(!window.kakao?.maps?.services?.Geocoder) return resolve("");
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (res, status)=>{
        if(status===kakao.maps.services.Status.OK && res[0]){
          let addr = res[0].address?.address_name || "";
          addr = addr.replace(/^경상남도\s*함안군\s*/,"");
          resolve(addr);
        } else resolve("");
      });
    });
  }

  /* ===== 지도 캡처 ===== */
  async function captureStaticMap(){
    const map = window.map;
    if(!map){ flash("❗ 지도 객체가 아직 준비되지 않았어요"); return; }

    const center = map.getCenter();
    const level  = map.getLevel();
    const type   = map.getMapTypeId();
    const w = Math.min(2048, window.innerWidth  || 1024);
    const h = Math.min(2048, window.innerHeight || 768);

    const holder = document.createElement("div");
    holder.style.cssText = `position:fixed;left:-99999px;top:-99999px;width:${w}px;height:${h}px;overflow:hidden;`;
    document.body.appendChild(holder);

    const sMap = new kakao.maps.StaticMap(holder, {
      center: center,
      level: level,
      mapTypeId: type,
      marker: false
    });

    const img = holder.querySelector("img");
    if(!img){ holder.remove(); return; }

    const addr = await getAddressForCenter(center);
  // ✅ 이미지 로드 후 (Cloudflare Worker 프록시 이용)
img.addEventListener("load", async ()=>{
  const src = img.getAttribute("src");
  const proxy = "https://curly-disk-4116.tmxkwkd.workers.dev";  // 오빠 프록시 주소
  const proxiedUrl = `${proxy}?url=${encodeURIComponent(src)}`;

  try {
    const resp = await fetch(proxiedUrl);
    if (!resp.ok) throw new Error(resp.status);
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kakao_map.png"; // 파일 이름
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flash("🗺️ 지도 이미지 다운로드 완료!");
  } catch(e) {
    flash("❗ 다운로드 실패: " + e.message);
  } finally {
    holder.remove();
  }
}, { once:true });

    img.addEventListener("error", ()=>holder.remove(), { once:true });
  }

  /* ===== 로드뷰 처리 ===== */
  async function captureRoadview(){
    const rv = window.__rvInstance;
    const pos = rv?.getPosition?.() || window.map?.getCenter?.();
    if (!pos) { flash("❗ 로드뷰 좌표를 찾을 수 없어요."); return; }

    const lat = pos.getLat();
    const lng = pos.getLng();

    const rvUrl = `https://map.kakao.com/link/roadview/${lat},${lng}`;
    window.open(rvUrl, "_blank", "noopener");
    flash("🚗 카카오맵 로드뷰 새 창에서 열렸어요!");
  }

  /* ===== 모드 자동 감지 ===== */
  function isRoadviewActive(){
    // 1️⃣ body 클래스 확인
    if (document.body.classList.contains("view_roadview")) return true;

    // 2️⃣ __rvInstance가 있고, DOM이 표시 중이면 true
    const rvContainer = document.getElementById("roadview");
    if (window.__rvInstance && rvContainer && rvContainer.offsetParent !== null) return true;

    // 3️⃣ mapWrapper의 스타일 기반 백업 판별
    const mapWrapper = document.getElementById("mapWrapper");
    if (mapWrapper && mapWrapper.style.width && mapWrapper.style.width.includes("%") === false) {
      // 예: 로드뷰 모드 시 width: 50% 이하로 줄어드는 경우 감지
      const width = parseFloat(mapWrapper.style.width);
      if (width < window.innerWidth * 0.9) return true;
    }

    return false;
  }

  async function handleCapture(){
    if (isRoadviewActive()) await captureRoadview();
    else await captureStaticMap();
  }

  window.addEventListener("DOMContentLoaded", ()=>{
    const btn = document.getElementById("btnCapture");
    if(!btn) return;
    btn.addEventListener("click", handleCapture);
    console.log("[btnCapture] 초기화 완료 ✅ (Dual mode FIX: RV detection 강화)");
  });
})();
