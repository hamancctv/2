<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>GIS 라이트</title>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />

<!-- Kakao Maps SDK (services + 수동 로드) -->
<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=5f253bed8a8966a66fc9076b662663fd&libraries=services&autoload=false"></script>

<!-- 기존 스타일 -->
<link rel="stylesheet" href="https://hamancctv.github.io/2/style.css" />

<style>
  html, body { height:100%; margin:0; }
  #container { position:relative; height:100%; overflow:hidden; }
  #mapWrapper { position:relative; width:100%; height:100%; z-index:1; }
  #map { width:100%; height:100%; }

  /* 로드뷰 전체화면(지도는 미니맵) */
  #rvWrapper { position:absolute; inset:0; display:none; z-index:0; }
  #roadview  { width:100%; height:100%; }
  .view_roadview #rvWrapper { display:block; z-index:1; }
  .view_roadview #mapWrapper {
    position:absolute; left:8px; bottom:8px;
    width:26%; height:26%;
    min-width:200px; min-height:150px;
    border:2px solid #ccc; border-radius:8px; background:#fff; z-index:2;
    box-shadow:0 8px 24px rgba(0,0,0,.2);
  }

  /* 로드뷰 닫기 */
  #close {
    position:absolute; top:8px; left:8px;
    padding:6px; background:#fff; border:1px solid #c8c8c8; border-radius:6px;
    cursor:pointer; z-index:3; box-shadow:0 1px #888;
  }
  #close .img {
    display:block; width:14px; height:14px;
    background:url(https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/rv_close.png) no-repeat;
  }

  /* 좌측 툴바 */
  .toolbar { position:absolute; top:60px; left:10px; display:flex; flex-direction:column; gap:8px; z-index:620; }

  .btn-satellite {
    width:40px; height:40px;
    display:inline-flex; align-items:center; justify-content:center;
    border:1px solid #ccc; border-radius:8px; background:#fff; color:#555;
    cursor:pointer; transition:all .2s ease; box-sizing:border-box;
  }
  .btn-satellite:hover { box-shadow:0 3px 12px rgba(0,0,0,.12); }
  .btn-satellite.selected { border-color:#007aff; box-shadow:0 0 0 2px rgba(0,122,255,.15) inset; color:#007aff; }
  .btn-satellite svg { width:18px; height:18px; display:block; }
  .btn-satellite svg circle { fill:currentColor; }

  /* 로드뷰 버튼 */
  #roadviewControl{
    width:40px; height:40px;
    display:inline-flex; align-items:center; justify-content:center;
    cursor:pointer;
    border:1px solid #ccc; border-radius:8px; background:#fff !important;
    background-image:none !important;
    color:#555; transition:all .2s ease; box-sizing:border-box;
  }
  #roadviewControl:hover{ box-shadow:0 3px 12px rgba(0,0,0,.12); }
  #roadviewControl.active{
    border-color:#007aff; box-shadow:0 0 0 2px rgba(0,122,255,.15) inset; color:#007aff;
  }
  #roadviewControl::before{
    content:"";
    width:18px; height:18px; border-radius:50%;
    display:block;
    background: radial-gradient(#fff 0 28%, currentColor 29% 100%);
  }

  /* 미니맵 크기조절 핸들 (↗ 드래그: 위/오른쪽으로 끌수록 커짐) */
  #mapWrapper .rv-resizer{
    position:absolute; right:6px; top:6px;
    width:16px; height:16px;
    border:1px solid #bbb; border-radius:4px; background:#fff;
    box-shadow:0 1px 3px rgba(0,0,0,.2);
    cursor: nesw-resize;
    z-index:650; display:none;
  }
  #mapWrapper .rv-resizer::before{
    content:""; position:absolute; inset:2px;
    background: linear-gradient(135deg, transparent 50%, #888 0) no-repeat;
    opacity:.7;
  }
  .view_roadview #mapWrapper .rv-resizer{ display:block; }

  /* === MapWalker (노란 웨지 + 회전) === */
  .MapWalker {position:absolute; margin:-26px 0 0 -51px; cursor:grab;}
  .MapWalker.dragging{ cursor:grabbing; }
  .MapWalker.pick { outline:2px solid rgba(255,215,0,.7); border-radius:6px; }
  .MapWalker .figure {
    position:absolute; width:25px; left:38px; top:-2px; height:39px;
    background:url(https://t1.daumcdn.net/localimg/localimages/07/2018/pc/roadview_minimap_wk_2018.png) -298px -114px no-repeat;
    pointer-events:none;
  }
  .MapWalker .angleBase,
  .MapWalker .angleFront{
    position:absolute; left:0; top:0; width:102px; height:52px;
    background-image:url(https://t1.daumcdn.net/localimg/localimages/07/2018/pc/roadview_minimap_wk_2018.png);
    background-repeat:no-repeat;
    filter: hue-rotate(180deg) saturate(180%) brightness(1.12);
  }
  .MapWalker .angleBase{
    background-position:-834px -2px;
    opacity:.40;
  }
  .MapWalker .angleFront{ opacity:.95; }
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
  .MapWalker.m0  .figure{background-position:-298px -114px;}
  .MapWalker.m1  .figure{background-position:-335px -114px;}
  .MapWalker.m2  .figure{background-position:-372px -114px;}
  .MapWalker.m3  .figure{background-position:-409px -114px;}
  .MapWalker.m4  .figure{background-position:-446px -114px;}
  .MapWalker.m5  .figure{background-position:-483px -114px;}
  .MapWalker.m6  .figure{background-position:-520px -114px;}
  .MapWalker.m7  .figure{background-position:-557px -114px;}
  .MapWalker.m8  .figure{background-position:-2px   -114px;}
  .MapWalker.m9  .figure{background-position:-39px  -114px;}
  .MapWalker.m10 .figure{background-position:-76px  -114px;}
  .MapWalker.m11 .figure{background-position:-113px -114px;}
  .MapWalker.m12 .figure{background-position:-150px -114px;}
  .MapWalker.m13 .figure{background-position:-187px -114px;}
  .MapWalker.m14 .figure{background-position:-224px -114px;}
  .MapWalker.m15 .figure{background-position:-261px -114px;}
</style>
</head>
<body>
  <div id="container">
    <!-- 지도 -->
    <div id="mapWrapper">
      <div id="map"></div>

      <!-- 좌측 툴바 -->
      <div class="toolbar">
        <button id="btnSatellite" class="btn-satellite" title="위성뷰">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>
        </button>
        <button id="roadviewControl" title="로드뷰"></button>
      </div>

      <!-- 미니맵 리사이저 -->
      <div class="rv-resizer" aria-hidden="true"></div>
    </div> <!-- mapWrapper 닫기 -->

    <!-- 로드뷰(전체화면) -->
    <div id="rvWrapper">
      <div id="roadview"></div>
      <div id="close" title="로드뷰 닫기"><span class="img"></span></div>
    </div>
  </div>

  <!-- 기존 스크립트들 -->
  <script src="https://code.jquery.com/jquery-3.6.1.min.js"></script>
  <script src="https://hamancctv.github.io/2/sel_suggest.js"></script>
  <script src="https://hamancctv.github.io/2/drawGroupLinesMST.js"></script>
  <script src="https://hamancctv.github.io/2/btnDistance.js"></script> <!-- 외부 파일 유지 가능 -->
  <script src="https://hamancctv.github.io/2/markers-handler.js"></script>
  <script src="https://hamancctv.github.io/2/search-suggest.js"></script>

<script>
/* 짧은 헬퍼 */
const $  = s => document.querySelector(s);

/* 전역 */
let map, geocoder, places;
let overlayOn = false, rv, rvClient;
let mapWalker = null;   // 동동이
let pickMode  = false;  // 동동이 클릭 후 지도 클릭으로 이동

/* MapWalker: 스프라이트 + 노란 필터, 드래그/클릭 이동 */
function MapWalker(position){
  const content   = document.createElement('div');
  const angleBase = document.createElement('div');
  const angleFront= document.createElement('div');
  const figure    = document.createElement('div');

  content.className   = 'MapWalker';
  angleBase.className = 'angleBase';
  angleFront.className= 'angleFront';
  figure.className    = 'figure';

  content.appendChild(angleBase);
  content.appendChild(angleFront);
  content.appendChild(figure);

  const walker = new kakao.maps.CustomOverlay({
    position, content, yAnchor: 1, clickable: true
  });
  walker.setZIndex(99999);  // 항상 맨 위

  this.walker   = walker;
  this.content  = content;
  this.position = position;

  // 드래그
  const self = this;
  let dragging = false, startX=0, startY=0, startPt=null, moved=false;

  function onDown(ev){
    if (!overlayOn) return;
    if (ev.touches && ev.touches.length > 1) return;
    ev.preventDefault();
    content.classList.add('dragging');
    dragging = true; moved = false;
    const t = ev.touches ? ev.touches[0] : ev;
    startX = t.clientX; startY = t.clientY;

    const proj = map.getProjection();
    startPt = proj.containerPointFromCoords(self.position);

    map.setDraggable(false);
    map.setZoomable(false);

    document.addEventListener('mousemove', onMove, {passive:false});
    document.addEventListener('mouseup',   onUp,   {passive:false});
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('touchend',  onUp,   {passive:false});
  }
  function onMove(ev){
    if (!dragging) return;
    if (ev.touches && ev.touches.length > 1) return;
    ev.preventDefault();
    const t = ev.touches ? ev.touches[0] : ev;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;

    const proj = map.getProjection();
    const newPt = new kakao.maps.Point(startPt.x + dx, startPt.y + dy);
    const newPos = proj.coordsFromContainerPoint(newPt);
    self.setPosition(newPos);
  }
  function onUp(ev){
    if (!dragging) return;
    ev.preventDefault();
    dragging = false;
    content.classList.remove('dragging');

    map.setDraggable(true);
    map.setZoomable(true);

    if (moved) {
      try { setRoadviewAt(self.position); } catch(e) {}
    } else {
      // 클릭만 했다면: 지도 클릭으로 이동 토글
      pickMode = !pickMode;
      if (pickMode) { content.classList.add('pick'); flash('이동할 위치를 지도에서 클릭하세요'); }
      else          { content.classList.remove('pick'); flash('이동 취소'); }
    }

    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',   onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend',  onUp);
  }

  content.addEventListener('mousedown',  onDown, {passive:false});
  content.addEventListener('touchstart', onDown, {passive:false});
}
MapWalker.prototype.setAngle = function(angle){
  const a = ((angle % 360) + 360) % 360;
  const idx = Math.floor(((a + 11.25) % 360) / 22.5); // 0..15
  const keepPick = this.content.classList.contains('pick');
  this.content.className = 'MapWalker m' + idx + (keepPick ? ' pick' : '');
};
MapWalker.prototype.setPosition = function(position){
  this.position = position;
  this.walker.setPosition(position);
};
MapWalker.prototype.setMap = function(theMap){
  this.walker.setMap(theMap);
};

/* 🔎 가장 가까운 로드뷰 panoId 찾기 */
function findNearestPanoId(position, cb, radii=[50,100,200,400,800,1600,3000]) {
  let i = 0;
  (function tryNext(){
    if (i >= radii.length) return cb(null);
    rvClient.getNearestPanoId(position, radii[i], function(panoId){
      if (panoId) return cb(panoId);
      i++; tryNext();
    });
  })();
}

/* 🔔 토스트 */
function flash(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText =
    'position:fixed;left:50%;top:14px;transform:translateX(-50%);' +
    'background:rgba(0,0,0,.85);color:#fff;padding:8px 12px;border-radius:8px;' +
    'font-size:13px;z-index:9999;pointer-events:none';
  document.body.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .25s'; }, 1100);
  setTimeout(()=> el.remove(), 1500);
}

/* ✅ 로드뷰 위치 세팅 */
function setRoadviewAt(position){
  const container = document.getElementById('container');
  findNearestPanoId(position, function(panoId){
    if (!panoId) {
      flash('근처에 로드뷰가 없어요');
      try { map.setCenter(position); } catch(e){}
      try { if (mapWalker) mapWalker.setPosition(position); } catch(e){}
      return;
    }
    if (!container.classList.contains('view_roadview')) {
      container.classList.add('view_roadview');
      map.relayout();
    }
    try { map.setCenter(position); } catch(e){}
    try { if (mapWalker) mapWalker.setPosition(position); } catch(e){}
    rv.setPanoId(panoId, position);
  });
}

/* 로드뷰 오버레이 토글 */
function toggleOverlay(active){
  const btn = document.getElementById('roadviewControl');
  if(active){
    overlayOn = true;
    btn.classList.add('active');
    map.addOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);

    if (!mapWalker){
      mapWalker = new MapWalker(map.getCenter());
      mapWalker.setMap(map);
    } else {
      mapWalker.setPosition(map.getCenter());
      mapWalker.setMap(map);
    }
    setRoadviewAt(map.getCenter());
  }else{
    overlayOn = false;
    pickMode  = false;
    btn.classList.remove('active');
    map.removeOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);
    if(mapWalker) { mapWalker.content.classList.remove('pick'); mapWalker.setMap(null); }
    document.getElementById('container').classList.remove('view_roadview');
    map.relayout();
  }
}

