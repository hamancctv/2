// markers-handler.js
(function () {
  // === 기본 스타일 정의 ===
  const style = document.createElement("style");
  style.textContent = `
    .overlay-hover {
      padding:2px 6px;
      background:rgba(255,255,255,0.70);
      border:1px solid #ccc;
      border-radius:5px;
      font-size:14px;
      white-space: nowrap;
      user-select: none;
      transition: transform 0.15s ease, border 0.15s ease;
    }
    .overlay-click {
      padding:5px 8px;
      background:rgba(255,255,255,0.70);
      border:1px solid #666;
      border-radius:5px;
      font-size:14px;
      white-space: nowrap;
      user-select: none;
      transition: transform 0.15s ease, border 0.15s ease;
    }
  `;
  document.head.appendChild(style);

  // === 전역 상태 ===
  let zCounter = 100;
  let selectedMarker = null;
  let selectedOverlay = null;
  let clickStartTime = 0;
  let currentPolyline = null; 
  let groupPositions = {};    

  // === 유틸리티 함수 (MST 구현을 위해 유지) ===

  /**
   * 두 좌표(LatLng) 사이의 거리를 km 단위로 계산합니다. (Haversine 공식)
   */
(function () {
  // === 전역 상태 ===
  let zCounter = 100;
  let selectedMarker = null;
  let selectedOverlay = null;
  let clickStartTime = 0;
  let currentPolyline = null; 
  let groupPositions = {};    

  // === 유틸 함수 ===
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

  function drawPolylineForGroup(groupKey) {
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
      const overlays = [];

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
              map,
              position: positions[i].latlng,
              clickable: true,
              zIndex: zCounter + 1,
          });
          marker.group = positions[i].group ? String(positions[i].group) : 'NO_GROUP';

          // 클릭 시 연결
          kakao.maps.event.addListener(marker, "click", function () {
              drawPolylineForGroup(marker.group);
          });

          markers.push(marker);
      }

      window.markers = markers;
  };
})();

