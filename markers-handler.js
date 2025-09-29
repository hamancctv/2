// markers-handler.js
(function () {
  // === 오버레이 스타일 ===
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover{
      padding:2px 6px;
      background:rgba(255,255,255,0.80);
      border:1px solid #ccc;
      border-radius:5px;
      font-size:14px;
      white-space:nowrap;
      user-select:none;
      transition:transform .15s ease, border .15s ease, background .15s ease;
      will-change:transform, border;
      transform:translateZ(0);
      backface-visibility:hidden;
    }
    .overlay-click{
      padding:5px 8px;
      background:rgba(255,255,255,0.90);
      border:1px solid #666;
      border-radius:5px;
      font-size:14px;
      white-space:nowrap;
      user-select:none;
      transition:transform .15s ease, border .15s ease, background .15s ease;
    }
  `;
  document.head.appendChild(style);

  // === Z 레이어(기본: 마커>오버레이, 전면: 오버레이>마커) ===
  const Z = { BASE:100, FRONT:100000 };

  // === 전역 상태 ===
  let selectedMarker = null;      // 파란 테두리 선택 쌍
  let selectedOverlayEl = null;
  let selectedOverlayObj = null;

  let frontMarker = null;         // 마지막 상호작용으로 전면 고정된 쌍
  let frontOverlay = null;
  let frontReason = null;         // 'hover' | 'clickMarker' | 'clickOverlay'

  let clickStartTime = 0;

  // === 마커 이미지/치수 ===
  let normalImage, hoverImage, jumpImage;
  const normalH=42, hoverH=50.4, gap=2;
  const baseY  = -(normalH + gap);   // -44
  const hoverY = -(hoverH  + gap);   // -52.4
  const jumpY  = -(70      + gap);   // -72

  // ============== 검색어 추출 & UI 반영 ==============
  // 규칙: "마지막 하이픈(-) 뒤"에서 "처음 나오는 연속 한글"만 추출
  // 예) "쓰-001-가야영광사우나01(회전)" -> "가야영광사우나"
  function extractSearchName(str){
    const tmp = document.createElement('div');
    tmp.innerHTML = String(str ?? '');
    const txt = (tmp.textContent || tmp.innerText || '').trim();

    const lastHyphen = txt.lastIndexOf('-');
    const tail = lastHyphen >= 0 ? txt.slice(lastHyphen + 1) : txt;

    // 첫 한글이 나오기 전 모든 문자 제거 → 첫 한글부터 시작
    const afterFirstHangul = tail.replace(/^[^가-힣]+/u, '');
    const m = afterFirstHangul.match(/^[가-힣]+/u);
    return m ? m[0] : "";
  }

  // 검색창/제안에 주입(환경별 안전 처리)
  function pushToSearchUI(q){
    if (!q) return;
    const kw = document.getElementById("keyword");
    if (kw) kw.value = q;

    // 별도 서치 UI가 있으면 우선 사용
    if (typeof window.pushToSearchUI === "function") { window.pushToSearchUI(q); return; }
    if (typeof window.filterSelTxt === "function")   { window.filterSelTxt(q);   return; }

    // 폴백: 기존 filter() 지원
    if (typeof window.filter === "function") window.filter();
  }

  // sel_txt 캐시(필요시 생성)
  if (!window.__selTxtItems) window.__selTxtItems = [];
  if (typeof window.cacheSelTxt !== "function") {
    window.cacheSelTxt = function () {
      const nodes = document.getElementsByClassName("sel_txt");
      window.__selTxtItems = Array.from(nodes).map(el => {
        const nameEl = el.querySelector(".name");
        const raw = (nameEl ? nameEl.innerText : el.innerText) || "";
        return { root: el, text: raw.toUpperCase().replace(/\s+/g,"") };
      });
    };
  }
  if (typeof window.filterSelTxt !== "function") {
    window.filterSelTxt = function (val) {
      if (!window.__selTxtItems.length) window.cacheSelTxt();
      const q = (val||"").toUpperCase().replace(/\s+/g,"");
      for (const it of window.__selTxtItems) {
        it.root.style.display = it.text.indexOf(q) > -1 ? "flex" : "none";
      }
    };
  }

  // ============== zIndex 유틸 ==============
  const setDefaultZ=(m,o)=>{ if(m) m.setZIndex(Z.BASE+1); if(o) o.setZIndex(Z.BASE); };
  const setFrontZ  =(m,o)=>{ if(m) m.setZIndex(Z.FRONT);   if(o) o.setZIndex(Z.FRONT+1); };

  function bringToFront(map, marker, overlay, reason){
    if (!marker || !overlay) return;
    if (frontMarker && frontOverlay && (frontMarker!==marker || frontOverlay!==overlay)) {
      setDefaultZ(frontMarker, frontOverlay);
      if (map.getLevel()>3 && frontMarker !== selectedMarker) frontOverlay.setMap(null);
    }
    overlay.setMap(map);             // 전면은 항상 표시
    setFrontZ(marker, overlay);
    frontMarker=marker; frontOverlay=overlay; frontReason=reason;
  }

  // 지도 클릭 시: 파란 테두리만 해제(전면은 유지)
  function clearSelectionKeepFront(map){
    if (selectedOverlayEl) selectedOverlayEl.style.border = "1px solid #ccc";
    selectedMarker=null; selectedOverlayEl=null; selectedOverlayObj=null;
  }

  // ============== 초기화 ==============
  window.initMarkers = function (map, positions) {
    const markers=[]; const overlays=[];

    normalImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(30,42), { offset: new kakao.maps.Point(15,42) }
    );
    hoverImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(36,50.4), { offset: new kakao.maps.Point(18,50.4) }
    );
    jumpImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
      new kakao.maps.Size(30,42), { offset: new kakao.maps.Point(15,70) }
    );

    const batchSize=50; let idx=0;

    function createBatch(){
      const end=Math.min(positions.length, idx+batchSize);
      for (let i=idx;i<end;i++){
        (function(i){
          const pos=positions[i];

          // 마커
          const marker=new kakao.maps.Marker({
            map, position:pos.latlng, image:normalImage, clickable:true, zIndex:Z.BASE+1
          });

          // 오버레이
          const el=document.createElement("div");
          el.className="overlay-hover";
          el.style.transform=`translateY(${baseY}px)`;
          el.textContent = pos.content;

          const overlay=new kakao.maps.CustomOverlay({ position:pos.latlng, content:el, yAnchor:1, map:null });
          overlay.setZIndex(Z.BASE);

          // 상호참조/좌표 저장
          marker.__overlay=overlay; overlay.__marker=marker;
          marker.__lat = pos.latlng.getLat();
          marker.__lng = pos.latlng.getLng();

          // Hover in
          function onOver(){
            marker.setImage(hoverImage);
            bringToFront(map, marker, overlay, 'hover');
            el.style.transform = (marker===selectedMarker)? `translateY(${hoverY-2}px)` : `translateY(${hoverY}px)`;
          }
          // Hover out
          function onOut(){
            marker.setImage(normalImage);
            const wasHoverFront = (frontMarker===marker && frontOverlay===overlay && frontReason==='hover');

            if (wasHoverFront){
              el.style.transform=`translateY(${baseY}px)`;
              // 파란 테두리 쌍 전면 복귀
              if (selectedMarker && selectedOverlayObj){
                bringToFront(map, selectedMarker, selectedOverlayObj, 'clickMarker');
                if (selectedOverlayEl){
                  selectedOverlayEl.style.border="2px solid blue";
                  selectedOverlayEl.style.transform=`translateY(${baseY-2}px)`;
                }
              }
              return;
            }

            if (marker===selectedMarker){
              el.style.transform=`translateY(${baseY-2}px)`; el.style.border="2px solid blue";
              bringToFront(map, selectedMarker, selectedOverlayObj||overlay, 'clickMarker');
            } else {
              el.style.transform=`translateY(${baseY}px)`;
              if (map.getLevel()>3 && overlay!==frontOverlay && overlay!==selectedOverlayObj) overlay.setMap(null);
              if (!(frontMarker===marker && frontOverlay===overlay)) setDefaultZ(marker, overlay);
              if (frontMarker && frontOverlay) setFrontZ(frontMarker, frontOverlay);
            }
          }

          kakao.maps.event.addListener(marker, "mouseover", onOver);
          kakao.maps.event.addListener(marker, "mouseout",  onOut);
          el.addEventListener("mouseover", onOver);
          el.addEventListener("mouseout",  onOut);

          // Marker mousedown: 점프 + 전면 + 선택 테두리
          kakao.maps.event.addListener(marker, "mousedown", function(){
            marker.setImage(jumpImage);
            clickStartTime = Date.now();

            if (selectedOverlayEl) selectedOverlayEl.style.border = "1px solid #ccc";
            selectedMarker=marker; selectedOverlayEl=el; selectedOverlayObj=overlay;

            bringToFront(map, marker, overlay, 'clickMarker');

            el.style.border="2px solid blue";
            el.style.transform=`translateY(${jumpY-2}px)`;
          });

          // Marker mouseup: 복귀 + 검색어 주입
          kakao.maps.event.addListener(marker, "mouseup", function(){
            const elapsed=Date.now()-clickStartTime; const delay=Math.max(0,100-elapsed);
            setTimeout(function(){
              marker.setImage(normalImage);
              el.style.border="2px solid blue";
              el.style.transition="transform .2s ease, border .2s ease";
              el.style.transform=`translateY(${baseY-2}px)`;
              bringToFront(map, marker, overlay, 'clickMarker');

              // 좌표 갱신
              const g = document.getElementById("gpsyx");
              if (g) g.value = `${marker.__lat}, ${marker.__lng}`;

              // 검색어 추출 & 주입
              const q = extractSearchName(pos.content) || extractSearchName(el.textContent||"");
              if (q) pushToSearchUI(q);

              setTimeout(()=>{ el.style.transition="transform .15s ease, border .15s ease"; }, 200);
            }, delay);
          });

          // Marker click(모바일 탭 대응): mouseup과 동일 효과
          kakao.maps.event.addListener(marker, "click", function(){
            if (selectedOverlayEl) selectedOverlayEl.style.border="1px solid #ccc";
            selectedMarker=marker; selectedOverlayEl=el; selectedOverlayObj=overlay;

            bringToFront(map, marker, overlay, 'clickMarker');

            marker.setImage(normalImage);
            el.style.border="2px solid blue";
            el.style.transform=`translateY(${baseY-2}px)`;

            const g = document.getElementById("gpsyx");
            if (g) g.value = `${marker.__lat}, ${marker.__lng}`;

            const q = extractSearchName(pos.content) || extractSearchName(el.textContent||"");
            if (q) pushToSearchUI(q);
          });

          // Overlay click: 전면만(테두리/입력X)
          el.addEventListener("click", function(){
            bringToFront(map, marker, overlay, 'clickOverlay');
            el.style.border="1px solid #ccc";
            el.style.transform=`translateY(${baseY}px)`;
          });

          markers.push(marker); overlays.push(overlay);
        })(i);
      }
      idx=end;
      if (idx<positions.length) setTimeout(createBatch, 0); else window.markers=markers;
    }
    createBatch();

    // idle: 전면/선택은 항상 표시, 비선택은 level<=3에서만
    kakao.maps.event.addListener(map, "idle", function(){
      const level=map.getLevel();
      overlays.forEach(o=>{
        const m=o.__marker; if(!m) return;
        if ((frontOverlay && o===frontOverlay) || (selectedOverlayObj && o===selectedOverlayObj)) {
          o.setMap(map);
        } else {
          level<=3 ? o.setMap(map) : o.setMap(null);
        }
        if (frontOverlay && o===frontOverlay) setFrontZ(m,o); else setDefaultZ(m,o);
      });
      if (frontMarker && frontOverlay) setFrontZ(frontMarker, frontOverlay);
    });

    // 지도 클릭: 파란 테두리만 제거(전면 유지)
    kakao.maps.event.addListener(map, "click", function(){
      clearSelectionKeepFront(map);
    });
  };

})();