/* 초기화 */
kakao.maps.load(function(){
  const center = new kakao.maps.LatLng(35.2725308711779, 128.406307024695);
  map = new kakao.maps.Map(document.getElementById('map'), { center, level:4 });
  map.setMaxLevel(9);

  geocoder = new kakao.maps.services.Geocoder();
  places   = new kakao.maps.services.Places();
  rvClient = new kakao.maps.RoadviewClient();
  rv       = new kakao.maps.Roadview(document.getElementById('roadview'));

  // 로드뷰 시선(회전) → 동동이 프레임
  kakao.maps.event.addListener(rv, 'viewpoint_changed', function(){
    if(!overlayOn || !mapWalker) return;
    const vp = rv.getViewpoint(); // {pan,tilt,zoom}
    mapWalker.setAngle(vp.pan);
  });
  // 로드뷰 위치 ↔ 지도/동동이 싱크
  kakao.maps.event.addListener(rv, 'position_changed', function(){
    if(!overlayOn) return;
    const pos = rv.getPosition();
    map.setCenter(pos);
    if(mapWalker) mapWalker.setPosition(pos);
  });

  // 지도 클릭 → (픽모드면 먼저 동동이 옮기고) 로드뷰 이동
  kakao.maps.event.addListener(map, 'click', function(e){
    if(!overlayOn) return;
    const pos = e.latLng;
    if (pickMode && mapWalker) {
      mapWalker.setPosition(pos);
      mapWalker.content.classList.remove('pick');
      pickMode = false;
    }
    setRoadviewAt(pos);
  });

  // 로드뷰 버튼
  document.getElementById('roadviewControl').addEventListener('click', ()=> toggleOverlay(!overlayOn));
  // 닫기 버튼
  document.getElementById('close').addEventListener('click', ()=> toggleOverlay(false));

  // 위성뷰 토글
  const btnSat = document.getElementById('btnSatellite');
  btnSat.addEventListener('click', ()=>{
    if(map.getMapTypeId() === kakao.maps.MapTypeId.ROADMAP){
      map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);
      btnSat.classList.add('selected');
    }else{
      map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
      btnSat.classList.remove('selected');
    }
  });

  /* ===== 기존 외부 스크립트 연동 ===== */
  if (window.SEL_SUGGEST && typeof initMarkers === 'function') {
    const unique = new Map();
    const positionsLike = [];
    for (const it of window.SEL_SUGGEST) {
      const lat = parseFloat(it.lat), lng = parseFloat(it.lng);
      if (!isFinite(lat) || !isFinite(lng)) continue;
      const key = lat + ',' + lng;
      if (unique.has(key)) continue;
      unique.set(key, true);
      positionsLike.push({
        latlng: new kakao.maps.LatLng(lat, lng),
        content: it.name1 || it.name || '',
        searchName: it.name2 || it.name || '',
        group: it.line || null
      });
    }
    initMarkers(map, positionsLike);
  }

  if (typeof initSuggestUI === 'function') {
    initSuggestUI({
      map,
      data: window.SEL_SUGGEST || [],
      parent: document.getElementById('mapWrapper'),
      getMarkers: () => window.markers,
      badges: ['line','encloser','addr','ip'],
      maxItems: 30,
      chooseOnEnter: true,
      openOnFocus: true
    });
  }

  /* ===== 미니맵(로드뷰시) 크기 조절: 위/오른쪽으로 끌수록 커짐 ===== */
  (function setupMiniMapResizer(){
    const container = document.getElementById('container');
    const wrapper   = document.getElementById('mapWrapper');
    const handle    = wrapper.querySelector('.rv-resizer');

    const MIN_W = 200, MIN_H = 150;
    const clamp = (v,min,max)=>Math.max(min,Math.min(v,max));
    function maxW(){ return Math.min(window.innerWidth*0.9, 900); }
    function maxH(){ return Math.min(window.innerHeight*0.9,700); }

    function loadSize(){
      try{
        const saved = JSON.parse(localStorage.getItem('rvMiniSize')||'{}');
        if (saved && saved.w && saved.h) {
          wrapper.style.width  = saved.w + 'px';
          wrapper.style.height = saved.h + 'px';
          map.relayout();
        }
      }catch(e){}
    }
    function saveSize(w,h){
      try{ localStorage.setItem('rvMiniSize', JSON.stringify({w:Math.round(w), h:Math.round(h)})); }catch(e){}
    }

    let startX, startY, startW, startH, curW, curH, active=false, rafId=null;

    function applySize(){
      rafId = null;
      if (curW && curH){
        wrapper.style.width  = curW + 'px';
        wrapper.style.height = curH + 'px';
        map.relayout();
      }
    }
    function onDown(ev){
      ev.preventDefault(); ev.stopPropagation();
      const t = ev.touches ? ev.touches[0] : ev;
      startX = t.clientX; startY = t.clientY;
      const r = wrapper.getBoundingClientRect();
      startW = r.width; startH = r.height;
      active = true;
      document.addEventListener('mousemove', onMove, {passive:false});
      document.addEventListener('mouseup',   onUp,   {passive:false});
      document.addEventListener('touchmove', onMove, {passive:false});
      document.addEventListener('touchend',  onUp,   {passive:false});
    }
    function onMove(ev){
      if (!active) return;
      ev.preventDefault();
      const t = ev.touches ? ev.touches[0] : ev;
      const dx = (t.clientX - startX);
      const dy = (t.clientY - startY);
      // bottom-left 고정: 오른쪽(+dx) & 위쪽(-dy)로 키움
      curW = clamp(startW + dx, MIN_W, maxW());
      curH = clamp(startH - dy, MIN_H, maxH());
      if (!rafId) rafId = requestAnimationFrame(applySize);
    }
    function onUp(ev){
      if(!active) return;
      ev.preventDefault();
      active=false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend',  onUp);
      if (curW && curH) saveSize(curW, curH);
    }
    handle.addEventListener('mousedown',  onDown, {passive:false});
    handle.addEventListener('touchstart', onDown, {passive:false});

    // 로드뷰 진입/종료에 따라 크기 적용/복원
    const mo = new MutationObserver(() => {
      const rvOn = container.classList.contains('view_roadview');
      if (rvOn) loadSize();
      else {
        wrapper.style.width  = '100%';
        wrapper.style.height = '100%';
        map.relayout();
      }
    });
    mo.observe(container, { attributes:true, attributeFilter:['class'] });

    if (container.classList.contains('view_roadview')) loadSize();
  })();

});
</script>

