// drawGroupLinesMSTButton.js — MST 토글 버튼 (거리재기 아래)
(function () {
  console.log("[drawGroupLinesMSTButton] loaded v2025-10-FINAL");

  const mapExists = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function";

  // --- 버튼 스타일 ---
  if (!document.getElementById("btnGroupMST-style")) {
    const st = document.createElement("style");
    st.id = "btnGroupMST-style";
    st.textContent = `
      #btnGroupMST {
        position: fixed;
        top: 200px;   /* 거리재기(156px) 아래 */
        left: 10px;
        z-index: 350; /* 제안창보다 낮게 */
        width: 40px; height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #ccc;
        border-radius: 8px;
        background: #fff;
        cursor: pointer;
        transition: all .2s ease;
        box-sizing: border-box;
      }
      #btnGroupMST:hover { box-shadow: 0 3px 12px rgba(0,0,0,.12); }
      #btnGroupMST svg { width: 26px; height: 26px; display: block; }
      #btnGroupMST svg path { stroke: #555; stroke-width: 2.4; fill: none; transition: all .2s ease; }
      #btnGroupMST.active { border-color: #db4040; background: #fff !important; }
      #btnGroupMST.active svg path { stroke: #db4040; stroke-width: 3; }
    `;
    document.head.appendChild(st);
  }

  // --- 버튼 생성 ---
  let btn = document.getElementById("btnGroupMST");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "btnGroupMST";
    btn.title = "그룹 최소거리 연결";
    btn.innerHTML = `
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <!-- 세 점이 연결된 MST 형태 -->
        <path d="M8 26 L18 10 L28 26 L18 10 L18 26" />
      </svg>
    `;
    document.body.appendChild(btn);
  }

  // --- 전역 저장소 ---
  window.groupLines = window.groupLines || [];

  // --- MST 연결 함수 ---
  function drawGroupLinesMST() {
    const map = window.map;
    if (!mapExists() || !map) {
      console.error("지도(map)가 정의되지 않았습니다.");
      return;
    }

    // 🔹 이미 선이 있으면 모두 제거 (토글 Off)
    if (window.groupLines.length > 0) {
      window.groupLines.forEach(line => line.setMap(null));
      window.groupLines = [];
      return;
    }

    if (!window.markers || window.markers.length === 0) return;
    const markers = window.markers;

    // === 그룹별 마커 묶기 ===
    const groups = {};
    markers.forEach(m => {
      if (!m.group) return;
      const key = m.group.replace(/[-\s]/g, "");
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    // === 그룹별 MST (Prim 알고리즘) ===
    Object.values(groups).forEach(group => {
      if (group.length < 2) return;

      const connected = [group[0]];

      while (connected.length < group.length) {
        let minEdge = null;

        connected.forEach(cm => {
          group.forEach(tm => {
            if (connected.includes(tm)) return;
            const dist = cm.getPosition().distance(tm.getPosition());
            if (!minEdge || dist < minEdge.dist) {
              minEdge = { from: cm, to: tm, dist };
            }
          });
        });

        if (minEdge) {
          const polyline = new kakao.maps.Polyline({
            map,
            path: [minEdge.from.getPosition(), minEdge.to.getPosition()],
            strokeWeight: 4,
            strokeColor: "#db4040",
            strokeOpacity: 0.9,
            strokeStyle: "solid"
          });
          window.groupLines.push(polyline);
          connected.push(minEdge.to);
        } else break;
      }
    });
  }

  // --- 토글 ---
  btn.addEventListener("click", () => {
    if (!mapExists()) return;

    const active = btn.classList.toggle("active");

    if (active) {
      drawGroupLinesMST();
    } else {
      if (window.groupLines.length > 0) {
        window.groupLines.forEach(line => line.setMap(null));
        window.groupLines = [];
      }
    }
  });
})();
