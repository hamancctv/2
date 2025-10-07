// drawGroupLinesMST.js — v2025-10-05-STABLE-FIX (safe LatLng)
(function(){
  console.log("[MST] loader start (safe LatLng)");

  function getDistanceLL(lat1, lng1, lat2, lng2){
    const R=6371000,toRad=Math.PI/180;
    const φ1=lat1*toRad,φ2=lat2*toRad;
    const dφ=(lat2-lat1)*toRad,dλ=(lng2-lng1)*toRad;
    const a=Math.sin(dφ/2)**2+Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  const mapReady=()=>window.map&&window.kakao&&kakao.maps&&typeof kakao.maps.Polyline==="function";
  window.groupLines=window.groupLines||[];

  function buildGroups(markers){
    const groups={};
    for(const m of markers){
      if(!m) continue;
      const lat=Number(m.__lat??(m.getPosition?.().getLat?.()??NaN));
      const lng=Number(m.__lng??(m.getPosition?.().getLng?.()??NaN));
      if(!isFinite(lat)||!isFinite(lng)) continue;

      m.__lat=lat; m.__lng=lng;
      let g=(m.group??m.line??"").toString().trim();
      if(!g) continue;
      if(/[^0-9\-]/.test(g)) continue; // 한글 등 있으면 패스

      const key=g.replace(/[-\s]/g,"");
      if(!groups[key]) groups[key]=[];
      groups[key].push(m);
    }
    console.log("[MST] built groups:",Object.keys(groups).length);
    return groups;
  }

  function createMSTLinesForGroup(map,list){
    const uniq=[...new Map(list.map(m=>[`${m.__lat},${m.__lng}`,m])).values()];
    if(uniq.length<2) return 0;
    const connected=[uniq[0]];
    let created=0;

    while(connected.length<uniq.length){
      let minEdge=null;
      for(const cm of connected){
        for(const tm of uniq){
          if(connected.includes(tm)) continue;
          const d=getDistanceLL(cm.__lat,cm.__lng,tm.__lat,tm.__lng);
          if(!minEdge||d<minEdge.dist) minEdge={from:cm,to:tm,dist:d};
        }
      }
      if(!minEdge) break;

      // ✅ 안전검사: 좌표값 모두 유효해야만 라인 생성
      const {from,to}=minEdge;
      if(!isFinite(from.__lat)||!isFinite(from.__lng)||!isFinite(to.__lat)||!isFinite(to.__lng)){
        console.warn("[MST] skip invalid edge",from,to);
        connected.push(to);
        continue;
      }

      const p1=new kakao.maps.LatLng(from.__lat,from.__lng);
      const p2=new kakao.maps.LatLng(to.__lat,to.__lng);
      const line=new kakao.maps.Polyline({
        map,
        path:[p1,p2],
        strokeWeight:3.5,
        strokeColor:"#db4040",
        strokeOpacity:0.9
      });
      window.groupLines.push(line);
      connected.push(to);
      created++;
    }
    console.log(`[MST] group ok (${uniq.length}) → ${created} lines`);
    return created;
  }

  function drawMSTAllGroups(){
    if(!mapReady()){console.warn("[MST] map not ready");return;}
    const map=window.map;
    if(window.groupLines.length>0){
      for(const ln of window.groupLines) try{ln.setMap(null);}catch(e){}
      window.groupLines=[];
      console.log("[MST] cleared lines");
      return;
    }
    // drawGroupLinesMST.js 파일 내부의 drawMSTAllGroups 함수 정의 부분 바로 뒤에 추가

  // ... (drawMSTAllGroups 함수가 끝나는 부분)

  // ✅ 전역 노출: 외부에서 drawGroupLinesMST(map, markers, isActive) 형태로 호출하는 대신
  //    토글 방식인 drawMSTAllGroups를 직접 노출하여 버튼 핸들러가 사용할 수 있게 합니다.
  window.drawMSTAllGroups = drawMSTAllGroups; 

 function initMSTButton(){
    const btn = document.getElementById("btnGroupMST"); 
    
    if (!btn) {
        console.warn("[MST] btnGroupMST element not found. Skipping initialization.");
        return;
    }

    btn.addEventListener("click",()=>{
      const on=btn.classList.toggle("active");
      drawMSTAllGroups(); // 👈 전역에 노출된 함수를 호출합니다.
      flash(on ? '그룹 연결을 시작합니다.' : '그룹 연결을 해제했습니다.');
    });
    console.log("[MST] ready (safe ver)");
}

// ... (나머지 코드)
    const markers=Array.isArray(window.markers)?window.markers:[];
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

 // drawGroupLinesMST.js 내부 (수정된 부분)
// drawGroupLinesMST.js 파일 내용
function initMSTButton(){
    const btn = document.getElementById("btnGroupMST"); // ⬅️ 기존 HTML 버튼을 찾습니다.
    
    if (!btn) {
        console.warn("[MST] btnGroupMST element not found. Skipping initialization.");
        return;
    }
    // ❌❌❌ 버튼 생성, 스타일 설정, appendChild 코드는 반드시 제거되어야 함 ❌❌❌

    btn.addEventListener("click",()=>{
      const on=btn.classList.toggle("active");
      drawMSTAllGroups();
    });
    console.log("[MST] ready (safe ver)");
}
  function waitForMapAndMarkers(){
    if(window.map&&Array.isArray(window.markers)&&window.markers.length>0){
      initMSTButton();
    }else{
      setTimeout(waitForMapAndMarkers,500);
    }
  }
  waitForMapAndMarkers();
})();
