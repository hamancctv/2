(function(){
    // ----------------------------------------------------
    // 1. 변수 정의 및 환경 감지
    // ----------------------------------------------------
    var btn = document.getElementById('btnDistance');
    var drawing = false, clickLine = null, moveLine = null, lastPoint = null;
    var totalOverlay = null; 
    var predictionOverlay = null; // PC용 예상 거리 오버레이
    var segmentOverlays = []; 
    var dotOverlays = [];     
    var segCount = 0; 
    
    var isMobileDevice = isMobile(); 
    
    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    // ----------------------------------------------------

    btn.addEventListener('click', toggleMeasure);

    function toggleMeasure(){
        drawing = !drawing;
        if(drawing){
            resetMeasure();
            btn.classList.add('active');
            map.setCursor(isMobileDevice ? '' : 'crosshair');
            
            // 공통: 지도 클릭 리스너 등록
            kakao.maps.event.addListener(map, 'click', onMapClick);
            
            if (!isMobileDevice) {
                // PC 전용 리스너 (샘플 스타일: 마우스 이동 및 더블 클릭 종료)
                kakao.maps.event.addListener(map, 'mousemove', onMapMove);
                kakao.maps.event.addListener(map, 'dblclick', onMapDblClick);
                // 마우스 오른쪽 버튼 클릭 이벤트도 추가 (contextmenu)
                kakao.maps.event.addListener(map, 'contextmenu', onMapContextMenu);
            }
            
            map.setDraggable(true);
            map.setZoomable(true);
            
        } else {
            // 종료 시 모든 리스너 제거
            kakao.maps.event.removeListener(map, 'click', onMapClick);
            kakao.maps.event.removeListener(map, 'mousemove', onMapMove);
            kakao.maps.event.removeListener(map, 'dblclick', onMapDblClick);
            kakao.maps.event.removeListener(map, 'contextmenu', onMapContextMenu);
            
            btn.classList.remove('active');
            map.setCursor('');
            resetMeasure();
        }
    }

    // ----------------------------------------------------
    // PC 전용: 마우스 이동 및 종료 이벤트
    // ----------------------------------------------------
    function onMapMove(mouseEvent) {
        if (!drawing || !clickLine) return;

        var pos = mouseEvent.latLng;
        var path = [lastPoint, pos];
        
        if (!moveLine) {
            moveLine = new kakao.maps.Polyline({
                map: map, path: path,
                strokeWeight: 3, strokeColor:'#555',
                strokeOpacity: 0.8, strokeStyle:'dash'
            });
        } else {
            moveLine.setPath(path);
        }

        var segDist = moveLine.getLength();
        // 예상 거리 오버레이 위치: 지도 중앙 상단으로 수정
        showPredictionBox("총 예상거리 "+Math.round(clickLine.getLength() + segDist)+" m", map.getCenter());
    }

    function onMapDblClick(mouseEvent) {
        // 더블 클릭 시, 새로운 점을 찍지 않고 바로 종료
        mouseEvent.preventDefault(); // 기본 더블 클릭 동작(확대) 방지
        if (drawing && clickLine) {
            finishMeasure(lastPoint);
        }
    }
    
    function onMapContextMenu(mouseEvent) {
        // 마우스 오른쪽 클릭 시 종료
        mouseEvent.preventDefault();
        if (drawing && clickLine) {
            finishMeasure(lastPoint);
        }
    }

    // PC 전용: 예상 거리 오버레이 표시 (지도 중앙 상단)
    function showPredictionBox(text, pos) {
        if (!predictionOverlay) {
            var box = document.createElement('div');
            box.className = 'prediction-box-pc'; 
            box.innerText = text;
            
            predictionOverlay = new kakao.maps.CustomOverlay({
                map: map, position: pos, content: box,
                xAnchor: 0.5, yAnchor: 0, // 중앙 상단에 위치하도록 앵커 수정
                pixelOffset: new kakao.maps.Point(0, 10) // 지도 중앙에서 10px 아래로 오프셋
            });
        } else {
            predictionOverlay.setContent('<div class="prediction-box-pc">' + text + '</div>');
            predictionOverlay.setPosition(pos);
        }
    }
    
    // ----------------------------------------------------
    // 2. 지도 클릭 이벤트 (PC/모바일 공통 및 분기)
    // ----------------------------------------------------
    function onMapClick(mouseEvent){
        if(!drawing) return;
        var pos = mouseEvent.latLng;

        if(!clickLine){ 
            // 1. 첫 점
            clickLine = new kakao.maps.Polyline({
                map: map, path:[pos],
                strokeWeight: 3, strokeColor:'#db4040',
                strokeOpacity: 1, strokeStyle:'solid'
            });
            addDot(pos);
            lastPoint = pos;
            segCount = 1;

        } else {
            // 2. 두 번째 점부터
            var path = clickLine.getPath();
            path.push(pos); clickLine.setPath(path);
            
            // PC 전용: 예상 오버레이 및 점선 제거 후 다시 그리기 시작
            if (!isMobileDevice) {
                if (moveLine) { moveLine.setMap(null); moveLine = null; }
                if (predictionOverlay) { predictionOverlay.setMap(null); predictionOverlay = null; }
            }

            var segDist = new kakao.maps.Polyline({path:[lastPoint,pos]}).getLength();
            
            // 모바일 전용: 구간 거리 박스 표시 및 클릭 종료 기능
            if (isMobileDevice) {
                 createSegmentBox("구간 "+Math.round(segDist)+" m", pos);
            }
            
            addDot(pos);
            lastPoint = pos;
            segCount++;
        }
    }

    // ----------------------------------------------------
    // 3. 점 표시 및 구간 박스 생성 (모바일 전용)
    // ----------------------------------------------------
    function addDot(position){
        var circle = new kakao.maps.CustomOverlay({
            position: position,
            content: '<span style="width:8px;height:8px;background:#db4040;border:2px solid #fff;border-radius:50%;display:block;"></span>',
            zIndex:1
        });
        circle.setMap(map);
        dotOverlays.push(circle);
    }

    // 모바일 전용: 구간 박스 생성
    function createSegmentBox(text, pos){
        var box = document.createElement('div');
        box.className = 'segment-box-mobile'; 
        box.innerText = text;

        box.onclick = function(e){ 
            e.stopPropagation(); 
            finishMeasure(pos);
        };

        var overlay = new kakao.maps.CustomOverlay({
            map: map, position: pos, content: box,
            xAnchor: 1, yAnchor: 0, 
            pixelOffset: new kakao.maps.Point(-10, -10), 
            zIndex: 3
        });
        
        segmentOverlays.push(overlay);
    }

    // ----------------------------------------------------
    // 4. 최종 종료 및 결과 표시
    // ----------------------------------------------------
    function finishMeasure(pos){
        // ** 핵심: 모든 리스너 즉시 제거**
        kakao.maps.event.removeListener(map, 'click', onMapClick); 
        kakao.maps.event.removeListener(map, 'mousemove', onMapMove);
        kakao.maps.event.removeListener(map, 'dblclick', onMapDblClick);
        kakao.maps.event.removeListener(map, 'contextmenu', onMapContextMenu);
        
        drawing = false; 
        btn.classList.remove('active');

        if(!clickLine) return;
        var totalLen = Math.round(clickLine.getLength());

        // 측정 종료 시, 모든 임시 오버레이 제거
        segmentOverlays.forEach(function(o){ o.setMap(null); });
        segmentOverlays = [];
        if (predictionOverlay) { predictionOverlay.setMap(null); predictionOverlay = null; }
        if (moveLine) { moveLine.setMap(null); moveLine = null; } // 점선 제거

        if(totalOverlay) totalOverlay.setMap(null);
        
        // 최종 거리 박스 컨텐츠 생성 
        var boxContent = document.createElement('div');
        boxContent.className = 'total-distance-box';
        
        var textSpan = document.createElement('span');
        textSpan.innerText = "최종거리: "+totalLen+" m";
        boxContent.appendChild(textSpan);

        var closeBtn = document.createElement('span');
        closeBtn.className = 'close-btn-x';
        closeBtn.innerText = " X"; 
        boxContent.appendChild(closeBtn);

        // 최종 거리 오버레이 생성
        totalOverlay = new kakao.maps.CustomOverlay({
            map: map, position: pos, content: boxContent,
            xAnchor: 1, yAnchor: 1, 
            pixelOffset: new kakao.maps.Point(-10, -10), 
            zIndex: 5
        });
        
        // 최종 거리 박스 클릭 이벤트: 측정 리셋
        boxContent.onclick = function(e) {
            e.stopPropagation(); 
            resetMeasure();
            if(totalOverlay) {
                totalOverlay.setMap(null);
                totalOverlay = null;
            }
        };

        map.setCursor('');
    }

    // ----------------------------------------------------
    // 5. 측정 리셋 함수
    // ----------------------------------------------------
    function resetMeasure(){
        if(clickLine){ clickLine.setMap(null); clickLine=null; }
        if(moveLine){ moveLine.setMap(null); moveLine=null; }
        if(predictionOverlay){ predictionOverlay.setMap(null); predictionOverlay=null; }
        
        dotOverlays.forEach(function(o){ o.setMap(null); });
        dotOverlays = [];
        
        segmentOverlays.forEach(function(o){ o.setMap(null); });
        segmentOverlays = [];
        
        if(totalOverlay){ totalOverlay.setMap(null); totalOverlay=null; }
        
        lastPoint=null; segCount=0;
    }
})();
