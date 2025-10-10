// btnCapture.js — v2025-10-10-MINIMAL-EXT-STABLE
console.log("[btnCapture] 로딩 (확장 전용 최소판)");

(function () {
  const EXTENSION_NAME = "스크린샷 확장";
  const EXTENSION_STORE_URL = "https://chromewebstore.google.com/detail/your-extension-id";
  const HIDE_SELECTORS = [
    ".toolbar",".toolbar2",".search-wrap",".gx-suggest-search",
    ".suggest-box",".distance-box","#guide","#btnCapture"
  ];
  const MAP_SEL = "#map";
  const RV_SEL  = "#roadview";

  let hiddenEls = [];

  function flash(msg){
    const el=document.createElement("div");
    el.textContent=msg;
    el.style.cssText="position:fixed;top:14px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.85);color:#fff;padding:8px 12px;border-radius:8px;font-size:13px;z-index:99999;pointer-events:none";
    document.body.appendChild(el);
    setTimeout(()=>{el.style.opacity="0";el.style.transition="opacity .25s";},1100);
    setTimeout(()=>el.remove(),1500);
  }

  function hideUI(){
    hiddenEls=[];
    const mapEl=document.querySelector(MAP_SEL);
    const rvEl=document.querySelector(RV_SEL);
    const protect=(el)=>{
      if(!el)return false;
      if(el===mapEl||el===rvEl)return true;
      if(mapEl&&el.contains(mapEl))return true;
      if(rvEl&&el.contains(rvEl))return true;
      return false;
    };
    HIDE_SELECTORS.forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>{
        if(!el||protect(el))return;
        el.dataset.__prevOpacity=el.style.opacity||"";
        el.style.opacity="0";
        el.style.pointerEvents="none";
        hiddenEls.push(el);
      });
    });
  }

  function restoreUI(){
    hiddenEls.forEach(el=>{el.style.opacity=el.dataset.__prevOpacity||"";delete el.dataset.__prevOpacity;});
    hiddenEls=[];
  }

  function showInstallModal(){
    const wrap=document.createElement("div");
    wrap.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483647;display:flex;align-items:center;justify-content:center";
    const box=document.createElement("div");
    box.style.cssText="width:min(480px,92vw);background:#111;color:#fff;border:1px solid #333;border-radius:12px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.6)";
    box.innerHTML=`
      <div style="font-weight:700;font-size:16px;margin-bottom:8px">${EXTENSION_NAME} 설치 필요</div>
      <div style="font-size:13px;line-height:1.6;color:#ddd;margin-bottom:14px;white-space:pre-wrap">
        현재 탭만 정확히 캡처하려면 확장이 필요합니다.
        [설치하기]를 누르면 스토어 페이지가 열립니다.
        매우 강력한 캡처도구를 제공하니 반드시 설치하여 사용하시기 바랍니다.
        *설치방법은 개발자에게 문의하세요.
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="mdCancel" style="background:#222;border:1px solid #444;color:#ccc;border-radius:8px;padding:8px 12px;cursor:pointer">닫기</button>
        <button id="mdOk" style="background:#3b82f6;border:1px solid #2c62b9;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer">설치하기</button>
      </div>`;
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    box.querySelector("#mdOk").onclick=()=>{window.open(EXTENSION_STORE_URL,"_blank","noopener");wrap.remove();};
    box.querySelector("#mdCancel").onclick=()=>wrap.remove();
  }

async function startCaptureFlow(){
  hideUI();

  // 지도좌표 안전하게 가져오기
  let info = { lat: null, lng: null, addr: "" };
  try {
    if (window.map && window.kakao?.maps?.services) {
      const center = map.getCenter();
      info.lat = center.getLat();
      info.lng = center.getLng();

      // 주소 변환
      const geocoder = new kakao.maps.services.Geocoder();
      info.addr = await new Promise(res=>{
        geocoder.coord2Address(info.lng, info.lat, (result,status)=>{
          if(status===kakao.maps.services.Status.OK){
            const a = result[0].address;
            res((a.region_2depth_name || a.region_1depth_name || "")+" "+(a.road_name || a.address_name || ""));
          } else res("");
        });
      });
    }
  } catch(e){
    console.warn("[btnCapture] 지도정보 추출 실패", e);
  }

  // 확장으로 지도정보 전달
  window.postMessage({
    type: "CAPTURE_START",
    mapInfo: info,
    timestamp: Date.now()
  }, "*");

  flash("확장 아이콘 또는 단축키로 캡처하세요");

  // 확장 완료 후 복원
  window.addEventListener("message", function onMsg(ev){
    if(ev.data?.type==="CAPTURE_DONE"){
      window.removeEventListener("message", onMsg);
      restoreUI();
      flash("UI 복원됨");
    }
  });
}


  function handleClick(e){
    e.preventDefault();e.stopPropagation();
    if(window.hasCaptureExtension){ // 확장이 존재하면
      startCaptureFlow();
    }else{
      showInstallModal();
    }
  }

  function bind(){
    const btn=document.getElementById("btnCapture");
    if(!btn){console.error("btnCapture 버튼 없음");return;}
    if(!btn.getAttribute("type"))btn.setAttribute("type","button");
    btn.addEventListener("click",handleClick,{passive:false});
    console.log("[btnCapture] 이벤트 연결 완료 ✅ (간소화 확장모드)");
  }

  if(document.readyState==="loading"){
    window.addEventListener("DOMContentLoaded",bind);
  }else{
    bind();
  }
})();
