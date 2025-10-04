// drawGroupLinesMST.js — MST 그룹 연결선 토글 버튼 (거리재기 버튼 아래 자동 생성)
(function () {
  console.log("[drawGroupLinesMST] loaded v2025-10-FINAL");

  // --- 지도 존재 확인 ---
  const mapExists = () =>
    typeof window !== "undefined" &&
    window.map &&
    window.kakao &&
    kakao.maps &&
    typeof kakao.maps.Polyline === "function";

  // --- 버튼 스타일 ---
  if (!document.getElementById("btnMST-style")) {
    const st = document.createElement("style");
    st.id = "btnMST-style";
    st.textContent = `
      #btnMST {
        position: fixed;
        top: 200px;   /* 거리재기 버튼(156px) 바로 아래 */
        left: 10px;
        z-index: 350;
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
      #btnMST:hover { box-shadow: 0 3px 12px rgba(0,0,0,.12); }
      #btnMST svg { width: 26px; height: 26px; display: block; }
      #btnMST svg path { stroke: #555; stroke-width: 2.5; fill: none; transition: all .2s ease; }
      #btnMST.active { border-color: #db4040; background: #fff !important; }
      #btnMST.active svg path { stroke: #db4040; stroke-width: 3; }
    `;
    document.head.appendChild(st);
  }

  // --- 버튼 생성 ---
  let btn = document.getElementById("btnMST");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "btnMST";
    btn.title = "그룹 연결선 (MST)";
    btn.innerHTML = `
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <!-- 세 점을 연결한 트리형 아이콘 -->
        <path d="M10 26 L18 10 L26 26 M18 10 L18 26" />
      </svg>
    `;
    document.body.appendChild(btn);
  }

  // --- 전역 저장소 ---
  window.groupLines = window.groupLines || [];

  // --- 내부 함수: 그룹별 MST 선 그리기 ---
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
            strokeColor: "#0077FF",
            strokeOpacity: 0.9,
            strokeStyle: "solid",
          });
          window.groupLines.push(polyline);
          connected.push(minEdge.to);
        } else {
          break;
        }
      }
    });
  }

  // --- 토글 제어 ---
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
