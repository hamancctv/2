// markers-handler.js
(function () {
  let zCounter = 100;
  let currentPolyline = null; 
  let groupPositions = {};    

  // === 거리 계산 ===
  function getDistance(latLng1, latLng2) {
      const R = 6371;
      const dLat = (latLng2.getLat() - latLng1.getLat()) * (Math.PI / 180);
      const dLon = (latLng2.getLng() - latLng1.getLng()) * (Math.PI / 180);
      const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(latLng1.getLat() * (Math.PI / 180)) * Math.cos(latLng2.getLat() * (Math.PI / 180)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
  }

  // === 가장 가까운 마커끼리 연결 ===
  function calculateNearestEdges(latLngs) {
      if (latLngs.length < 2) return [];
      const edges = [];

      for (let i = 0; i < latLngs.length; i++) {
          let minDist = Infinity;
          let nearestIndex = -1;

          for (let j = 0; j < latLngs.length; j++) {
              if (i === j) continue;
              const dist = getDistance(latLngs[i], latLngs[j]);
              if (dist < minDist) {
                  minDist = dist;
                  nearestIndex = j;
              }
          }

          if (nearestIndex !== -1) {
              edges.push({ from: latLngs[i], to: latLngs[nearestIndex] });
          }
      }
      return edges;
  }

  function removePolyline() {
      if (currentPolyline) {
          currentPolyline.setMap(null);
          currentPolyline = null;
      }
  }

  function drawPolylineForGroup(map, groupKey) {
      removePolyline();
      const latLngs = groupPositions[groupKey];
      if (latLngs && latLngs.length >= 2) {
          const nearestEdges = calculateNearestEdges(latLngs);
          let pathSegments = [];

          nearestEdges.forEach(edge => {
              pathSegments.push(edge.from, edge.to, null); 
          });

          currentPolyline = new kakao.maps.Polyline({
              map: map,
              path: pathSegments,
              strokeWeight: 4,
              strokeColor: '#FF0000',
              strokeOpacity: 0.9,
              strokeStyle: 'solid'
          });
      }
  }

  // === 마커 초기화 ===
  window.initMarkers = function (map, positions) {
      const markers = [];

      // 그룹 분류
      groupPositions = {};
      positions.forEach(p => {
          const groupKey = p.group ? String(p.group) : 'NO_GROUP';
          if (!groupPositions[groupKey]) {
              groupPositions[groupKey] = [];
          }
          groupPositions[groupKey].push(p.latlng);
      });

      // 마커 생성
      for (let i = 0; i < positions.length; i++) {
          const marker = new kakao.maps.Marker({
              map: map,
              position: positions[i].latlng,
              // ✅ 기본 마커 아이콘 강제
              image: new kakao.maps.MarkerImage(
                  "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png",
                  new kakao.maps.Size(24, 35),
                  { offset: new kakao.maps.Point(12, 35) }
              ),
              clickable: true,
              zIndex: zCounter++
          });
          marker.group = positions[i].group ? String(positions[i].group) : 'NO_GROUP';

          kakao.maps.event.addListener(marker, "click", function () {
              console.log("Marker clicked:", marker.getPosition().toString());
              drawPolylineForGroup(map, marker.group);
          });

          markers.push(marker);
      }

      window.markers = markers;
      console.log("Markers initialized:", markers);
  };
})();
