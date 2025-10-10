// 주소와 장소 검색 결과를 모두 처리하는 공통 함수
function handleSearchResult(data, status, searchType) {
    if (status === kakao.maps.services.Status.OK) {
        var coords;
        
        // 검색 유형에 따라 좌표를 가져옵니다.
        if (searchType === 'address') {
            coords = new kakao.maps.LatLng(data[0].y, data[0].x);
        } else if (searchType === 'keyword') {
            coords = new kakao.maps.LatLng(data[0].y, data[0].x);
        }

        // 6. 마커와 새로운 원(CustomOverlay)을 생성하고 지도에 표시합니다.
        var marker = new kakao.maps.Marker({
            map: map,
            image: markerImage1,
            position: coords
        });

        // ✅ (수정) CustomOverlay를 사용해 더 깔끔한 원 효과를 만듭니다.
        var pulseOverlay = new kakao.maps.CustomOverlay({
            map: map,
            position: coords,
            content: '<div class="marker-pulse"></div>',
            yAnchor: 0.5,
            xAnchor: 0.5 // yAnchor와 xAnchor를 0.5로 설정해 마커의 중심과 원의 중심을 일치시킵니다.
        });

        // 1초 후에 원 효과를 지도에서 제거합니다.
        setTimeout(function() {
            pulseOverlay.setMap(null);
        }, 1000);

        // 7. 지도 레벨과 중심을 조정합니다.
        map.setLevel(1);
        map.setCenter(coords);

        // 8. 마커를 배열에 추가합니다.
        markers.push(marker);

    } else {
        console.log("검색 결과가 없습니다.");
    }
}
