<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GIS 모바일</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="icon" href="https://hamancctv.github.io/2/favicon.ico" sizes="32x32"/>
  <link rel="stylesheet" href="https://hamancctv.github.io/2/style.css">
</head>
<body>
  <div id="alert-overlay"><div id="alert-message"></div></div>
  <button id="btnDistance">거리</button>

  <div id="container">
      <div id="rvWrapper">
          <div id="roadview" style="width:100%;height:100%;"></div>
          <div id="close" title="로드뷰닫기" onclick="closeRoadview()"><span class="img"></span></div>
      </div>
      <div id="mapWrapper">
          <div id="map" style="width:100%;height:100%"></div>
          <div id="roadviewControl" onclick="setRoadviewRoad()"></div>
      </div>
  </div>

  <div class="search-container">
      <input type="search" id="keyword" 
           onkeyup="filter()" autocomplete="off"
          onkeydown="if(event.keyCode === 13) { btnsearch_click(); }" 
           class="form-control" 
           placeholder="검색어 입력"/>
      <button id="searchBtn" onclick="btnsearch_click()">검색</button>
  </div>

  <div class="toolbar-right">
    <input type="text" id="gpsyx" class="input-common" inputmode="none" 
           value="35.2725308711779, 128.406307024695"/>
    <button id="btn_input_copy" class="btn-common">복사</button>
  </div>

  <div class="custom_typecontrol2_m radius_border"><span id="toggle_group" class="btn btn-common">회선</span>
    <span id="btnCurrentMe" class="btn btn-common" onclick="toggleMyLocation()">위치</span>
    <span id="btnTrackMe" class="btn btn-common" onclick="toggleTracking()">추적</span>
  </div>    

<script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=5f253bed8a8966a66fc9076b662663fd&libraries=services,clusterer,drawing" async></script>
<script src="https://code.jquery.com/jquery-3.6.1.js" integrity="sha256-3zlB5s2uwoUzrXK3BT7AX3FyvojsraNFxCc2vC/7pNI=" crossorigin="anonymous"></script>

<script type="text/javascript" src="https://hamancctv.github.io/2/positions.js"></script> 
<script src="https://hamancctv.github.io/2/drawGroupLinesMST.js?v=20250929a"></script>
<script src="https://hamancctv.github.io/2/btnDistance.js?v=20250929a"></script>
<script src="https://hamancctv.github.io/2/markers-handler.js?v=20250929a"></script>

<div id="menu_wrap" class="bg_white" style="border:1px solid #919191;border-radius:10px;"></div>
<script>
// 'sel_txt.html' 로딩은 지도 초기화와 무관하므로 외부에 유지합니다.
fetch("https://raw.githubusercontent.com/hamancctv/2/refs/heads/main/sel_txt.html")
  .then(res => res.text())
  .then(html => { document.getElementById("menu_wrap").innerHTML = html; })
  .catch(err => console.error("메뉴 로드 실패:", err));
</script>

