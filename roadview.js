// roadview.js — v2025-10-EK-SPRITE-SYNC-FINAL (16-direction sprite 기반, full CSS/기능 완전체)
console.log("[roadview] loaded — EK sprite-sync version (FINAL • deploy)");

(function () {
  /* ========= CSS 주입 (동동이/웨지 sprite + 미니맵 리사이즈 핸들) ========= */
  if (!document.getElementById("rv-walker-css")) {
    const st = document.createElement("style");
    st.id = "rv-walker-css";
    st.textContent = `
      #rvWrapper {position:absolute; inset:0; display:none; z-index:0;}
      #roadview{width:100%;height:100%;}
      .view_roadview #rvWrapper{display:block;z-index:1;}
      .view_roadview #mapWrapper{
        position:absolute;left:8px;bottom:8px;width:26%;height:26%;
        min-width:200px;min-height:150px;border:2px solid #ccc;border-radius:8px;background:#fff;z-index:2;
        box-shadow:0 8px 24px rgba(0,0,0,.2);
      }

      /* === MapWalker (동동이 + 웨지) 안정화 패치 === */
      .MapWalker { position:absolute; margin:-26px 0 0 -51px; cursor:grab; z-index:2147483647; }
      .MapWalker.dragging{ cursor:grabbing; }
      .MapWalker.pick { outline:2px solid rgba(255,215,0,.7); border-radius:6px; }

      .MapWalker .figure,
      .MapWalker .angleBase,
      .MapWalker .angleFront {
        position:absolute; left:0; top:0;
        background-image:url(https://t1.daumcdn.net/localimg/localimages/07/2018/pc/roadview_minimap_wk_2018.png);
        background-repeat:no-repeat;
        transform:none !important; -webkit-transform:none !important; backface-visibility:hidden;
      }

      .MapWalker .angleBase { width:102px; height:52px; background-position:-834px -2px; opacity:.18; pointer-events:none;
        filter:sepia(1) saturate(5.5) hue-rotate(8deg) brightness(1.12) contrast(0.98); }
      .MapWalker .angleFront { width:102px; height:52px; pointer-events:none; opacity:.92;
        filter:sepia(1) saturate(5.5) hue-rotate(8deg) brightness(1.12) contrast(0.98); }
      .MapWalker .figure { width:25px; height:39px; left:38px; top:-2px; pointer-events:auto; }

      /* === 정확 매핑: angleFront (16방위) === */
      .MapWalker.m0  .angleFront{ background-position:-834px  -2px; }
      .MapWalker.m1  .angleFront{ background-position:-938px  -2px; }
      .MapWalker.m2  .angleFront{ background-position:-1042px -2px; }
      .MapWalker.m3  .angleFront{ background-position:-1146px -2px; }
      .MapWalker.m4  .angleFront{ background-position:-1250px -2px; }
      .MapWalker.m5  .angleFront{ background-position:-1354px -2px; }
      .MapWalker.m6  .angleFront{ background-position:-1458px -2px; }
      .MapWalker.m7  .angleFront{ background-position:-1562px -2px; }
      .MapWalker.m8  .angleFront{ background-position:-2px    -2px; }
      .MapWalker.m9  .angleFront{ background-position:-106px  -2px; }
      .MapWalker.m10 .angleFront{ background-position:-210px  -2px; }
      .MapWalker.m11 .angleFront{ background-position:-314px  -2px; }
      .MapWalker.m12 .angleFront{ background-position:-418px  -2px; }
      .MapWalker.m13 .angleFront{ background-position:-522px  -2px; }
      .MapWalker.m14 .angleFront{ background-position:-626px  -2px; }
      .MapWalker.m15 .angleFront{ background-position:-730px  -2px; }

      /* === 정확 매핑: figure (16방위) === */
      .MapWalker.m0  .figure{ background-position:-298px -114px; }
      .MapWalker.m1  .figure{ background-position:-335px -114px; }
      .MapWalker.m2  .figure{ background-position:-372px -114px; }
      .MapWalker.m3  .figure{ background-position:-409px -114px; }
      .MapWalker.m4  .figure{ background-position:-446px -114px; }
      .MapWalker.m5  .figure{ background-position:-483px -114px; }
      .MapWalker.m6  .figure{ background-position:-520px -114px; }
      .MapWalker.m7  .figure{ background-position:-557px -114px; }
      .MapWalker.m8  .figure{ background-position:-2px   -114px; }
      .MapWalker.m9  .figure{ background-position:-39px  -114px; }
      .MapWalker.m10 .figure{ background-position:-76px  -114px; }
      .MapWalker.m11 .figure{ background-position:-113px -114px; }
      .MapWalker.m12 .figure{ background-position:-150px -114px; }
      .MapWalker.m13 .figure{ background-position:-187px -114px; }
      .MapWalker.m14 .figure{ background-position:-224px -114px; }
      .MapWalker.m15 .figure{ background-position:-261px -114px; }

      /* === 미니맵 리사이저 핸들 === */
      #mapWrapper .rv-resizer {
        position:absolute; right:0; top:0; width:20px; height:20px;
        background:linear-gradient(225deg,#f4f4f4 0%,#f4f4f4 49.9%,transparent 50%);
        box-sizing:border-box; cursor:nesw-resize; z-index:9999; opacity:.75; transition:box-shadow .2s ease; display:none;
      }
      .view_roadview #mapWrapper .rv-resizer { display:block; }
      #mapWrapper .rv-resizer:hover {
        box-shadow:0 0 8px rgba(0,0,0,.25);
        background:linear-gradient(225deg,#e9e9e9 0%,#e9e9e9 49.9%,transparent 50%);
      }
    `;
    document.head.appendChild(st);
  }

  /* ========= 전역 모듈 노출 ========= */
  window.RoadviewModule = {};

  (function (exports) {
    /* ========= 내부 상태 ========= */
    let overlayOn = false;        // 로드뷰 토글 상태(내부)
    let mapWalker = null;         // 동동이
    let pickMode  = false;        // 동동이 pick 모드

    /* ========= 안전한 flash (없어도 죽지 않게) ========= */
    function safeFlash(msg) {
      try { (window.flash || window.showToast || console.log)(msg); } catch { console.log(msg); }
    }

    /* ========= MapWalker ========= */
    function MapWalker(pos, map, setRoadviewAt) {
      const c  = document.createElement("div"),
            ab = document.createElement("div"),
            af = document.createElement("div"),
            f  = document.createElement("div");
      c.className = "MapWalker";
      ab.className = "angleBase"; af.className = "angleFront"; f.className = "figure";
      c.append(ab, af, f);

      const w = new kakao.maps.CustomOverlay({ position: pos, content: c, yAnchor: 1, clickable: true });
      w.setZIndex(2147483647);

      this.walker   = w;
      this.content  = c;
      this.position = pos;

      const self = this;
      let dragging=false, startX=0, startY=0, startPt=null, moved=false;

      function onDown(ev){
        if (!overlayOn) return;
        ev.preventDefault();
        c.classList.add("dragging");
        dragging=true; moved=false;
        const t=ev.touches?ev.touches[0]:ev;
        startX=t.clientX; startY=t.clientY;
        const proj=map.getProjection();
        startPt=proj.containerPointFromCoords(self.position);
        map.setDraggable(false); map.setZoomable(false);
        document.addEventListener("mousemove", onMove, {passive:false});
        document.addEventListener("mouseup",   onUp,   {passive:false});
        document.addEventListener("touchmove", onMove, {passive:false});
        document.addEventListener("touchend",  onUp,   {passive:false});
      }
      function onMove(ev){
        if(!dragging) return;
        ev.preventDefault();
        const t=ev.touches?ev.touches[0]:ev;
        const dx=t.clientX-startX, dy=t.clientY-startY;
        if(Math.abs(dx)+Math.abs(dy)>3) moved=true;
        const proj=map.getProjection();
        const newPt=new kakao.maps.Point(startPt.x+dx, startPt.y+dy);
        const newPos=proj.coordsFromContainerPoint(newPt);
        self.setPosition(newPos);
      }
      function onUp(ev){
        if(!dragging) return;
        ev.preventDefault();
        dragging=false;
        c.classList.remove("dragging");
        map.setDraggable(true); map.setZoomable(true);
        if (moved) { try { setRoadviewAt(self.position); } catch(e){} }
        else {
          pickMode = !pickMode;
          c.classList.toggle("pick", pickMode);
          safeFlash(pickMode ? "이동할 위치를 지도에서 클릭" : "이동 취소");
        }
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup",   onUp);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend",  onUp);
      }
      c.addEventListener("mousedown",  onDown, {passive:false});
      c.addEventListener("touchstart", onDown, {passive:false});
    }
    MapWalker.prototype.setAngle = function(angle){
      if (!this.content) return;
      const a = ((angle % 360) + 360) % 360;
      const idx = Math.floor(((a + 11.25) % 360) / 22.5);
      const el = this.content;
      const keepPick = el.classList.contains("pick");
      el.className = el.className.replace(/\bm\d+\b/g, "").replace(/\s+/g, " ").trim();
      el.classList.add("m" + idx);
      if (keepPick) el.classList.add("pick");
    };
    MapWalker.prototype.setPosition=function(pos){ this.position=pos; this.walker.setPosition(pos); };
    MapWalker.prototype.setMap=function(m){ this.walker.setMap(m); };
    exports.MapWalker = MapWalker;

    /* ========= 헬퍼 ========= */
    function findNearestPanoId(p, rvClient, cb, arr=[50,100,200,400,800,1600,3000]){
      let i=0;
      (function next(){
        if(i>=arr.length) return cb(null);
        rvClient.getNearestPanoId(p, arr[i], id=>{
          if(id) return cb(id);
          i++; next();
        });
      })();
    }

    function setRoadviewAt(p, map, rv, rvClient){
      const container=document.getElementById("container");
      findNearestPanoId(p, rvClient, id=>{
        if(!id){ safeFlash("근처에 로드뷰가 없어요"); return; }
        if(!container.classList.contains("view_roadview")){
          container.classList.add("view_roadview"); map.relayout();
        }
        rv.setPanoId(id, p);
        map.setCenter(p);
        if(mapWalker) mapWalker.setPosition(p);
      });
    }
    // 외부에서 marker 클릭 시 호출할 수 있게 공개
    window.setRoadviewAt = function(pos){
      try {
        if (!overlayOn) return;
        const rv   = window.__rvInstance;
        const map  = window.__mapInstance;
        const rvc  = window.__rvClient;
        if (!rv || !map || !rvc) return;
        setRoadviewAt(pos, map, rv, rvc);
      } catch(e){}
    };

    function smoothWalkerCenter(map, rv, duration=400){
      if(!overlayOn || !mapWalker || !rv) return;
      try{
        const pos=rv.getPosition();
        const start=mapWalker.position||pos;
        const sLat=start.getLat(), sLng=start.getLng(), eLat=pos.getLat(), eLng=pos.getLng();
        const t0=performance.now();
        (function anim(){
          const t=Math.min(1,(performance.now()-t0)/duration);
          const eased=t<0.5?2*t*t:-1+(4-2*t)*t;
          const lat=sLat+(eLat-sLat)*eased;
          const lng=sLng+(eLng-sLng)*eased;
          const p=new kakao.maps.LatLng(lat,lng);
          mapWalker.setPosition(p); map.setCenter(p);
          if(t<1)requestAnimationFrame(anim);
        })();
      }catch(e){}
    }

    /* ========= 전역 상호작용 상태 동기화 (단순/명료) ========= */
 function syncMarkerInteraction() {
   window.isMarkerInteractionEnabled = !(window.overlayOn || window.isDistanceMode);
   if (typeof window.setAllMarkersClickable === "function") {
     try { window.setAllMarkersClickable(window.isMarkerInteractionEnabled); } catch {}
   }
 }
window.syncMarkerInteraction = syncMarkerInteraction; // 다른 모듈(거리재기 등)에서 호출 가능


    /* ========= initRoadview ========= */
    exports.initRoadview = function (map, rv, rvClient) {
      // 다른 모듈이 접근할 수 있도록 저장(선택)
      window.__mapInstance = map;
      window.__rvInstance  = rv;
      window.__rvClient    = rvClient;
      window.__rvReady = true; // ★ 추가: 최초 준비 플래그
  window.dispatchEvent(new CustomEvent("roadview-ready", { detail: { when: "init" } })); // ★ 추가: 준비 이벤트 발행
  
      const container = document.getElementById("container");
      const btn       = document.getElementById("roadviewControl");
      if (!btn) {
        console.warn("[roadview] roadviewControl 버튼을 찾지 못했습니다.");
      }

      kakao.maps.event.addListener(rv, "viewpoint_changed", () => {
        if(!overlayOn || !mapWalker) return;
        const vp = rv.getViewpoint();
        mapWalker.setAngle(vp.pan);
        smoothWalkerCenter(map, rv, 250);
      });

      kakao.maps.event.addListener(rv, "position_changed", () => {
        if(!overlayOn) return;
        const pos = rv.getPosition();
        if (mapWalker) mapWalker.setPosition(pos);
        try { map.panTo(pos, {duration:400}); } catch { map.setCenter(pos); }
      });

      // === 로드뷰 토글 버튼 ===
      if (btn) {
        btn.addEventListener("click", () => {
          const on = !overlayOn;
          overlayOn = on;
          window.overlayOn = on; // 전역 반영
          btn.classList.toggle("active", on);

          if (on) {
            // 로드뷰 진입 시 거리재기 자동 종료(있으면)
            try {
              if (window.isDistanceMode || window.distanceOn) {
                window.isDistanceMode = false;
                window.distanceOn = false;
                const distanceBtn = document.getElementById("btnDistance");
                if (distanceBtn) distanceBtn.classList.remove("active");
                if (typeof window.clearDistance === "function") window.clearDistance();
              }
            } catch (e) { console.warn("[roadview] 거리재기 자동 비활성화 실패:", e); }

            // 로드뷰 ON
            map.addOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);
            if(!mapWalker) mapWalker = new MapWalker(map.getCenter(), map, p => setRoadviewAt(p, map, rv, rvClient));
            mapWalker.setMap(map);
            setRoadviewAt(map.getCenter(), map, rv, rvClient);
            container.classList.add("view_roadview");
            map.relayout();
          } else {
            // 로드뷰 OFF
            map.removeOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);
            if (mapWalker) mapWalker.setMap(null);
            container.classList.remove("view_roadview");
            map.relayout();
          }

 window.overlayOn = on;
 syncMarkerInteraction();                    // 클릭/호버/마커클릭 가능 상태 일괄 동기화
        });
      }

      // 지도 클릭 시 pick 이동
      kakao.maps.event.addListener(map, "click", e => {
        if (!overlayOn) return;
        const p = e.latLng;
        if (pickMode && mapWalker) {
          mapWalker.setPosition(p);
          mapWalker.content.classList.remove("pick");
          pickMode = false;
        }
        setRoadviewAt(p, map, rv, rvClient);
      });

      /* -------- 미니맵 리사이즈 핸들 -------- */
      (function setupMiniMapResizer(){
        const wrapper = document.getElementById('mapWrapper');
        if (!wrapper || !container) return;

        let handle = wrapper.querySelector('.rv-resizer');
        if (!handle) { handle = document.createElement('div'); handle.className = 'rv-resizer'; wrapper.appendChild(handle); }

        const MIN_W=200, MIN_H=150;
        const clamp=(v,min,max)=>Math.max(min,Math.min(v,max));
        const maxW=()=>Math.min(window.innerWidth*0.9,900);
        const maxH=()=>Math.min(window.innerHeight*0.9,700);

        function loadSize(){
          try{
            const s=JSON.parse(localStorage.getItem('rvMiniSize')||'{}');
            if (s && s.w && s.h) {
              wrapper.style.width  = s.w + 'px';
              wrapper.style.height = s.h + 'px';
              map?.relayout?.();
            }
          }catch(e){}
        }
        function saveSize(w,h){
          try{ localStorage.setItem('rvMiniSize', JSON.stringify({w:Math.round(w),h:Math.round(h)})); }catch(e){}
        }

        let startX, startY, startW, startH, curW, curH, active=false, rafId=null;

        function applySize() {
          rafId = null;
          if (!curW || !curH) return;
          wrapper.style.width = curW + 'px';
          wrapper.style.height = curH + 'px';
          map?.relayout?.();
          try {
            if (overlayOn && mapWalker?.position) map.setCenter(mapWalker.position);
          } catch(e){}
        }

function onMove(ev) {
  if (!active) return;
  ev.preventDefault();
  const t = ev.touches ? ev.touches[0] : ev;
  const dx = t.clientX - startX;
  const dy = t.clientY - startY;

  // 각각 독립적으로 조정 (가로/세로 따로따로)
  curW = clamp(startW + dx, MIN_W, maxW());
  curH = clamp(startH - dy, MIN_H, maxH());

  if (!rafId) rafId = requestAnimationFrame(applySize);
}


        function onUp(ev) {
          if (!active) return;
          ev.preventDefault();
          active = false;
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          document.removeEventListener('touchmove', onMove);
          document.removeEventListener('touchend', onUp);
          if (curW && curH) saveSize(curW, curH);
          try {
            if (overlayOn && typeof smoothWalkerCenter === 'function') {
              smoothWalkerCenter(map, rv, 400);
            }
          } catch (e) {}
        }

        function onDown(ev){
          ev.preventDefault(); ev.stopPropagation();
          const t=ev.touches?ev.touches[0]:ev;
          startX=t.clientX; startY=t.clientY;
          const r=wrapper.getBoundingClientRect();
          startW=r.width; startH=r.height;
          active=true;
          document.addEventListener('mousemove', onMove, {passive:false});
          document.addEventListener('mouseup',   onUp,   {passive:false});
          document.addEventListener('touchmove', onMove, {passive:false});
          document.addEventListener('touchend',  onUp,   {passive:false});
        }

        handle.addEventListener('mousedown', onDown, {passive:false});
        handle.addEventListener('touchstart', onDown, {passive:false});

        // 로드뷰 on/off에 따른 크기 복원/원복
        const mo = new MutationObserver(()=>{
          const rvOn = container.classList.contains('view_roadview');
          if (rvOn) loadSize();
          else {
            wrapper.style.width='100%';
            wrapper.style.height='100%';
            map?.relayout?.();
          }
        });
        mo.observe(container, {attributes:true, attributeFilter:['class']});

        if (container.classList.contains('view_roadview')) loadSize();
      })();

    }; // end of initRoadview

  })(window.RoadviewModule);
  // ✅ 구버전 호환용 alias 추가 (에러 방지)
  window.syncInteractionLocks = window.syncMarkerInteraction;
})();