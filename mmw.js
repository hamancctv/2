
// 로드뷰에서 X버튼을 눌렀을 때 로드뷰를 지도 뒤로 숨기는 함수입니다
function closeRoadview() {
    var position = marker.getPosition();
    toggleMapWrapper(true, position);
}

// 로드뷰에서 X버튼을 눌렀을 때 로드뷰를 지도 뒤로 숨기는 함수입니다
function closeRoadview() {
    var position = marker.getPosition();
    toggleMapWrapper(true, position);
}


function f_m_num(mMPID) {
    var list_id = $('span[value*='+mMPID+']').attr('id');
    list_id = list_id.substr(6);
    return list_id;    
}

function f_m_title(mMPID) {
    var list_title = $('span[value*='+mMPID+']').html();

    return list_title;    
}

function getTimeStamp() {
    var d = new Date();
  
    var s =
      leadingZeros(d.getFullYear().toString().substr(2,4), 2) + '/' +
      leadingZeros(d.getMonth() + 1, 2) + '/' +
      leadingZeros(d.getDate(), 2) + ' ' +
  
      leadingZeros(d.getHours(), 2) + ':' +
      leadingZeros(d.getMinutes(), 2);
  
    return s;
}  
  

function HideAllInfos() {
    for (var i = 0; i < infowindows.length; i++) {
        infowindows[i].close();
    }    
    //$("#MPNP").hide();
}

function HideAllTitle() {
    for (var i = 0; i < customOverlays.length; i++) {
        customOverlays[i].setVisible(false);
    }   
    btnTTShow.className = 'btn';
    btnTTHide.className = 'selected_btn';            
}

function HT(num) {
    HideAllInfos();    
    infowindows[num].open(map, markers[num]);
    for (var i = 0; i < markers.length; i++) {
        markers[i].setZIndex(20);
        customOverlays[i].setZIndex(10);
        infowindows[i].setZIndex(30);
        
    }  
    markers[num].setZIndex(21);
    customOverlays[num].setZIndex(11);    
    infowindows[num].setZIndex(31);
    map.panTo(markers[num].getPosition());
}

// "마커 감추기" 버튼을 클릭하면 호출되어 배열에 추가된 마커를 지도에서 삭제하는 함수입니다
function hideMarkers() {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
        customOverlays[i].setMap(null);             }
        
}


function hideOderlist() {
    for (var i = 0; i < o_list.length; i++) {
        markers[i].setMap(null);
        customOverlays[i].setMap(null);             }
}


function ShowAllTitle() {
    for (var i = 0; i < customOverlays.length; i++) {
        customOverlays[i].setVisible(true);
    }    
    btnTTShow.className = 'selected_btn';
    btnTTHide.className = 'btn';            
}

function leadingZeros(n, digits) {
    var zero = '';
    n = n.toString();
  
    if (n.length < digits) {
      for (i = 0; i < digits - n.length; i++)
        zero += '0';
    }
    return zero + n;
}

function nameMarker(mMarker){    
    mMarker = mMarker.replace('/mm/op/user/done/','');
    mMarker = mMarker.replace('/mm/op/user/','');    

    return mMarker;
}


function makeAllDrag() {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setDraggable(true);
    }            

    btnAllDrag.className = 'selected_btn';
    btnLockDrag.className = 'btn';    
}

function makeOverListener(map, marker, infowindow) {
    return function() {
        HideAllInfos();                
        infowindow.open(map, marker);
    };
}

// 인포윈도우를 닫는 클로저를 만드는 함수입니다 
function makeOutListener(infowindow) {
    return function() {
        infowindow.close();
    };
}

function makeLockDrag() {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setDraggable(false);
    }            
    btnAllDrag.className = 'btn';
    btnLockDrag.className = 'selected_btn';
}


