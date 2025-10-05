// search-suggest.js (v2025-10-stable-original)
// 입력창 + 제안창 — HTML 없이 자동 생성 + 초성, 하이픈 검색 정상작동 버전
(function () {
  console.log("[search-suggest] loaded v2025-10-stable-original");

  // ===== 스타일 =====
  const CSS = `
    .gx-suggest-root {
      position:absolute; top:8px; left:50%; transform:translateX(-50%);
      display:flex; flex-direction:column; align-items:stretch;
      width:min(520px,90vw); z-index:99999; font-family:inherit;
    }
    .gx-suggest-search {
      display:flex; gap:8px; align-items:center;
    }
    .gx-suggest-search input {
      flex:1; height:40px; padding:0 12px;
      border:1px solid #ccc; border-radius:10px;
      background:#fff; font-size:14px; outline:none;
      transition:border .2s, box-shadow .2s;
    }
    .gx-suggest-search input:focus {
      border-color:#4a90e2; box-shadow:0 0 0 2px rgba(74,144,226,.2);
    }
    .gx-suggest-box {
      position:absolute; top:48px; left:50%; transform:translateX(-50%);
      width:min(520px,90vw); background:#fff; border:1px solid #ccc;
      border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,.1);
      max-height:45vh; overflow-y:auto; z-index:99998;
    }
    .gx-suggest-item {
      padding:6px 12px; cursor:pointer;
      font-size:14px; transition:background .15s;
    }
    .gx-suggest-item:hover, .gx-suggest-item.active {
      background:#f0f4ff;
    }
    .gx-suggest-item .gx-badges { float:right; opacity:0.6; font-size:12px; }
  `;
  const st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);

  // ===== 초기화 함수 =====
  window.initSuggestUI = function (opt = {}) {
    const parent = opt.parent || document.body;
    const data = Array.isArray(opt.data) ? opt.data : [];
    const map = opt.map;
    const getMarkers = opt.getMarkers || (() => window.markers || []);
    const badges = opt.badges || [];

    const root = document.createElement("div");
    root.className = "gx-suggest-root";
    root.innerHTML = `
      <div class="gx-suggest-search">
        <input type="text" placeholder="검색..." autocomplete="off" />
      </div>
      <div class="gx-suggest-box" style="display:none;"></div>
    `;
    parent.appendChild(root);

    const input = root.querySelector("input");
    const box = root.querySelector(".gx-suggest-box");
    let current = [];
    let selIndex = -1;

    // ===== 초성 매칭 유틸 =====
    const CHO = [
      "ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"
    ];
    const getCho = (str) => {
      let res = "";
      for (let ch of str) {
        const code = ch.charCodeAt(0) - 44032;
        if (code >= 0 && code <= 11171)
          res += CHO[Math.floor(code / 588)];
        else res += ch;
      }
      return res;
    };

    const normalize = (s) =>
      (s || "").toString().trim().replace(/\s+/g, "").toLowerCase();

    const filterData = (q) => {
      const nq = normalize(q);
      const nqCho = getCho(nq);
      return data.filter((it) => {
        const name = normalize(it.name || it.name1 || it.searchName);
        const nameCho = getCho(name);
        return name.includes(nq) || nameCho.includes(nqCho);
      });
    };

    // ===== 렌더링 =====
    function render(list) {
      box.innerHTML = "";
      list.forEach((it, i) => {
        const div = document.createElement("div");
        div.className = "gx-suggest-item";
        div.innerHTML =
          `<span>${it.name || it.name1 || it.searchName}</span>` +
          (badges.length
            ? `<span class="gx-badges">${badges
                .map((b) => it[b] || "")
                .filter(Boolean)
                .join(" ")}</span>`
            : "");
        div.addEventListener("click", () => choose(i));
        box.appendChild(div);
      });
      box.style.display = list.length ? "block" : "none";
    }

    function choose(i) {
      const it = current[i];
      if (!it) return;
      input.value = it.name || it.name1 || it.searchName;
      box.style.display = "none";

      if (map && it.lat && it.lng) {
        const latlng = new kakao.maps.LatLng(it.lat, it.lng);
        map.setCenter(latlng);
        map.setLevel(3);
      }
      const markers = getMarkers();
      for (const m of markers) {
        if (
          m.content === it.name ||
          m.searchName === it.name ||
          m.name === it.name
        ) {
          kakao.maps.event.trigger(m, "click");
          break;
        }
      }
    }

    // ===== 입력 이벤트 (원본 버전 복구) =====
    input.addEventListener("input", () => {
      const q = (input.value || "").trim();
      if (!q) {
        box.style.display = "none";
        return;
      }
      const list = filterData(q);
      current = list;
      render(list);
    });

    // ===== 키보드 네비게이션 =====
    input.addEventListener("keydown", (e) => {
      if (box.style.display === "none") return;
      if (e.key === "ArrowDown") {
        selIndex = (selIndex + 1) % current.length;
        updateSel();
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        selIndex = (selIndex - 1 + current.length) % current.length;
        updateSel();
        e.preventDefault();
      } else if (e.key === "Enter") {
        if (selIndex >= 0) choose(selIndex);
        e.preventDefault();
      }
    });

    function updateSel() {
      const items = box.querySelectorAll(".gx-suggest-item");
      items.forEach((it, i) =>
        it.classList.toggle("active", i === selIndex)
      );
    }

    // focus 시 열기
    input.addEventListener("focus", () => {
      if (current.length) box.style.display = "block";
    });
    // 외부 클릭 시 닫기
    document.addEventListener("mousedown", (e) => {
      if (!root.contains(e.target)) box.style.display = "none";
    });

    console.log("[search-suggest] ready");
  };
})();
