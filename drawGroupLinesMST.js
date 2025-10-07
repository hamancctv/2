// drawGroupLinesMST.js — v2025-10-07-FINAL-FIX (Syntax & LatLng Safety)
(function(){
  console.log("[MST] loader start (final fix)");
  
  // flash 함수가 전역에 정의되어 있다고 가정하고 사용
  const flash = window.flash || console.log;

  // 거리 계산 함수 (Equirectangular approximation)
  function getDistanceLL(lat1, lng1, lat2, lng2){
    const R=6371000,toRad=Math.PI/180;
    const φ1=lat1*toRad,φ2=lat2*toRad;
    const dφ=(lat2-lat1)*toRad;
    const dλ=(lng2-lng1)*toRad * Math.cos((φ1+φ2)/2);
    return R*Math.sqrt(dφ*dφ + dλ*dλ);
  }

  const mapReady=()=>window.map&&window.kakao&&kakao.maps&&typeof kakao.maps.Polyline==="function";
  window.groupLines=window.groupLines||[];

  function buildGroups(markers){
    const groups={};
    for(const m of markers){
      if(!m) continue;
      // 좌표값은 Number 타입이어야 합니다.
      const lat=Number(m.__lat??(m.getPosition?.().getLat?.()??NaN));
      const lng=Number(m.__lng??(m.getPosition?.().getLng?.()??NaN));
      
      if(!isFinite(lat)||!isFinite(lng)) continue;

      m.__lat=lat; m.__lng=lng;
      let g=(m.group??m.line??"").toString().trim();
      if(!g) continue;
      if(/[^0-9\-]/.test(g)) continue; // 숫자, 하이픈 외 문자 제외

      const key=g.replace(/[-\s]/g,"");
      if(!groups[key]) groups[key]=[];
      groups[key].push(m);
    }
    console.log("[MST] built groups:",Object.keys(groups).length);
    return groups;
  }

  function createMSTLinesForGroup(map, list) {
    // 중복 마커 제거 및 유효 마커만 사용
    const uniq = [...new Map(list.map(m => [`${m.__lat},${m.__lng}`, m])).values()];
    if (uniq.length < 2) return 0;
    const connected = [uniq[0]];
    let created = 0;

    while (connected.length < uniq.length) {
        let minEdge = null;
        for (const cm of connected) {
            for (const tm of uniq) {
                if (connected.includes(tm)) continue;
                
                // 1차 유효성 검사 (isFinite)
                if (!isFinite(cm.__lat) || !isFinite(tm.__lat) || 
                    !isFinite(cm.__lng) || !isFinite(tm.__lng)) continue;

                const d = getDistanceLL(cm.__lat, cm.__lng, tm.__lat, tm.__lng);
                if (!minEdge || d < minEdge.dist) {
                    minEdge = { from: cm, to: tm, dist: d };
                }
            }
        }
        if (!minEdge) break;

        const { from, to } = minEdge;

        // 2차 유효성 검사 (LatLng 생성 직전)
        if (!isFinite(from.__lat) || !isFinite(from.__lng) || 
            !isFinite(to.__lat) || !isFinite(to.__lng)) {
            console.warn("[MST] skip invalid edge coordinates:", from, to);
            connected.push(to);
            continue;
        }

        try {
            // LatLng 객체 생성 (kakao.js:2 에러 발생 지점)
            const p1 = new kakao.maps.LatLng(from.__lat, from.__lng);
            const p2 = new kakao.maps.LatLng(to.__lat, to.__lng);

            const line = new kakao.maps.Polyline({
                map,
                path: [p1, p2],
                strokeWeight: 3.5,
                strokeColor: "#db4040",
                strokeOpacity: 0.9
            });
            window.groupLines.push(line);
            connected.push(to);
            created++;

        } catch (e) {
            console.error("[MST] FATAL ERROR: LatLng creation failed. Skipping edge.", e);
            connected.push(to); 
        }
    }
    console.log(`[MST] group ok (${uniq.length}) → ${created} lines`);
    return created;
}


function drawMSTAllGroups(){
    if(!mapReady()){console.warn("[MST] map not ready");return;}
    const map=window.map;
    
    // 1. 이미 선이 그려져 있으면 지우고 종료 (토글)
    if(window.groupLines.length>0){
      for(const ln of window.groupLines) try{ln.setMap(null);}catch(e){}
      window.groupLines=[];
      console.log("[MST] cleared lines");
      return;
    }
    
    // 2. 선이 없으면 새로 그립니다.
    const markers = Array.isArray(window.markers) ? window.markers : [];
    if(markers.length===0) return;
    
    const groups=buildGroups(markers);
    let total=0;
    for(const k in groups){
      const arr=groups[k];
      if(!arr||arr.length<2) continue;
      total+=createMSTLinesForGroup(map,arr);
    }
    console.log(`[MST] total lines: ${total}`);
}

// ✅ 전역 노출: 외부 핸들러가 없더라도 이 함수를 통해 접근할 수 있게 합니다.
window.drawMSTAllGroups = drawMSTAllGroups; 
  
function initMSTButton(){
    const btn = document.getElementById("btnGroupMST"); 
    
    if (!btn) {
        console.warn("[MST] btnGroupMST element not found. Skipping initialization.");
        return;
    }

    btn.addEventListener("click",()=>{
      const on=btn.classList.toggle("active");
      drawMSTAllGroups(); 
      // flash 함수가 존재할 때만 호출 (안전성 확보)
      if (typeof flash === 'function') {
         flash(on ? '그룹 연결을 시작합니다.' : '그룹 연결을 해제했습니다.');
      }
    });
    console.log("[MST] ready (safe ver)");
}

function waitForMapAndMarkers(){
    // window.markers가 배열이고 맵 객체가 준비될 때까지 기다립니다.
    if(window.map && Array.isArray(window.markers)){
      initMSTButton();
    }else{
      setTimeout(waitForMapAndMarkers,500);
    }
}
waitForMapAndMarkers();
})();