<!-- ====================== 거리 재기 버튼(JS만 수정) ====================== -->
<script>
/*
  btnDistance.js — 고정형 버튼(top:58px) + 분기점/세그먼트/총거리 오버레이
  - 버튼은 mapWrapper에 절대 위치로 고정(top:58px, left:10px)
  - 점: 흰원/빨간테두리
  - 세그먼트 라벨: 점 '위' 8px (중복/간섭 최소)
  - 총거리 박스: 마지막 점 '오른쪽 대각선 아래' 8px (항상 최신 위치로 이동)
  - 토글 OFF 시 선/점/라벨/총거리 모두 제거
*/
(function () {
  // ----- 스타일 1회 주입 -----
  if (!document.getElementById('btnDistance-style')) {
    const st = document.createElement('style');
    st.id = 'btnDistance-style';
    st.textContent = `
      /* 버튼(40x40) 고정형 */
      #btnDistance {
        position:absolute; top:58px; left:10px;
        width:40px; height:40px;
        display:inline-flex; align-items:center; justify-content:center;
        border:1px solid #ccc; border-radius:8px; background:#fff; color:#555;
        cursor:pointer; transition:all .2s ease; box-sizing:border-box;
        z-index:650; margin:0;
      }
      #btnDistance:hover { box-shadow:0 3px 12px rgba(0,0,0,.12); }
      #btnDistance.active {
        border-color:#e53935;
        box-shadow:0 0 0 2px rgba(229,57,53,.15) inset;
        color:#e53935;
      }
      /* 버튼 내부 아이콘: 굵고 긴 직사각형(활성 시 빨간 배경/테두리) */
      #btnDistance .km-rect {
        width:22px; height:10px; border-radius:4px;
        border:2px solid currentColor;
        background: currentColor;
      }
      #btnDistance:not(.active) .km-rect {
        background: transparent;
      }

      /* 점(흰 원 + 빨간 테두리) */
      .km-dot {
        width: 12px; height: 12px;
        border: 2px solid #e53935;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 0 1px rgba(0,0,0,.06);
      }

      /* 세그먼트 라벨: 점 '위'로 8px 띄우기 */
      .km-seg {
        background:#fff;
        color:#e53935;
        border:1px solid #e53935;
        border-radius:8px;
        padding:2px 6px;
        font-size:12px;
        font-weight:600;
        white-space:nowrap;
        box-shadow:0 2px 6px rgba(0,0,0,.12);
        transform: translateY(-8px);   /* 위로 8px */
        pointer-events: none;
      }

      /* 총거리 박스: 마지막 점 '오른쪽 대각선 아래'로 8px 이동 */
      .km-total-box {
        background: #ffeb3b;
        color: #222;
        border: 1px solid #e0c200;
        border-radius: 10px;
        padding: 6px 10px;
        font-size: 13px; font-weight: 700;
        box-shadow: 0 2px 8px rgba(0,0,0,.15);
        transform: translate(8px, 8px); /* ↘ 8px */
        pointer-events: none;           /* 간섭 방지 */
      }
    `;
    document.head.appendChild(st);
  }

  // ----- 버튼 준비(없으면 생성) -----
  (function ensureButton() {
    const mount =
      document.getElementById('mapWrapper') ||
      document.getElementById('container') ||
      document.body;

    let btn = document.getElementById('btnDistance');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btnDistance';
      btn.type = 'button';
      btn.title = '거리 재기';
      btn.setAttribute('aria-pressed','false');
      btn.innerHTML = '<span class="km-rect" aria-hidden="true"></span>';
      mount.appendChild(btn);
    } else if (btn.parentElement !== mount) {
      mount.appendChild(btn); // 툴바 밖으로 이동
    }
  })();

  const btn = document.getElementById('btnDistance');

  // ----- 내부 상태 -----
  let drawing = false;
  let clickLine = null;          // 확정 경로 polyline
  let dots = [];                 // 분기점 점(CustomOverlay)
  let segOverlays = [];          // 세그먼트 라벨(CustomOverlay)
  let totalOverlay = null;       // 총거리 라벨(CustomOverlay)
  const mapExists = () => (typeof window !== "undefined" && window.map && window.kakao && kakao.maps);

  const fmt = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // ----- 도트 추가 -----
  function addDot(position) {
    const el = document.createElement('div');
    el.className = 'km-dot';
    const dot = new kakao.maps.CustomOverlay({
      position,
      content: el,
      xAnchor: 0.5,
      yAnchor: 0.5,
      zIndex: 5000
    });
    dot.setMap(map);
    dots.push(dot);
  }

  // ----- 세그먼트 라벨 추가 (텍스트는 '거리만', 구간번호 제거) -----
  function addSegmentBox(position, meters) {
    const el = document.createElement('div');
    el.className = 'km-seg';
    el.textContent = meters >= 1000 ? `${(meters/1000).toFixed(2)} km` : `${fmt(meters)} m`;

    const seg = new kakao.maps.CustomOverlay({
      position,
      content: el,
      yAnchor: 1,       // 아래쪽이 기준 → transform으로 8px 위로 올림
      zIndex: 5200
    });
    seg.setMap(map);
    segOverlays.push(seg);
  }

  // ----- 총거리 라벨(마지막 점 기준 ↘8px) -----
  function showTotalAt(position, totalMeters) {
    // 기존 오버레이 제거 후 새로 생성
    if (totalOverlay) { try { totalOverlay.setMap(null); } catch(_) {} totalOverlay = null; }

    const el = document.createElement('div');
    el.className = 'km-total-box';
    el.textContent = totalMeters >= 1000 ? `총 거리: ${(totalMeters/1000).toFixed(2)} km`
                                         : `총 거리: ${fmt(totalMeters)} m`;

    totalOverlay = new kakao.maps.CustomOverlay({
      position,
      content: el,
      xAnchor: 0,   // 좌상단을 기준점으로
      yAnchor: 0,   // ↘ 방향으로 8px 이동( CSS transform )
      zIndex: 5300
    });
    totalOverlay.setMap(map);
  }

  // ----- 초기화 -----
  function resetMeasure() {
    if (clickLine) { clickLine.setMap(null); clickLine = null; }
    dots.forEach(d => { try { d.setMap(null); } catch(_){} });
    dots = [];
    segOverlays.forEach(o => { try { o.setMap(null); } catch(_){} });
    segOverlays = [];
    if (totalOverlay) { try { totalOverlay.setMap(null); } catch(_){} totalOverlay = null; }
  }

  // ----- 맵 클릭 핸들러 -----
  function onMapClick(e) {
    if (!drawing || !mapExists()) return;
    const pos = e.latLng;

    if (!clickLine) {
      // 첫 점
      clickLine = new kakao.maps.Polyline({
        map: map,
        path: [pos],
        strokeWeight: 3,
        strokeColor: '#db4040',
        strokeOpacity: 1,
        strokeStyle: 'solid'
      });
      addDot(pos);
      // 총거리 0도 첫 점 기준으로 표시
      showTotalAt(pos, 0);
    } else {
      // 다음 점 → 라인 연장 + 세그먼트/총거리 업데이트
      const path = clickLine.getPath();
      const prev = path[path.length - 1];
      path.push(pos);
      clickLine.setPath(path);

      // 세그먼트 거리
      const segLine = new kakao.maps.Polyline({ path: [prev, pos] });
      const segDist = Math.round(segLine.getLength());
      addSegmentBox(pos, segDist);
      addDot(pos);

      // 총거리 업데이트(마지막 점 기준 ↘8px)
      const total = Math.round(clickLine.getLength());
      showTotalAt(pos, total);
    }
  }

  // ----- 토글 -----
  btn.addEventListener('click', function() {
    if (!mapExists()) return;
    drawing = !drawing;
    btn.classList.toggle('active', drawing);
    btn.setAttribute('aria-pressed', drawing ? 'true' : 'false');

    if (drawing) {
      resetMeasure();                 // 깨끗이 시작
      map.setCursor('crosshair');
      kakao.maps.event.addListener(map, 'click', onMapClick);
    } else {
      kakao.maps.event.removeListener(map, 'click', onMapClick);
      map.setCursor('');
      resetMeasure();                 // 모든 요소 제거
    }
  });
})();
</script>
</body>
</html>