<script>
// 카카오맵 SDK 로딩이 완료되면 이 함수를 실행하여 모든 지연 문제를 해결합니다.
kakao.maps.load(function() {
    // -----------------------------------------------------
    // A. 기본 지도 및 로드뷰 초기화
    // -----------------------------------------------------
    var overlayOn = false,    container = document.getElementById('container'),
        mapWrapper = document.getElementById('mapWrapper'),    mapContainer = document.getElementById('map'),
        rvContainer = document.getElementById('roadview');

    var mapCenter = new kakao.maps.LatLng(35.2725308711779, 128.406307024695),    mapOption = { center: mapCenter, level: 4 };

    // 지도 생성
    var map = new kakao.maps.Map(mapContainer, mapOption);
    map.setMaxLevel(9);
    window.map = map; // 전역 등록

    // 로드뷰
    var rv = new kakao.maps.Roadview(rvContainer); 
    var rvClient = new kakao.maps.RoadviewClient(); 
    
    // -----------------------------------------------------
    // B. 함수 정의 (map 객체 사용)
    // -----------------------------------------------------

    // 지도 타입 컨트롤
    var mapTypeControl = new kakao.maps.MapTypeControl();
    map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPLEFT);

    // 로드뷰 마커 이미지
    var markImage = new kakao.maps.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/2018/pc/roadview_minimap_wk_2018.png',
        new kakao.maps.Size(26, 46),
        {
            spriteSize: new kakao.maps.Size(1666, 168),
            spriteOrigin: new kakao.maps.Point(705, 114),
            offset: new kakao.maps.Point(13, 46)
        });

    var marker = new kakao.maps.Marker({
        image : markImage,
        position: mapCenter,
        draggable: true
    });

    // 내 위치/추적 마커 이미지
    var markerImage = new kakao.maps.MarkerImage(
        'https://hamancctv.github.io/2/icon-target.png',
        new kakao.maps.Size(32,32),
        { offset: new kakao.maps.Point(16,16) });

    // 내 위치/추적 상태
    var myLocationOn = false, trackOn = false;
    var myLocationMarker = null, trackMarker = null;
    var trackInterval = null, watchId = null;


    // 함수 정의 (로드뷰/오버레이)
    function toggleRoadview(position){
        rvClient.getNearestPanoId(position, 50, function(panoId) {
            if (panoId === null) toggleMapWrapper(true, position);
            else {
                toggleMapWrapper(false, position);
                rv.setPanoId(panoId, position);
            }
        });
    }

    function toggleMapWrapper(active, position) {
        if (active) {
            container.className = '';
            map.relayout();
            map.setCenter(position);
        } else {
            if (container.className.indexOf('view_roadview') === -1) {
                container.className = 'view_roadview';
                map.relayout();
                map.setCenter(position);
            }
        }
    }

    function toggleOverlay(active) {
        if (active) {
            overlayOn = true;
            map.addOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);
            marker.setMap(map);
            if (window.marker1) window.marker1.setMap(null);
            marker.setPosition(map.getCenter());
            toggleRoadview(map.getCenter());
        } else {
            overlayOn = false;
            map.removeOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);
            marker.setMap(null);
            if (window.marker1) window.marker1.setMap(map);
        }
    }

    // 함수 정의 (위치 이동)
    function setCenter(Lat, Lng) {
        var moveLatLon = new kakao.maps.LatLng(Lat, Lng);
        map.setLevel(1);
        map.panTo(moveLatLon);
        var circle = new kakao.maps.Circle({
            center : new kakao.maps.LatLng(Lat, Lng),
            radius: 50,
            strokeWeight: 1,
            strokeColor: '#ffa500',
            strokeOpacity: 1,
            strokeStyle: 'dashed',
            fillColor: '#FF1000',
            fillOpacity: 0.3
        });     
        circle.setMap(map);         
        setTimeout(()=>circle.setMap(null), 1000);        
    }

    // 함수 정의 (내 위치/추적)
    function showMyLocation(lat, lng){
        var latLng = new kakao.maps.LatLng(lat,lng);
        if(!myLocationMarker){
            myLocationMarker = new kakao.maps.Marker({
                position:latLng,
                map:map,
                image:markerImage
            });
            kakao.maps.event.addListener(myLocationMarker, 'click', function(){
                map.panTo(myLocationMarker.getPosition());
                map.setLevel(4);
            });
        } else {
            myLocationMarker.setPosition(latLng);
            myLocationMarker.setMap(map);
        }
        map.panTo(latLng);
        map.setLevel(5);
    }
    
    function startTracking(){
        trackOn = true;
        document.getElementById('btnTrackMe').classList.add('selected_btn');
        watchId = navigator.geolocation.watchPosition(function(pos){
            var latLng = new kakao.maps.LatLng(pos.coords.latitude,pos.coords.longitude);
            if(!trackMarker){
                trackMarker = new kakao.maps.Marker({ position:latLng, map:map, image:markerImage });
            } else {
                trackMarker.setPosition(latLng);
                trackMarker.setMap(map);
            }
            map.panTo(latLng);
        }, geoError, { enableHighAccuracy:true });
        trackInterval = setInterval(()=>{ if(trackMarker) trackMarker.setVisible(!trackMarker.getVisible()); }, 500);
    }

    function stopTracking(){
        trackOn = false;
        document.getElementById('btnTrackMe').classList.remove('selected_btn');
        if(watchId) { navigator.geolocation.clearWatch(watchId); watchId=null; }
        if(trackInterval){ clearInterval(trackInterval); trackInterval=null; }
        if(trackMarker){ trackMarker.setVisible(true); trackMarker.setMap(null); trackMarker=null; }
    }

    // 함수 정의 (검색)
    var searchFailCount = 0;
    function handleSearchResult(data, status) {
        if (status === kakao.maps.services.Status.OK && data.length > 0) {
            var coords = new kakao.maps.LatLng(data[0].y, data[0].x);
            var circle = new kakao.maps.Circle({
                center: coords, radius: 50,
                strokeWeight: 1, strokeColor: '#ffa500', strokeOpacity: 1, strokeStyle: 'dashed',
                fillColor: '#FF1000', fillOpacity: 0.3
            });
            circle.setMap(map);
            setTimeout(()=>circle.setMap(null), 1000);
            map.setLevel(2);
            map.setCenter(coords);
            searchFailCount = 0;
        } else {
            searchFailCount++;
            if (searchFailCount >= 2) {
                showAlert("검색 결과가 없습니다.");
                $('#keyword').focus();
            }
        }
    }

    // -----------------------------------------------------
    // C. 이벤트 리스너 등록
    // -----------------------------------------------------

    kakao.maps.event.addListener(rv, 'position_changed', function() {
        var rvPosition = rv.getPosition();
        map.setCenter(rvPosition);
        if(overlayOn) marker.setPosition(rvPosition);
    });

    kakao.maps.event.addListener(marker, 'dragend', function() {
        toggleRoadview(marker.getPosition());
    });

    kakao.maps.event.addListener(map, 'click', function(mouseEvent){
        if(!overlayOn) return;
        var position = mouseEvent.latLng;
        marker.setPosition(position);
        toggleRoadview(position);
    });
    
    // 지도 중심 좌표 input 갱신
    kakao.maps.event.addListener(map, 'center_changed', function() {
        var latlng = map.getCenter(); 
        $('#gpsyx').val(latlng.getLat() + ', ' + latlng.getLng());  
    });
    
    // -----------------------------------------------------
    // D. 마커 초기화 및 그룹 버튼 이벤트 (핵심 순서)
    // -----------------------------------------------------

    // 1. 마커 데이터 준비 (중복 제거)
    const unique = {};
    const filtered = [];
    for (let i = 0; i < positions.length; i++) {
        const lat = positions[i].latlng.getLat();
        const lng = positions[i].latlng.getLng();
        const key = lat + "," + lng;
        if (!unique[key]) {
            unique[key] = true;
            filtered.push(positions[i]);
        }
    }

    // 2. 마커 초기화 시작
    window.initMarkers(map, filtered); 
    
    // 3. toggle_group 이벤트 리스너 정의 (안전한 호출)
    const toggleGroupBtn = document.getElementById("toggle_group");
    
    toggleGroupBtn.addEventListener("click", function () {
        if (window.markers && window.markers.length > 0) {
            drawGroupLinesMST();
            toggleGroupBtn.classList.toggle("selected_btn");
        } else {
            showAlert("마커 로딩 중입니다. 잠시 후 다시 시도해주세요.");
        }
    });
});
</script>

