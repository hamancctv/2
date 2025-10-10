// input-shield.js — v2025-10-07 GRAB+FORWARD (공용 투명 입력 쉴드)
(function () {
  const ID = "gx-input-shield";
  let el = null;

  function ensure() {
    if (el) return el;
    const host = document.getElementById("map");
    if (!host) {
      console.warn("[InputShield] #map not found. Load this after #map exists.");
      return null;
    }
    host.style.position = host.style.position || "relative";

    el = document.createElement("div");
    el.id = ID;
    Object.assign(el.style, {
      position: "absolute",
      inset: "0",
      zIndex: "2147483647",     // 툴바는 fixed라 영향 없음
      background: "transparent",
      display: "none",
      pointerEvents: "none",
      cursor: "grab",            // 기본 grab (요청사항)
    });
    host.appendChild(el);

    // === 지도 컨테이너로 이벤트 재전달 ===
    const mapEl = host;
    const fwd = (type, src) => {
      const e = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: src.clientX, clientY: src.clientY,
        screenX: src.screenX, screenY: src.screenY,
        button: src.button, buttons: src.buttons,
        ctrlKey: src.ctrlKey, shiftKey: src.shiftKey,
        altKey: src.altKey, metaKey: src.metaKey
      });
      mapEl.dispatchEvent(e);
    };

    const types = ["mousedown","mousemove","mouseup","click","dblclick","contextmenu"];
    types.forEach(t => {
      el.addEventListener(t, evt => {
        evt.stopPropagation(); evt.preventDefault();
        fwd(t, evt);
      }, { passive:false });
    });

    el.addEventListener("wheel", evt => {
      evt.stopPropagation(); evt.preventDefault();
      fwd("wheel", evt);
    }, { passive:false });

    console.log("[InputShield] ready");
    return el;
  }

  window.InputShield = {
    enable(mode) {
      const s = ensure(); if (!s) return;
      s.style.display = "block";
      s.style.pointerEvents = "auto";
      s.style.cursor = (mode === "measure") ? "crosshair" : "grab"; // 거리재기만 crosshair
      s.dataset.mode = mode || "";
      console.log("[InputShield] enabled:", mode || "(none)");
    },
    disable() {
      const s = ensure(); if (!s) return;
      s.style.pointerEvents = "none";
      s.style.display = "none";
      s.style.cursor = "grab";
      s.dataset.mode = "";
      console.log("[InputShield] disabled");
    }
  };
})();
