// btnCapture.js — v2025-10-10 CAPSHOT-WORKER-AUTOFILE-FINAL
console.log("[btnCapture] 로딩됨 (Cloudflare Worker + ScreenshotOne 자동파일명)");

(function(){
  const PROXY = "https://curly-disk-4116.tmxkwkd.workers.dev"; // 오빠의 Worker 주소
  const API_KEY = "f3834da1e71634630b8d"; // ScreenshotOne Access Key

  function flash(msg){
    const el=document.createElement("div");
    el.textContent=msg;
    el.style.cssText="position:fixed;top:14px;left:50%;transform:translateX(-50%);"+
      "background:rgba(0,0,0,.85);color:#fff;padding:8px 12px;border-radius:8px;"+
      "font-size:13px;z-index:9999;pointer-events:none";
    document.body.appendChild(el);
    setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .25s';},1100);
    setTimeout(()=>el.remove(),1500);
  }

  function isRoadviewActive(){
    if(document.body.classList.contains("view_roadview")) return true;
    const rvContainer=document.getElementById("roadview");
    if(window.__rvInstance && rvContainer && rvContainer.offsetParent!==null) return true;
    return false;
  }

  const HIDE_SELECTORS=[
    ".toolbar",".toolbar2",".search-wrap",".gx-suggest-search",
    ".suggest-box",".distance-box","#guide","#btnCapture"
  ];
  function hideUI(){
    const hidden=[];
    HIDE_SELECTORS.forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>{
        if(el.style.display!=="none"){
          hidden.push(el);
          el.dataset.__prevDisplay=el.style.display;
          el.style.display="none";
        }
      });
    });
    return hidden;
  }
  function restoreUI(hidden){
    hidden.forEach(el=>{
      el.style.display=el.dataset.__prevDisplay||"";
      delete el.dataset.__prevDisplay;
    });
  }

  function getDateStr(){
    const d=new Date();
    const y=d.getFullYear();
    const m=(d.getMonth()+1).toString().padStart(2,"0");
    const dd=d.getDate().toString().padStart(2,"0");
    return `${y} ${m}${dd}`;
  }

  function getAddressName(lat, lng){
    return new Promise(resolve=>{
      if(!window.kakao?.maps?.services?.Geocoder) return resolve("");
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.coord2Address(lng, lat, (res, status)=>{
        if(status === kakao.maps.services.Status.OK && res[0]?.address){
          const addr = res[0].address;
          const name = [addr.region_3depth_name || addr.region_2depth_name || ""]
                        .filter(Boolean).join(" ");
          resolve(name);
        }else resolve("");
      });
    });
  }

  async function takeScreenshot(targetUrl, filename){
    try{
      flash("📸 ScreenshotOne 캡처중...");
      const target = `https://api.screenshotone.com/take?access_key=${API_KEY}`
        + `&url=${encodeURIComponent(targetUrl)}`
        + `&full_page=true&format=png&viewport_width=1920&viewport_height=1080&delay=1000`;

      const proxied = `${PROXY}?url=${encodeURIComponent(target)}`;
      const res = await fetch(proxied);
      if(!res.ok) throw new Error("캡처 실패: "+res.status);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      flash("✅ 캡처 완료! 자동 저장됐어요");
    }catch(e){
      console.error(e);
      flash("🚫 캡처 오류: "+e.message);
    }
  }

  async function handleCapture(){
    const hiddenEls = hideUI();
    try{
      const isRV = isRoadviewActive();
      const center = isRV
        ? window.__rvInstance?.getPosition?.()
        : window.map?.getCenter?.();
      const lat = center?.getLat?.() || 0;
      const lng = center?.getLng?.() || 0;
      const addrName = await getAddressName(lat, lng);
      const date = getDateStr();
      const prefix = isRV ? "roadview" : "map";
      const filename = `${prefix}(${date}) ${addrName||"좌표"}.png`;
      await takeScreenshot(location.href, filename);
    }finally{
      restoreUI(hiddenEls);
    }
  }

  window.addEventListener("DOMContentLoaded",()=>{
    const btn=document.getElementById("btnCapture");
    if(!btn){console.error("btnCapture 버튼 없음");return;}
    btn.addEventListener("click",handleCapture);
    console.log("[btnCapture] 이벤트 연결 완료 ✅ (Worker중계 ScreenshotOne)");
  });
})();
