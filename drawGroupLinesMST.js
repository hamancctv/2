// drawGroupLinesMST.js
(function() {
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 +
              Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function buildMSTPaths(markers) {
    if (!markers || markers.length < 2) return [];
    const edges = [];
    for (let i=0;i<markers.length;i++) {
      const p1 = markers[i].getPosition();
      for (let j=i+1;j<markers.length;j++) {
        const p2 = markers[j].getPosition();
        const dist = haversine(p1.getLat(), p1.getLng(), p2.getLat(), p2.getLng());
        edges.push({i, j, dist});
      }
    }
    edges.sort((a,b)=>a.dist-b.dist);

    const parent = Array(markers.length).fill(0).map((_,i)=>i);
    const find = x => parent[x]===x ? x : parent[x]=find(parent[x]);
    const union = (a,b) => parent[find(a)] = find(b);

    const paths = [];
    for (const e of edges) {
      if (find(e.i) !== find(e.j)) {
        union(e.i, e.j);
        paths.push([markers[e.i].getPosition(), markers[e.j].getPosition()]);
      }
    }
    return paths;
  }

  let polyByGroup = {};
  window.drawGroupLinesMST = function() {
    if (!window.markers || window.markers.length === 0) {
      console.warn("markers가 없습니다.");
      return;
    }
    const map = window.markers[0].getMap();
    if (!map) return;

    if (Object.keys(polyByGroup).length) {
      Object.values(polyByGroup).forEach(arr => arr.forEach(pl=>pl.setMap(null)));
      polyByGroup = {};
      return;
    }

    const groups = {};
    window.markers.forEach(m=>{
      const g = m.group || "__ALL__";
      (groups[g] ||= []).push(m);
    });

    Object.entries(groups).forEach(([g, list])=>{
      if (list.length < 2) return;
      const paths = buildMSTPaths(list);
      const pls = paths.map(path => new kakao.maps.Polyline({
        path,
        strokeWeight: 3,
        strokeColor: "#db4040",
        strokeOpacity: 0.9,
        strokeStyle: "solid",
        map
      }));
      polyByGroup[g] = pls;
    });
  };
})();
