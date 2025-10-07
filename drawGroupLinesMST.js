// drawGroupLinesMST.js — v2025-10-08-FINAL-COMPLETE
(function(){
  console.log("[MST] loader start (final complete)");
  
  // flash 함수를 전역에서 가져오거나, 없으면 console.log로 대체 (안전성 확보)
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
      // 좌표값은 Number 타입이어야 하며, 유효성 검사
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
                
                // 1차 유효성 검사 (좌표 유효성 확인)
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
        
        // ✅ 마커의 위치를 LatLng 객체로 안전하게 가져오는 로직 (핵심)
        const p1Pos = from.getPosition ? from.getPosition() : (from.__lat && from.__lng ? new kakao.maps.LatLng(from.__lat, from.__lng) : null);
        const p2Pos = to.getPosition ? to.getPosition() : (to.__lat && to.__lng ? new kakao.maps.LatLng(to.__lat, to.__lng) : null);

        // ⭐️ LatLng 객체 유효성 검사: LatLng 객체가 유효한지 최종 확인
        if (!p1Pos || !p2Pos || typeof p1Pos.getLat !== 'function' || typeof p2Pos.getLat !== 'function') {
            console.warn("[MST] skip invalid LatLng object (Final Check):", from, to);
            connected.push(to);
            continue;
        }

        try {
            const line = new kakao.maps.Polyline({
                map,
                path: [p1Pos, p2Pos], // 안전하게 가져온 LatLng 객체 사용
                strokeWeight: 3.5,
                strokeColor: "#db4040",
                strokeOpacity: 0.9
            });
            window.groupLines.push(line);
            connected.push(to);
            created++;

        } catch (e) {
            console.error("[MST] FATAL ERROR: Polyline creation failed. Skipping edge.", e);
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
    const allMarkers = Array.isArray(window.markers) ? window.markers : [];
    
    // ⚠️ 충돌 방지: MapWalker 객체를 markers 배열에서 확실히 제외합니다.
    const markers = allMarkers.filter(m => !(m.content && m.content.classList && m.content.classList.contains('MapWalker')));
    
    if(markers.length < 2) {
        console.log("[MST] Markers count less than 2, skip drawing.");
        return;
    }
    
    const groups=buildGroups(markers);
    let total=0;
    for(const k in groups){
      const arr=groups[k];
      if(!arr||arr.length<2) continue;
      total+=createMSTLinesForGroup(map,arr);
    }
    console.log(`[MST] total lines: ${total}`);
}

// 전역 노출: 외부에서 접근 가능하도록 합니다.
window.drawMSTAllGroups = drawMSTAllGroups; 
  
function initMSTButton(){
    const btn = document.getElementById("btnGroupMST"); 
    
    if (!btn) {
        console.warn("[MST] btnGroupMST element not found. Skipping initialization.");
        return;
    }

    btn.addEventListener("click",()=>{
      const on=btn.classList.toggle("active");
      
      // ✅ 충돌 방지 로직: MST 활성화 시 다른 모드를 강제로 해제합니다.
      if (on) {
          // 로드뷰 비활성화
          const rvBtn = document.getElementById('roadviewControl');
          if (rvBtn && rvBtn.classList.contains('active')) {
              rvBtn.click(); // 버튼 클릭 이벤트로 로드뷰 해제
              if (typeof flash === 'function') flash('로드뷰를 해제했습니다.');
          }
          // 거리재기 비활성화
          const distBtn = document.getElementById('btnDistance');
          if (distBtn && distBtn.classList.contains('active')) {
              distBtn.click(); // 버튼 클릭 이벤트로 거리재기 해제
              if (typeof flash === 'function') flash('거리재기를 해제했습니다.');
          }
      }

      drawMSTAllGroups(); 
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
