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

  function initMSTButton(){
    if(document.getElementById("btnGroupMST")) return;
    const btn=document.createElement("button");
    btn.id="btnGroupMST";btn.title="그룹 MST 연결";
    btn.style.cssText=`position:fixed;top:204px;left:10px;width:40px;height:40px;
    border:1px solid #ccc;border-radius:8px;background:#fff;cursor:pointer;z-index:99998;`;
    btn.innerHTML=`<svg viewBox="0 0 36 36"><path d="M8 26 L18 10 L28 26 M18 10 L18 26"
    stroke="#555" stroke-width="2.4" fill="none"/></svg>`;
    document.body.appendChild(btn);
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
