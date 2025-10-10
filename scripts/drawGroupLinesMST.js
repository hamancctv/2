// drawGroupLinesMST.js
(function () {
    // 거리 계산 함수
    function getDistance(latlng1, latlng2) {
        var R = 6371e3;
        var lat1 = latlng1.getLat() * Math.PI / 180;
        var lat2 = latlng2.getLat() * Math.PI / 180;
        var dLat = (latlng2.getLat() - latlng1.getLat()) * Math.PI / 180;
        var dLng = (latlng2.getLng() - latlng1.getLng()) * Math.PI / 180;
        var a = Math.sin(dLat / 2) ** 2 +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLng / 2) ** 2;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // 전역 배열 (HTML에서도 접근할 수 있도록 window에 붙임)
    window.allLines = [];
    window.allOverlays = [];

    // 그룹 선 그리기 함수
    window.drawGroupLinesMST = function () {
        // 기존 라인/오버레이 제거 (토글 기능)
        if (allLines.length > 0 || allOverlays.length > 0) {
            allLines.forEach(l => l.setMap(null));
            allLines = [];
            allOverlays.forEach(o => o.setMap(null));
            allOverlays = [];
            return;
        }

        var groupMarkers = {};

        markers.forEach(m => {
            if (!m.group) return; // 그룹명이 없는 마커 무시

            if (/^[\d-]+$/.test(m.group)) {
                // 숫자+하이픈만 있는 그룹
                var key = m.group.replace(/-/g, '');
                if (!groupMarkers[key]) groupMarkers[key] = [];
                groupMarkers[key].push(m);
            } else {
                // 숫자+하이픈 외 문자 포함 → 오버레이용
                var key = 'overlay_' + Math.random();
                groupMarkers[key] = [m];
            }
        });

        for (var g in groupMarkers) {
            var group = groupMarkers[g];
            if (group.length === 0) continue;

            // 숫자 그룹 → MST 연결
            if (/^\d+$/.test(g) && group.length > 1) {
                var n = group.length,
                    selected = Array(n).fill(false),
                    dist = Array(n).fill(Infinity),
                    parent = Array(n).fill(-1);
                dist[0] = 0;

                for (var k = 0; k < n; k++) {
                    var u = -1;
                    for (var i = 0; i < n; i++) {
                        if (!selected[i] && (u == -1 || dist[i] < dist[u])) u = i;
                    }
                    selected[u] = true;
                    for (var v = 0; v < n; v++) {
                        if (!selected[v]) {
                            var d = getDistance(group[u].getPosition(), group[v].getPosition());
                            if (d < dist[v]) { dist[v] = d; parent[v] = u; }
                        }
                    }
                }

                for (var i = 1; i < n; i++) {
                    var path = [group[i].getPosition(), group[parent[i]].getPosition()];
                    var line = new kakao.maps.Polyline({
                        path: path,
                        strokeWeight: 5,
                        strokeColor: '#FF5C5C',
                        strokeOpacity: 0.5,
                        strokeStyle: 'solid',
                        zIndex: 999
                    });
                    line.setMap(map);
                    allLines.push(line);
                }
            } else if (!/^\d+$/.test(g)) {
                // 문자 포함 그룹 → 오버레이 표시
                var pos = group[0].getPosition();
                if (pos) {
                    var overlay = new kakao.maps.CustomOverlay({
                        position: pos,
                        content: `
                          <div style="
                            padding:4px 8px;
                            background:#fff;
                            border:1px solid #333;
                            border-radius:4px;
                            font-size:13px;
                            font-weight:bold;
                            white-space:nowrap;
                          ">
                            ${group[0].group}
                          </div>
                        `,
                        map: map
                    });
                    allOverlays.push(overlay);
                }
            }
        }
    };
})();
