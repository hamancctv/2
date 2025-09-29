

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

  <!-- 좌측 툴바 (검색) -->
  <div class="search-container">
      <input type="search" id="keyword" 
          onkeyup="filter()" autocomplete="off"
          onkeydown="if(event.keyCode === 13) { btnsearch_click(); }" 
          class="form-control" 
          placeholder="검색어 입력"/>
      <button id="searchBtn" onclick="btnsearch_click()">검색</button>
  </div>

  <!-- 우측 툴바 (좌표/복사) -->
  <div class="toolbar-right">
    <input type="text" id="gpsyx" class="input-common" inputmode="none"
           value="35.2725308711779, 128.406307024695"/>
    <button id="btn_input_copy" class="btn-common">복사</button>
  </div>

  <!-- 하단 컨트롤 -->
  <div class="custom_typecontrol2_m radius_border">
<span id="toggle_group" class="btn btn-common">회선</span>
    <span id="btnCurrentMe" class="btn btn-common" onclick="toggleMyLocation()">위치</span>
    <span id="btnTrackMe" class="btn btn-common" onclick="toggleTracking()">추적</span>
  </div>
    

<script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=5f253bed8a8966a66fc9076b662663fd&libraries=services,clusterer,drawing"></script>
<script src="https://code.jquery.com/jquery-3.6.1.js" integrity="sha256-3zlB5s2uwoUzrXK3BT7AX3FyvojsraNFxCc2vC/7pNI=" crossorigin="anonymous"></script>

<!-- 위치 데이터 -->
<script type="text/javascript" src="https://hamancctv.github.io/2/positions.js"></script> 

<script>
const toggleGroupBtn = document.getElementById('toggle_group');
toggleGroupBtn.addEventListener('click', function() {
    drawGroupLinesMST();
    toggleGroupBtn.classList.toggle('selected_btn');
});

var overlayOn = false,
    container = document.getElementById('container'),
    mapWrapper = document.getElementById('mapWrapper'),
    mapContainer = document.getElementById('map'),
    rvContainer = document.getElementById('roadview');

var mapCenter = new kakao.maps.LatLng(35.2725308711779, 128.406307024695),
    mapOption = { center: mapCenter, level: 4 };

var map = new kakao.maps.Map(mapContainer, mapOption);
map.setMaxLevel(9);
// ⭐ 전역 등록
window.map = map;
  
// 로드뷰
var rv = new kakao.maps.Roadview(rvContainer); 
var rvClient = new kakao.maps.RoadviewClient(); 

kakao.maps.event.addListener(rv, 'position_changed', function() {
    var rvPosition = rv.getPosition();
    map.setCenter(rvPosition);
    if(overlayOn) marker.setPosition(rvPosition);
});

var markImage = new kakao.maps.MarkerImage(
    'https://t1.daumcdn.net/localimg/localimages/07/2018/pc/roadview_minimap_wk_2018.png',
    new kakao.maps.Size(26, 46),
    {
        spriteSize: new kakao.maps.Size(1666, 168),
        spriteOrigin: new kakao.maps.Point(705, 114),
        offset: new kakao.maps.Point(13, 46)
    }
);

var marker = new kakao.maps.Marker({
    image : markImage,
    position: mapCenter,
    draggable: true
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

// 지도 타입 컨트롤
var mapTypeControl = new kakao.maps.MapTypeControl();
map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPLEFT);

// 내 위치 / 추적
var myLocationOn = false, trackOn = false;
var myLocationMarker = null, trackMarker = null;
var trackInterval = null, watchId = null;

var markerImage = new kakao.maps.MarkerImage(
    'https://hamancctv.github.io/2/icon-target.png',
    new kakao.maps.Size(32,32),
    { offset: new kakao.maps.Point(16,16) }
);

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

function toggleTracking() {
    if(myLocationOn) toggleMyLocation();
    if(!trackOn) startTracking();
    else stopTracking();
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

function geoError(err){ console.error('GPS error:', err); }

// 지도 중심 좌표 input 갱신
kakao.maps.event.addListener(map, 'center_changed', function() {
    var latlng = map.getCenter(); 
    $('#gpsyx').val(latlng.getLat() + ', ' + latlng.getLng());  
});

// 검색
var searchFailCount = 0;
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

function showAlert(message) {
    const alertOverlay = $('#alert-overlay');
    const alertMessage = $('#alert-message');
    alertMessage.text(message);
    alertOverlay.fadeIn(300);
    setTimeout(()=>alertOverlay.fadeOut(500), 3000);
}

// 복사 버튼
document.getElementById("btn_input_copy").onclick = function(){
    const gpsyx = document.getElementById("gpsyx");
    gpsyx.select();
    document.execCommand('copy');
};
</script>

<!-- sel_txt -->
<div id="menu_wrap" class="bg_white" style="border:1px solid #919191;border-radius:10px;"></div>
<script>
fetch("https://raw.githubusercontent.com/hamancctv/2/refs/heads/main/sel_txt.html")
  .then(res => res.text())
  .then(html => { document.getElementById("menu_wrap").innerHTML = html; })
  .catch(err => console.error("메뉴 로드 실패:", err));
</script>

<script>
function filter(){
  var value = document.getElementById("keyword").value.toUpperCase();
  var item = document.getElementsByClassName("sel_txt");
  for(var i=0;i<item.length;i++){
    var text = item[i].innerText.toUpperCase().replace(/\s+/g,""); // 공백 무시
    item[i].style.display = (text.indexOf(value) > -1) ? "flex" : "none";
  }
}
</script>

<!-- 그룹 선 연결 -->
<script src="https://hamancctv.github.io/2/drawGroupLinesMST.js?v=20250929a"></script>

<!-- 거리 측정 -->
<script src="https://hamancctv.github.io/2/btnDistance.js?v=20250929a"></script>

<!-- 마커 핸들러 분리 -->
<script src="https://hamancctv.github.io/2/markers-handler.js?v=20250929a"></script>
<script>
  // ✅ drawGroupLinesMST.js 불러온 뒤에 이벤트 등록
  const toggleGroupBtn = document.getElementById("toggle_group");
  toggleGroupBtn.addEventListener("click", function () {
    drawGroupLinesMST();
    toggleGroupBtn.classList.toggle("selected_btn");
  });
</script>
  
<script>
  // 필터링된 positions 배열 준비 후 실행
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

  // 전역 markers 에 저장됨 → drawGroupLinesMST() 에서 접근 가능
  initMarkers(map, filtered);
</script>
</body>
</html>