function mapCurrentPosition2() {
    // 내 위치 표시
var markerImage = new kakao.maps.MarkerImage("https://raw.githubusercontent.com/hamancctv/2/main/pin_me.png", new kakao.maps.Size(56, 49), {offset: new kakao.maps.Point(28, 49)});
		myMarker = new kakao.maps.Marker({
			map: map,
			position: new kakao.maps.LatLng(myPosLat, myPosLng),
			image: markerImage,
			title : "내위치"
    navigator.geolocation.getCurrentPosition(function (pos) {

        myPosLat = pos.coords.latitude;
        myPosLng = pos.coords.longitude;

        //			marker.setPosition(LatLng(myPosLat, myPosLng));
        myMarker.setPosition(new kakao.maps.LatLng(myPosLat, myPosLng));
        map.setCenter(new kakao.maps.LatLng(myPosLat, myPosLng));
map.setLevel(4);
        myMarker.setVisible(true);
        btnCurrentMe.className = 'selected_btn';
        btnCurrentHideMe.className = 'btn';

    });
    //--내 위치 표시
}


function mapCurrentPositionHide() {
    myMarker.setVisible(false);
    btnCurrentMe.className = 'btn';
    btnCurrentHideMe.className = 'selected_btn';
}



function navi2(m_name, p_m_y, p_m_x, type) {


    m_name = regExp(m_name, 1);
    var m_x = parseFloat(p_m_x);
    var m_y = parseFloat(p_m_y);     

    if (type == 0) {  
        Kakao.Navi.start({
        name: m_name,
        x: m_x,
        y: m_y,
        coordType: 'wgs84'
        })
    } else if ((type == 1)) {
        window.open('https://apis.openapi.sk.com/tmap/app/routes?appKey=l7xx07fae618b9604b2680aee9097f5e57a0&name='+m_name+'&lon='+m_x+'&lat='+m_y);
    } else if ((type == 2)) {       window.open('https://map.kakao.com/link/to/'+m_name+','+m_y+','+m_x);        }

}


function regExp(str, type){  
    var reg = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi
    
    
    if (type == 1) { reg = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi}
    if (type == 2) { reg = /[\{\}\[\]\/?,;:|*~`!^\+<>@\#$%&\\\=\'\"]/gi}  // . _ - ( ) 포함
    if (type == 3) { reg = /[\{\}\[\]\/?;:|*~`!^\+<>@\#$%&\\\=\'\"]/gi}  // , . _ - ( ) 포함
    if (type == 4) { reg = /[\{\}\[\]\/?;:|*~`!^\+<>@\#$%&\\\=]/gi}  // " ' , . _ - ( ) 포함        
    if (type == 5) { reg = /[\{\}\[\]?;|*~`!^\+<>@\#$%&\\\=]/gi}  // " ' , . _ - ( ) 포함            
    
    //특수문자 검증
    if(reg.test(str)){
        //특수문자 제거후 리턴
        return str.replace(reg, "");    
    } else {
        //특수문자가 없으므로 본래 문자 리턴
        return str;
    }  
}

function setMarkers(map,kind) {
    for (var i = 0; i < markers.length; i++) {
        if (kind == markers[i].getTitle()){
        markers[i].setMap(map);
        customOverlays[i].setMap(map);
        } 

        //console.log(markers[i]); 
        //console.log(markers[i].Fb);         
    }            
}

function showMarkers() {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
        customOverlays[i].setMap(map);             }


}


// 체크 박스를 선택하면 호출되는 함수입니다
function setOverlayMapTypeId() {
    var chkuseDistrict = document.getElementById('chkuseDistrict');
    // 지도 타입을 제거합니다
    for (var type in mapTypes) {
        map.removeOverlayMapTypeId(mapTypes[type]);
    }
    // 지적편집도정보 체크박스가 체크되어있으면 지도에 지적편집도정보 지도타입을 추가합니다
    if (chkuseDistrict.checked) {
        map.addOverlayMapTypeId(mapTypes.useDistrict);
    }

} 

function setOverlayMapTypeId1() {

    var chkuseDistrict = document.getElementById('chkuseDistrict');

    // 지도 타입을 제거합니다
    for (var type in mapTypes) {
        map.removeOverlayMapTypeId(mapTypes[type]);
    }
    // 지적편집도정보 체크박스가 체크되어있으면 지도에 지적편집도정보 지도타입을 추가합니다
    map.addOverlayMapTypeId(mapTypes.useDistrict);
    btnGround.className = 'selected_btn';
    btnGroundHide.className = 'btn';
}

function setOverlayMapTypeId2() {

    var chkuseDistrict = document.getElementById('chkuseDistrict');
    // 지도 타입을 제거합니다
    for (var type in mapTypes) {
        map.removeOverlayMapTypeId(mapTypes[type]);
    }

    btnGround.className = 'btn';
    btnGroundHide.className = 'selected_btn';

}

function setOverlayMapType_m() {
    var control = document.getElementById('overlayMapType_m');
    var chkuseDistrict = document.getElementById('chkuseDistrict');
    // 버튼이 눌린 상태가 아니면
    if (control.className.indexOf('active') === -1) {
        control.className = 'active';
        for (var type in mapTypes) {
            map.removeOverlayMapTypeId(mapTypes[type]);            }
    // 지적편집도정보 체크박스가 체크되어있으면 지도에 지적편집도정보 지도타입을 추가합니다
        map.addOverlayMapTypeId(mapTypes.useDistrict);       
    } else {
        control.className = '';
        for (var type in mapTypes) {
            map.removeOverlayMapTypeId(mapTypes[type]);    
        }        
        // 로드뷰 도로 오버레이를 제거합니다
        //toggleOverlay(false);
    }
}


function setRealPos_m() {
    var control = document.getElementById('realPos_m');
    // 버튼이 눌린 상태가 아니면
    if (control.className.indexOf('active') === -1) {
        control.className = 'active';

        interval = setInterval(function() {                
                     
            mapCurrentPosition2();            
        
        }, 1000);



    } else {
        control.className = '';
        clearInterval(interval);
        
    }
}


function setShowList() {
    if (chkshowlist.checked) {
        menu_wrap.style.visibility = 'visible'
    } else {
        menu_wrap.style.visibility = 'hidden'
    }
}

function setShowList1() {
    menu_wrap.style.visibility = 'visible';
    btnTitleList.className = 'selected_btn';
    btnTitleListHide.className = 'btn';
}

function setShowList2() {
    menu_wrap.style.visibility = 'hidden';
    btnTitleList.className = 'btn';
    btnTitleListHide.className = 'selected_btn';
}

function setShowList3() {
    menu_wrap.style.visibility='visible';
    menu_draw.style.visibility='visible';
    menu_rule.style.visibility='visible';    
    btnTitleList.className = 'selected_btn';
    btnTitleListHide.className = 'btn';      
}  

function setShowList4() {
    menu_wrap.style.visibility='hidden';
    menu_draw.style.visibility='hidden';
    menu_rule.style.visibility='hidden';
    btnTitleList.className = 'btn';
    btnTitleListHide.className = 'selected_btn';      
}      

function setShowList1m() {
    menu_wrap_m.style.visibility='visible';
    btnTitleList.className = 'selected_btn';
    btnTitleListHide.className = 'btn';       
}     

function setShowList2m() {
    menu_wrap_m.style.visibility='hidden';
    btnTitleList.className = 'btn';
    btnTitleListHide.className = 'selected_btn';        
}      

function setRoadviewRoad_m() {
    var control = document.getElementById('roadviewControl_m');
    // 버튼이 눌린 상태가 아니면
    if (control.className.indexOf('active') === -1) {
        control.className = 'active';
        // 로드뷰 도로 오버레이가 보이게 합니다
        toggleOverlay(true);
    } else {
        control.className = '';
        // 로드뷰 도로 오버레이를 제거합니다
        toggleOverlay(false);
    }
}

function setCenter(Lat, Lng) {
    if (Lat == null) { return 0 };
    // 이동할 위도 경도 위치를 생성합니다 

    var moveLatLon = new kakao.maps.LatLng(Lat, Lng);

    // 지도 중심을 이동 시킵니다
    map.panTo(moveLatLon);
    var circle = new kakao.maps.Circle({
        center: new kakao.maps.LatLng(Lat, Lng),  // 원의 중심좌표 입니다 
        radius: 100, // 미터 단위의 원의 반지름입니다 
        strokeWeight: 1, // 선의 두께입니다 
        strokeColor: '#ffa500', // 선의 색깔입니다
        strokeOpacity: 1, // 선의 불투명도 입니다 1에서 0 사이의 값이며 0에 가까울수록 투명합니다
        strokeStyle: 'dashed', // 선의 스타일 입니다
        fillColor: '#FF0000', // 채우기 색깔입니다
        fillOpacity: 0.3  // 채우기 불투명도 입니다   
    });

    // 지도에 원을 표시합니다 
    circle.setMap(map);
    setTimeout(function () {
        circle.setMap(null);;
    }, 2000);

}


function sC(Lat, Lng, num) {            

    $("#MPNP").hide();    

    if (Lat == null) {return 0};
    // 이동할 위도 경도 위치를 생성합니다 

    for (var i = 0; i < markers.length; i++) {
        markers[i].setZIndex(20);
        customOverlays[i].setZIndex(10);
        infowindows[i].setZIndex(30);
        
    }  
    markers[num].setZIndex(21);
    customOverlays[num].setZIndex(11);    
    infowindows[num].setZIndex(31);

    var moveLatLon = new kakao.maps.LatLng(Lat, Lng);

    // 지도 중심을 이동 시킵니다
        map.panTo(moveLatLon);
    var circle = new kakao.maps.Circle({
        center : new kakao.maps.LatLng(Lat,  Lng),  // 원의 중심좌표 입니다 
        radius: 100, // 미터 단위의 원의 반지름입니다 
        strokeWeight: 1, // 선의 두께입니다 
        strokeColor: '#ffa500', // 선의 색깔입니다
        strokeOpacity: 1, // 선의 불투명도 입니다 1에서 0 사이의 값이며 0에 가까울수록 투명합니다
        strokeStyle: 'dashed', // 선의 스타일 입니다
        fillColor: '#FF0000', // 채우기 색깔입니다
        fillOpacity: 0.3  // 채우기 불투명도 입니다   
        }); 

    // 지도에 원을 표시합니다 
    circle.setMap(map);     
    setTimeout(function(){
    circle.setMap(null);    ;
    }, 2000);        
        
}

function setMapType(maptype) { 
    var roadmapControl = document.getElementById('btnRoadmap');
    var skyviewControl = document.getElementById('btnSkyview'); 

    if (maptype === 'roadmap') {
        map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);    
        roadmapControl.className = 'selected_btn';
        skyviewControl.className = 'btn';      
    } 
    if (maptype === 'skyview') {
        map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);    
        skyviewControl.className = 'selected_btn';
        roadmapControl.className = 'btn';        
    }
}


// 지도 위의 로드뷰 버튼을 눌렀을 때 호출되는 함수입니다
function setRoadviewRoad() {
    var control = document.getElementById('roadviewControl');
    // 버튼이 눌린 상태가 아니면
    if (control.className.indexOf('active') === -1) {
        control.className = 'active';
        // 로드뷰 도로 오버레이가 보이게 합니다
        toggleOverlay(true);
    } else {
        control.className = '';
        // 로드뷰 도로 오버레이를 제거합니다
        toggleOverlay(false);
    }
}



function save_one_PC(num)
{
    mMP_PC = "input_MP_PC["+num+"]";        
    if ((document.getElementById(mMP_PC).value) == '') document.getElementById(mMP_PC).value = "완료(" + getTimeStamp() + ")";
    save_PC(num);
}




// 전달받은 좌표(position)에 가까운 로드뷰의 파노라마 ID를 추출하여
// 로드뷰를 설정하는 함수입니다
function toggleRoadview(position) {
    rvClient.getNearestPanoId(position, 50, function (panoId) {
        // 파노라마 ID가 null 이면 로드뷰를 숨깁니다
        if (panoId === null) {
            toggleMapWrapper(true, position);
        } else {
            toggleMapWrapper(false, position);

            // panoId로 로드뷰를 설정합니다
            rv.setPanoId(panoId, position);
        }
    });
}

// 지도를 감싸고 있는 div의 크기를 조정하는 함수입니다
function toggleMapWrapper(active, position) {
    if (active) {
        // 지도를 감싸고 있는 div의 너비가 100%가 되도록 class를 변경합니다 
        container.className = '';
        // 지도의 크기가 변경되었기 때문에 relayout 함수를 호출합니다
        map.relayout();
        // 지도의 너비가 변경될 때 지도중심을 입력받은 위치(position)로 설정합니다
        map.setCenter(position);
    } else {
        // 지도만 보여지고 있는 상태이면 지도의 너비가 50%가 되도록 class를 변경하여
        // 로드뷰가 함께 표시되게 합니다
        if (container.className.indexOf('view_roadview') === -1) {
            container.className = 'view_roadview';
            // 지도의 크기가 변경되었기 때문에 relayout 함수를 호출합니다
            map.relayout();
            // 지도의 너비가 변경될 때 지도중심을 입력받은 위치(position)로 설정합니다
            map.setCenter(position);
        }
    }
}

// 지도 위의 로드뷰 도로 오버레이를 추가,제거하는 함수입니다
function toggleOverlay(active) {
    if (active) {
        overlayOn = true;
        // 지도 위에 로드뷰 도로 오버레이를 추가합니다
        map.addOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);
        // 지도 위에 마커를 표시합니다
        marker.setMap(map);
        // 마커의 위치를 지도 중심으로 설정합니다 
        marker.setPosition(map.getCenter());
        // 로드뷰의 위치를 지도 중심으로 설정합니다
        toggleRoadview(map.getCenter());
    } else {
        overlayOn = false;
        // 지도 위의 로드뷰 도로 오버레이를 제거합니다
        map.removeOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);
        // 지도 위의 마커를 제거합니다
        marker.setMap(null);
    }
}


function viewKind(mKind) { 

    setMarkers(map,mKind);    
}



//////////////////

var clickHandlerRule;
var mousemoveHandlerRule;
var rightclickHandlerRule;

var drawingFlagCir = false; // 원이 그려지고 있는 상태를 가지고 있을 변수입니다
var centerPosition; // 원의 중심좌표 입니다
var drawingCircle; // 그려지고 있는 원을 표시할 원 객체입니다
var drawingLineC; // 그려지고 있는 원의 반지름을 표시할 선 객체입니다
var drawingOverlay; // 그려지고 있는 원의 반경을 표시할 커스텀오버레이 입니다
var drawingDot; // 그려지고 있는 원의 중심점을 표시할 커스텀오버레이 입니다

var circles = []; // 클릭으로 그려진 원과 반경 정보를 표시하는 선과 커스텀오버레이를 가지고 있을 배열입니다


var drawingFlagLine = false; // 선이 그려지고 있는 상태를 가지고 있을 변수입니다
var moveLine; // 선이 그려지고 있을때 마우스 움직임에 따라 그려질 선 객체 입니다
var clickLine // 마우스로 클릭한 좌표로 그려질 선 객체입니다
var distanceOverlay; // 선의 거리정보를 표시할 커스텀오버레이 입니다
var dots = {}; // 선이 그려지고 있을때 클릭할 때마다 클릭 지점과 거리를 표시하는 커스텀 오버레이 배열입니다.


var drawingFlagPoly = false; // 다각형이 그려지고 있는 상태를 가지고 있을 변수입니다
var drawingPolygon; // 그려지고 있는 다각형을 표시할 다각형 객체입니다
var polygon; // 그리기가 종료됐을 때 지도에 표시할 다각형 객체입니다
var areaOverlay; // 다각형의 면적정보를 표시할 커스텀오버레이 입니다


function rule_circle()
{

        setRuleClear();

        // 지도에 클릭 이벤트를 등록합니다

        clickHandlerRule = function(mouseEvent) {   
            // 클릭 이벤트가 발생했을 때 원을 그리고 있는 상태가 아니면 중심좌표를 클릭한 지점으로 설정합니다
            if (!drawingFlagCir) {    
                removeCircles();
                // 상태를 그리고있는 상태로 변경합니다
                drawingFlagCir = true; 
                
                // 원이 그려질 중심좌표를 클릭한 위치로 설정합니다 
                centerPosition = mouseEvent.latLng; 

                // 그려지고 있는 원의 반경을 표시할 선 객체를 생성합니다
                if (!drawingLineC) {
                    drawingLineC = new kakao.maps.Polyline({
                        strokeWeight: 3, // 선의 두께입니다
                        strokeColor: '#00a0e9', // 선의 색깔입니다
                        strokeOpacity: 1, // 선의 불투명도입니다 0에서 1 사이값이며 0에 가까울수록 투명합니다
                        strokeStyle: 'solid' // 선의 스타일입니다
                    });    
                }
                
                // 그려지고 있는 원을 표시할 원 객체를 생성합니다
                if (!drawingCircle) {                    
                    drawingCircle = new kakao.maps.Circle({ 
                        strokeWeight: 1, // 선의 두께입니다
                        strokeColor: '#00a0e9', // 선의 색깔입니다
                        strokeOpacity: 0.1, // 선의 불투명도입니다 0에서 1 사이값이며 0에 가까울수록 투명합니다
                        strokeStyle: 'solid', // 선의 스타일입니다
                        fillColor: '#00a0e9', // 채우기 색깔입니다
                        fillOpacity: 0.2 // 채우기 불투명도입니다 
                    });     
                }
                
                // 그려지고 있는 원의 반경 정보를 표시할 커스텀오버레이를 생성합니다
                if (!drawingOverlay) {
                    drawingOverlay = new kakao.maps.CustomOverlay({
                        xAnchor: 0,
                        yAnchor: 0,
                        zIndex: 1
                    });              
                }
            }
        }
            
        kakao.maps.event.addListener(map, 'click', clickHandlerRule);

        // 지도에 마우스무브 이벤트를 등록합니다
        // 원을 그리고있는 상태에서 마우스무브 이벤트가 발생하면 그려질 원의 위치와 반경정보를 동적으로 보여주도록 합니다
        kakao.maps.event.addListener(map, 'mousemove', function (mouseEvent) {
                
            // 마우스무브 이벤트가 발생했을 때 원을 그리고있는 상태이면
            if (drawingFlagCir) {

                // 마우스 커서의 현재 위치를 얻어옵니다 
                var mousePosition = mouseEvent.latLng; 
                
                // 그려지고 있는 선을 표시할 좌표 배열입니다. 클릭한 중심좌표와 마우스커서의 위치로 설정합니다
                var linePath = [centerPosition, mousePosition];     
                
                // 그려지고 있는 선을 표시할 선 객체에 좌표 배열을 설정합니다
                drawingLineC.setPath(linePath);
                
                // 원의 반지름을 선 객체를 이용해서 얻어옵니다 
                var length = drawingLineC.getLength();
                
                if(length > 0) {
                    
                    // 그려지고 있는 원의 중심좌표와 반지름입니다
                    var circleOptions = { 
                        center : centerPosition, 
                    radius: length,                 
                    };
                    
                    // 그려지고 있는 원의 옵션을 설정합니다
                    drawingCircle.setOptions(circleOptions); 
                        
                    // 반경 정보를 표시할 커스텀오버레이의 내용입니다
                    var radius = Math.round(drawingCircle.getRadius()),   
                    content = '<div class="info">반경 <span class="number">' + radius + '</span>m</div>';
                    
                    // 반경 정보를 표시할 커스텀 오버레이의 좌표를 마우스커서 위치로 설정합니다
                    drawingOverlay.setPosition(mousePosition);
                    
                    // 반경 정보를 표시할 커스텀 오버레이의 표시할 내용을 설정합니다
                    drawingOverlay.setContent(content);
                    
                    // 그려지고 있는 원을 지도에 표시합니다
                    drawingCircle.setMap(map); 
                    
                    // 그려지고 있는 선을 지도에 표시합니다
                    drawingLineC.setMap(map);  
                    
                    // 그려지고 있는 원의 반경정보 커스텀 오버레이를 지도에 표시합니다
                    drawingOverlay.setMap(map);
                    
                } else { 
                    
                    drawingCircle.setMap(null);
                    drawingLineC.setMap(null);    
                    drawingOverlay.setMap(null);
                    
                }
            }     
        });     

        // 지도에 마우스 오른쪽 클릭이벤트를 등록합니다
        // 원을 그리고있는 상태에서 마우스 오른쪽 클릭 이벤트가 발생하면
        // 마우스 오른쪽 클릭한 위치를 기준으로 원과 원의 반경정보를 표시하는 선과 커스텀 오버레이를 표시하고 그리기를 종료합니다
        rightclickHandlerRule = function(mouseEvent) {    
            if (drawingFlagCir) {

            // 마우스로 오른쪽 클릭한 위치입니다 
            var rClickPosition = mouseEvent.latLng; 

            // 원의 반경을 표시할 선 객체를 생성합니다
            var polyline = new kakao.maps.Polyline({
                path: [centerPosition, rClickPosition], // 선을 구성하는 좌표 배열입니다. 원의 중심좌표와 클릭한 위치로 설정합니다
                strokeWeight: 3, // 선의 두께 입니다
                strokeColor: '#00a0e9', // 선의 색깔입니다
                strokeOpacity: 1, // 선의 불투명도입니다 0에서 1 사이값이며 0에 가까울수록 투명합니다
                strokeStyle: 'solid' // 선의 스타일입니다
            });

            // 원 객체를 생성합니다
            var circle = new kakao.maps.Circle({ 
                center : centerPosition, // 원의 중심좌표입니다
                radius: polyline.getLength(), // 원의 반지름입니다 m 단위 이며 선 객체를 이용해서 얻어옵니다
                strokeWeight: 1, // 선의 두께입니다
                strokeColor: '#00a0e9', // 선의 색깔입니다
                strokeOpacity: 0.1, // 선의 불투명도입니다 0에서 1 사이값이며 0에 가까울수록 투명합니다
                strokeStyle: 'solid', // 선의 스타일입니다
                fillColor: '#00a0e9', // 채우기 색깔입니다
                fillOpacity: 0.2  // 채우기 불투명도입니다 
            });

            var radius = Math.round(circle.getRadius()), // 원의 반경 정보를 얻어옵니다
                content = getTimeHTML(radius); // 커스텀 오버레이에 표시할 반경 정보입니다


            // 반경정보를 표시할 커스텀 오버레이를 생성합니다
            var radiusOverlay = new kakao.maps.CustomOverlay({
                content: content, // 표시할 내용입니다
                position: rClickPosition, // 표시할 위치입니다. 클릭한 위치로 설정합니다
                xAnchor: 0,
                yAnchor: 0,
                zIndex: 1 
            });  

            // 원을 지도에 표시합니다
            circle.setMap(map); 

            // 선을 지도에 표시합니다
            polyline.setMap(map);

            // 반경 정보 커스텀 오버레이를 지도에 표시합니다
            radiusOverlay.setMap(map);

            // 배열에 담을 객체입니다. 원, 선, 커스텀오버레이 객체를 가지고 있습니다
            var radiusObj = {
                'polyline' : polyline,
                'circle' : circle,
                'overlay' : radiusOverlay
            };

            // 배열에 추가합니다
            // 이 배열을 이용해서 "모두 지우기" 버튼을 클릭했을 때 지도에 그려진 원, 선, 커스텀오버레이들을 지웁니다
            circles.push(radiusObj);   

            // 그리기 상태를 그리고 있지 않는 상태로 바꿉니다
            drawingFlagCir = false;

            // 중심 좌표를 초기화 합니다  
            centerPosition = null;

            // 그려지고 있는 원, 선, 커스텀오버레이를 지도에서 제거합니다
            drawingCircle.setMap(null);
            drawingLineC.setMap(null);   
            drawingOverlay.setMap(null);
            drawingFlagCir = false;


            }
            
        }   
        kakao.maps.event.addListener(map, 'rightclick', rightclickHandlerRule);
            
        // 지도에 표시되어 있는 모든 원과 반경정보를 표시하는 선, 커스텀 오버레이를 지도에서 제거합니다
        function removeCircles() {         
            for (var i = 0; i < circles.length; i++) {
                circles[i].circle.setMap(null);    
                circles[i].polyline.setMap(null);
                circles[i].overlay.setMap(null);
            }         
            circles = [];
        }

        // 마우스 우클릭 하여 원 그리기가 종료됐을 때 호출하여 
        // 그려진 원의 반경 정보와 반경에 대한 도보, 자전거 시간을 계산하여
        // HTML Content를 만들어 리턴하는 함수입니다
        function getTimeHTML(distance) {

            // 도보의 시속은 평균 4km/h 이고 도보의 분속은 67m/min입니다
            var walkkTime = distance / 67 | 0;
            var walkHour = '', walkMin = '';

            // 계산한 도보 시간이 60분 보다 크면 시간으로 표시합니다
            if (walkkTime > 60) {
                walkHour = '<span class="number">' + Math.floor(walkkTime / 60) + '</span>시간 '
            }
            walkMin = '<span class="number">' + walkkTime % 60 + '</span>분'

            // 자전거의 평균 시속은 16km/h 이고 이것을 기준으로 자전거의 분속은 267m/min입니다
            var bycicleTime = distance / 227 | 0;
            var bycicleHour = '', bycicleMin = '';

            // 계산한 자전거 시간이 60분 보다 크면 시간으로 표출합니다
            if (bycicleTime > 60) {
                bycicleHour = '<span class="number">' + Math.floor(bycicleTime / 60) + '</span>시간 '
            }
            bycicleMin = '<span class="number">' + bycicleTime % 60 + '</span>분'

            // 거리와 도보 시간, 자전거 시간을 가지고 HTML Content를 만들어 리턴합니다
            var content = '<ul class="info">';
            content += '        <span>총거리</span><span class="number">' + distance + '</span>m';
            content += '        <span >도보</span>' + walkHour + walkMin;
            content += '        <span >자전거</span>' + bycicleHour + bycicleMin;
            content += '</ul>'

            return content;
        }

}

function rule_line()
{
    setRuleClear();

    // 지도에 클릭 이벤트를 등록합니다
    // 지도를 클릭하면 선 그리기가 시작됩니다 그려진 선이 있으면 지우고 다시 그립니다

    clickHandlerRule = function(mouseEvent) {    
        // 마우스로 클릭한 위치입니다 
        var clickPosition = mouseEvent.latLng;

        // 지도 클릭이벤트가 발생했는데 선을 그리고있는 상태가 아니면
        if (!drawingFlagLine) {

            // 상태를 true로, 선이 그리고있는 상태로 변경합니다
            drawingFlagLine = true;
            
            // 지도 위에 선이 표시되고 있다면 지도에서 제거합니다
            deleteClickLine();
            
            // 지도 위에 커스텀오버레이가 표시되고 있다면 지도에서 제거합니다
            deleteDistnce();

            // 지도 위에 선을 그리기 위해 클릭한 지점과 해당 지점의 거리정보가 표시되고 있다면 지도에서 제거합니다
            deleteCircleDot();

            // 클릭한 위치를 기준으로 선을 생성하고 지도위에 표시합니다
            clickLine = new kakao.maps.Polyline({
                map: map, // 선을 표시할 지도입니다 
                path: [clickPosition], // 선을 구성하는 좌표 배열입니다 클릭한 위치를 넣어줍니다
                strokeWeight: 3, // 선의 두께입니다 
                strokeColor: '#db4040', // 선의 색깔입니다
                strokeOpacity: 1, // 선의 불투명도입니다 0에서 1 사이값이며 0에 가까울수록 투명합니다
                strokeStyle: 'solid' // 선의 스타일입니다
            });
            
            // 선이 그려지고 있을 때 마우스 움직임에 따라 선이 그려질 위치를 표시할 선을 생성합니다
            moveLine = new kakao.maps.Polyline({
                strokeWeight: 3, // 선의 두께입니다 
                strokeColor: '#db4040', // 선의 색깔입니다
                strokeOpacity: 0.5, // 선의 불투명도입니다 0에서 1 사이값이며 0에 가까울수록 투명합니다
                strokeStyle: 'solid' // 선의 스타일입니다    
            });

            // 클릭한 지점에 대한 정보를 지도에 표시합니다
            displayCircleDot(clickPosition, 0);

                
        } else { // 선이 그려지고 있는 상태이면

            // 그려지고 있는 선의 좌표 배열을 얻어옵니다
            var path = clickLine.getPath();

            // 좌표 배열에 클릭한 위치를 추가합니다
            path.push(clickPosition);
            
            // 다시 선에 좌표 배열을 설정하여 클릭 위치까지 선을 그리도록 설정합니다
            clickLine.setPath(path);

            var distance = Math.round(clickLine.getLength());
            displayCircleDot(clickPosition, distance);
        }
    }
    kakao.maps.event.addListener(map, 'click', clickHandlerRule);

   
    // 지도에 마우스무브 이벤트를 등록합니다
    // 선을 그리고있는 상태에서 마우스무브 이벤트가 발생하면 그려질 선의 위치를 동적으로 보여주도록 합니다
    kakao.maps.event.addListener(map, 'mousemove', function (mouseEvent) {

        // 지도 마우스무브 이벤트가 발생했는데 선을 그리고있는 상태이면
        if (drawingFlagLine){
            
            // 마우스 커서의 현재 위치를 얻어옵니다 
            var mousePosition = mouseEvent.latLng; 

            // 마우스 클릭으로 그려진 선의 좌표 배열을 얻어옵니다
            var path = clickLine.getPath();
            
            // 마우스 클릭으로 그려진 마지막 좌표와 마우스 커서 위치의 좌표로 선을 표시합니다
            var movepath = [path[path.length-1], mousePosition];
            moveLine.setPath(movepath);    
            moveLine.setMap(map);
            
            var distance = Math.round(clickLine.getLength() + moveLine.getLength()), // 선의 총 거리를 계산합니다
                content = '<div class="dotOverlay distanceInfo">총거리 <span class="number">' + distance + '</span>m</div>'; // 커스텀오버레이에 추가될 내용입니다
            
            // 거리정보를 지도에 표시합니다
            showDistance(content, mousePosition);   
        }             
    });                 

    // 지도에 마우스 오른쪽 클릭 이벤트를 등록합니다
    // 선을 그리고있는 상태에서 마우스 오른쪽 클릭 이벤트가 발생하면 선 그리기를 종료합니다
    rightclickHandlerRule = function(mouseEvent) {    
        // 지도 오른쪽 클릭 이벤트가 발생했는데 선을 그리고있는 상태이면
        if (drawingFlagLine) {
            
            // 마우스무브로 그려진 선은 지도에서 제거합니다
            moveLine.setMap(null);
            moveLine = null;  
            
            // 마우스 클릭으로 그린 선의 좌표 배열을 얻어옵니다
            var path = clickLine.getPath();
        
            // 선을 구성하는 좌표의 개수가 2개 이상이면
            if (path.length > 1) {

                // 마지막 클릭 지점에 대한 거리 정보 커스텀 오버레이를 지웁니다
                if (dots[dots.length-1].distance) {
                    dots[dots.length-1].distance.setMap(null);
                    dots[dots.length-1].distance = null;    
                }

                var distance = Math.round(clickLine.getLength()), // 선의 총 거리를 계산합니다
                    content = getTimeHTML(distance); // 커스텀오버레이에 추가될 내용입니다
                    
                // 그려진 선의 거리정보를 지도에 표시합니다
                showDistance(content, path[path.length-1]);  
                
            } else {

                // 선을 구성하는 좌표의 개수가 1개 이하이면 
                // 지도에 표시되고 있는 선과 정보들을 지도에서 제거합니다.
                deleteClickLine();
                deleteCircleDot(); 
                deleteDistnce();

            }
            
            // 상태를 false로, 그리지 않고 있는 상태로 변경합니다
            drawingFlagLine = false;          
        }  

    }

    kakao.maps.event.addListener(map, 'rightclick', rightclickHandlerRule);


    // 클릭으로 그려진 선을 지도에서 제거하는 함수입니다
    function deleteClickLine() {
        if (clickLine) {
            clickLine.setMap(null);    
            clickLine = null;        
        }
    }

    // 마우스 드래그로 그려지고 있는 선의 총거리 정보를 표시하거
    // 마우스 오른쪽 클릭으로 선 그리가 종료됐을 때 선의 정보를 표시하는 커스텀 오버레이를 생성하고 지도에 표시하는 함수입니다
    function showDistance(content, position) {
        
        if (distanceOverlay) { // 커스텀오버레이가 생성된 상태이면
            
            // 커스텀 오버레이의 위치와 표시할 내용을 설정합니다
            distanceOverlay.setPosition(position);
            distanceOverlay.setContent(content);
            
        } else { // 커스텀 오버레이가 생성되지 않은 상태이면
            
            // 커스텀 오버레이를 생성하고 지도에 표시합니다
            distanceOverlay = new kakao.maps.CustomOverlay({
                map: map, // 커스텀오버레이를 표시할 지도입니다
                content: content,  // 커스텀오버레이에 표시할 내용입니다
                position: position, // 커스텀오버레이를 표시할 위치입니다.
                xAnchor: 0,
                yAnchor: 0,
                zIndex: 3  
            });      
        }
    }

    // 그려지고 있는 선의 총거리 정보와 
    // 선 그리가 종료됐을 때 선의 정보를 표시하는 커스텀 오버레이를 삭제하는 함수입니다
    function deleteDistnce () {
        if (distanceOverlay) {
            distanceOverlay.setMap(null);
            distanceOverlay = null;
        }
    }

    // 선이 그려지고 있는 상태일 때 지도를 클릭하면 호출하여 
    // 클릭 지점에 대한 정보 (동그라미와 클릭 지점까지의 총거리)를 표출하는 함수입니다
    function displayCircleDot(position, distance) {

        // 클릭 지점을 표시할 빨간 동그라미 커스텀오버레이를 생성합니다
        var circleOverlay = new kakao.maps.CustomOverlay({
            content: '<span class="dot"></span>',
            position: position,
            zIndex: 1
        });

        // 지도에 표시합니다
        circleOverlay.setMap(map);

        if (distance > 0) {
            // 클릭한 지점까지의 그려진 선의 총 거리를 표시할 커스텀 오버레이를 생성합니다
            var distanceOverlay = new kakao.maps.CustomOverlay({
                content: '<div class="dotOverlay">거리 <span class="number">' + distance + '</span>m</div>',
                position: position,
                yAnchor: 1,
                zIndex: 2
            });

            // 지도에 표시합니다
            distanceOverlay.setMap(map);
        }

        // 배열에 추가합니다
        dots.push({circle:circleOverlay, distance: distanceOverlay});
    }

    // 클릭 지점에 대한 정보 (동그라미와 클릭 지점까지의 총거리)를 지도에서 모두 제거하는 함수입니다
    function deleteCircleDot() {
        var i;

        for ( i = 0; i < dots.length; i++ ){
            if (dots[i].circle) { 
                dots[i].circle.setMap(null);
            }

            if (dots[i].distance) {
                dots[i].distance.setMap(null);
            }
        }

        dots = [];
    }

    // 마우스 우클릭 하여 선 그리기가 종료됐을 때 호출하여 
    // 그려진 선의 총거리 정보와 거리에 대한 도보, 자전거 시간을 계산하여
    // HTML Content를 만들어 리턴하는 함수입니다
    function getTimeHTML(distance) {

        // 도보의 시속은 평균 4km/h 이고 도보의 분속은 67m/min입니다
        var walkkTime = distance / 67 | 0;
        var walkHour = '', walkMin = '';

        // 계산한 도보 시간이 60분 보다 크면 시간으로 표시합니다
        if (walkkTime > 60) {
            walkHour = '<span class="number">' + Math.floor(walkkTime / 60) + '</span>시간 '
        }
        walkMin = '<span class="number">' + walkkTime % 60 + '</span>분'

        // 자전거의 평균 시속은 16km/h 이고 이것을 기준으로 자전거의 분속은 267m/min입니다
        var bycicleTime = distance / 227 | 0;
        var bycicleHour = '', bycicleMin = '';

        // 계산한 자전거 시간이 60분 보다 크면 시간으로 표출합니다
        if (bycicleTime > 60) {
            bycicleHour = '<span class="number">' + Math.floor(bycicleTime / 60) + '</span>시간 '
        }
        bycicleMin = '<span class="number">' + bycicleTime % 60 + '</span>분'

        // 거리와 도보 시간, 자전거 시간을 가지고 HTML Content를 만들어 리턴합니다
        var content = '<ul class="dotOverlay distanceInfo">';
        content += '        <span >총거리</span><span class="number">' + distance + '</span>m';
        content += '        <span >도보</span>' + walkHour + walkMin;
        content += '        <span >자전거</span>' + bycicleHour + bycicleMin;
        content += '</ul>'

        return content;
    }
}

function setRuleClear() {
    kakao.maps.event.removeListener(map, 'click', clickHandlerRule);
    kakao.maps.event.removeListener(map, 'mousemove', mousemoveHandlerRule);
    kakao.maps.event.removeListener(map, 'rightclick', rightclickHandlerRule);       
}

function rule_poly()
{
    setRuleClear();

    // xxxxxx
    // 마우스 클릭 이벤트가 발생하고나면 drawingFlag가 그려지고 있는 상태인 ture 값으로 바뀝니다
    // 그려지고 있는 상태인 경우 drawingPolygon 으로 그려지고 있는 다각형을 지도에 표시합니다
    // 마우스 오른쪽 클릭 이벤트가 발생하면 drawingFlag가 그리기가 종료된 상태인 false 값으로 바뀌고
    // polygon 으로 다 그려진 다각형을 지도에 표시합니다
/*
var clickHandler = function(event) {    
    alert('click: ' + event.latLng.toString());   
}; 
 

*/

    // 지도에 마우스 클릭 이벤트를 등록합니다
    // 지도를 클릭하면 다각형 그리기가 시작됩니다 그려진 다각형이 있으면 지우고 다시 그립니다

    clickHandlerRule = function(mouseEvent) {    
        var clickPosition = mouseEvent.latLng; 
        
        // 지도 클릭이벤트가 발생했는데 다각형이 그려지고 있는 상태가 아니면
        if (!drawingFlagPoly) {

            // 상태를 true로, 다각형을 그리고 있는 상태로 변경합니다
            drawingFlagPoly = true;
            
            // 지도 위에 다각형이 표시되고 있다면 지도에서 제거합니다
            if (polygon) {  
                polygon.setMap(null);      
                polygon = null;  
            }
            
            // 지도 위에 면적정보 커스텀오버레이가 표시되고 있다면 지도에서 제거합니다
            if (areaOverlay) {
                areaOverlay.setMap(null);
                areaOverlay = null;
            }
        
            // 그려지고 있는 다각형을 표시할 다각형을 생성하고 지도에 표시합니다
            drawingPolygon = new kakao.maps.Polygon({
                map: map, // 다각형을 표시할 지도입니다
                path: [clickPosition], // 다각형을 구성하는 좌표 배열입니다 클릭한 위치를 넣어줍니다
                strokeWeight: 3, // 선의 두께입니다 
                strokeColor: '#00a0e9', // 선의 색깔입니다
                strokeOpacity: 1, // 선의 불투명도입니다 0에서 1 사이값이며 0에 가까울수록 투명합니다
                strokeStyle: 'solid', // 선의 스타일입니다
                fillColor: '#00a0e9', // 채우기 색깔입니다
                fillOpacity: 0.2 // 채우기 불투명도입니다
            }); 
            
            // 그리기가 종료됐을때 지도에 표시할 다각형을 생성합니다 
            polygon = new kakao.maps.Polygon({ 
                path: [clickPosition], // 다각형을 구성하는 좌표 배열입니다 클릭한 위치를 넣어줍니다 
                strokeWeight: 3, // 선의 두께입니다 
                strokeColor: '#00a0e9', // 선의 색깔입니다   
                strokeOpacity: 1, // 선의 불투명도입니다 0에서 1 사이값이며 0에 가까울수록 투명합니다
                strokeStyle: 'solid', // 선의 스타일입니다
                fillColor: '#00a0e9', // 채우기 색깔입니다
                fillOpacity: 0.2 // 채우기 불투명도입니다
            });

            
        } else { // 다각형이 그려지고 있는 상태이면 
            
            // 그려지고 있는 다각형의 좌표에 클릭위치를 추가합니다
            // 다각형의 좌표 배열을 얻어옵니다
            var drawingPath = drawingPolygon.getPath();
        
            // 좌표 배열에 클릭한 위치를 추가하고
            drawingPath.push(clickPosition);
            
            // 다시 다각형 좌표 배열을 설정합니다
            drawingPolygon.setPath(drawingPath);
            
        
            // 그리기가 종료됐을때 지도에 표시할 다각형의 좌표에 클릭 위치를 추가합니다
            // 다각형의 좌표 배열을 얻어옵니다
            var path = polygon.getPath();
        
            // 좌표 배열에 클릭한 위치를 추가하고
            path.push(clickPosition);
            
            // 다시 다각형 좌표 배열을 설정합니다
            polygon.setPath(path);
        }   
    }; 
    kakao.maps.event.addListener(map, 'click', clickHandlerRule);
 


    // 지도에 마우스무브 이벤트를 등록합니다
    // 다각형을 그리고있는 상태에서 마우스무브 이벤트가 발생하면 그려질 다각형의 위치를 동적으로 보여주도록 합니다
    kakao.maps.event.addListener(map, 'mousemove', function (mouseEvent) {

        // 지도 마우스무브 이벤트가 발생했는데 다각형을 그리고있는 상태이면
        if (drawingFlagPoly){

            // 마우스 커서의 현재 위치를 얻어옵니다 
            var mousePosition = mouseEvent.latLng; 
            
            // 그려지고있는 다각형의 좌표배열을 얻어옵니다
            var path = drawingPolygon.getPath();
            
            // 마우스무브로 추가된 마지막 좌표를 제거합니다
            if (path.length > 1) {
                path.pop();
            } 
            
            // 마우스의 커서 위치를 좌표 배열에 추가합니다
            path.push(mousePosition);

            // 그려지고 있는 다각형의 좌표를 다시 설정합니다
            drawingPolygon.setPath(path);
        }             
    });     

    // 지도에 마우스 오른쪽 클릭 이벤트를 등록합니다
    // 다각형을 그리고있는 상태에서 마우스 오른쪽 클릭 이벤트가 발생하면 그리기를 종료합니다

    rightclickHandlerRule = function(mouseEvent) {    
        // 지도 오른쪽 클릭 이벤트가 발생했는데 다각형을 그리고있는 상태이면
        if (drawingFlagPoly) {
            
            // 그려지고있는 다각형을  지도에서 제거합니다
            drawingPolygon.setMap(null);
            drawingPolygon = null;  
            
            // 클릭된 죄표로 그릴 다각형의 좌표배열을 얻어옵니다
            var path = polygon.getPath();
        
            // 다각형을 구성하는 좌표의 개수가 3개 이상이면 
            if (path.length > 2) {
                
                // 지도에 다각형을 표시합니다
                polygon.setMap(map); 

                var area = Math.round(polygon.getArea()), // 다각형의 총면적을 계산합니다
                    content = '<div class="info">총면적 <span class="number"> ' + area + '</span> m<sup>2</sup></div>'; // 커스텀오버레이에 추가될 내용입니다
                    
                // 면적정보를 지도에 표시합니다
                areaOverlay = new kakao.maps.CustomOverlay({
                    map: map, // 커스텀오버레이를 표시할 지도입니다 
                    content: content,  // 커스텀오버레이에 표시할 내용입니다
                    xAnchor: 0,
                    yAnchor: 0,
                    position: path[path.length-1]  // 커스텀오버레이를 표시할 위치입니다. 위치는 다각형의 마지막 좌표로 설정합니다
                });      

                
            } else { 
                
                // 다각형을 구성하는 좌표가 2개 이하이면 다각형을 지도에 표시하지 않습니다 
                polygon = null;  
            }
            
            // 상태를 false로, 그리지 않고 있는 상태로 변경합니다
            drawingFlagPoly = false;          
        }  

    }

    kakao.maps.event.addListener(map, 'rightclick', rightclickHandlerRule);
}



function RulerRemove(){
    if (clickLine) {
            clickLine.setMap(null);    
            clickLine = null;        
        }
        if (distanceOverlay) {
            distanceOverlay.setMap(null);
            distanceOverlay = null;
        }

    var i;

    for ( i = 0; i < dots.length; i++ ){
        if (dots[i].circle) { 
            dots[i].circle.setMap(null);
        }

        if (dots[i].distance) {
            dots[i].distance.setMap(null);
        }
    }

    dots = [];

    if (polygon) {  
    polygon.setMap(null);      
    polygon = null;  
    }
    if (areaOverlay) {
                    areaOverlay.setMap(null);
                    areaOverlay = null;
    }

    for (var i = 0; i < circles.length; i++) {
                    circles[i].circle.setMap(null);    
                    circles[i].polyline.setMap(null);
                    circles[i].overlay.setMap(null);
                }         
    circles = [];
}