<script>
// '회선' 버튼에 함수 바인딩
function setRoadviewRoad() {
    var control = document.getElementById('roadviewControl');
    if (control.className.indexOf('active') === -1) {
        control.className = 'active';
        toggleOverlay(true);
    } else {
        control.className = '';
        toggleOverlay(false);
    }
}
function closeRoadview() {
    var position = marker.getPosition();
    toggleMapWrapper(true, position);
}

function geoError(err){ console.error('GPS error:', err); }

function toggleMyLocation() {
    if(trackOn) stopTracking();
    if(!myLocationOn){
        myLocationOn = true;
        document.getElementById('btnCurrentMe').classList.add('selected_btn');
        navigator.geolocation.getCurrentPosition(function(pos){
            showMyLocation(pos.coords.latitude, pos.coords.longitude);
        }, geoError, { enableHighAccuracy:true });
    } else {
        myLocationOn = false;
        document.getElementById('btnCurrentMe').classList.remove('selected_btn');
        if(myLocationMarker) {
            myLocationMarker.setMap(null);
            myLocationMarker = null;
        }
    }
}

function toggleTracking() {
    if(myLocationOn) toggleMyLocation();
    if(!trackOn) startTracking();
    else stopTracking();
}

function btnsearch_click() {
    $(':focus').blur();
    var bounds = new kakao.maps.LatLngBounds(
      new kakao.maps.LatLng(35.119382493091855, 128.18218076324376),
      new kakao.maps.LatLng(35.42383291087308, 128.59320201946082)
    );
    var geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch($('#keyword').val(), function(result, status) {
        handleSearchResult(result, status);
    }, { bounds: bounds });
    var ps = new kakao.maps.services.Places();
    ps.keywordSearch("함안군 " + $('#keyword').val(), function(data, status) {
        handleSearchResult(data, status);
    }, { bounds: bounds });
    searchFailCount = 0;
}

function showAlert(message) {
    const alertOverlay = $('#alert-overlay');
    const alertMessage = $('#alert-message');
    alertMessage.text(message);
    alertOverlay.fadeIn(300);
    setTimeout(()=>alertOverlay.fadeOut(500), 3000);
}

function filter(){
    var value = document.getElementById("keyword").value.toUpperCase();
    var item = document.getElementsByClassName("sel_txt");
    for(var i=0;i<item.length;i++){
        var text = item[i].innerText.toUpperCase().replace(/\s+/g,"");
        item[i].style.display = (text.indexOf(value) > -1) ? "flex" : "none";
    }
}
// 복사 버튼
document.getElementById("btn_input_copy").onclick = function(){
    const gpsyx = document.getElementById("gpsyx");
    gpsyx.select();
    document.execCommand('copy');
};
</script>

</body>
</html>
