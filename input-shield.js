// input-shield.js — 지도 위 투명 레이어로 마커/오버레이 입력 차단
(function () {
  const ID = "gx-input-shield";

  function ensure() {
    let el = document.getElementById(ID);
    if (!el) {
      el = document.createElement("div");
      el.id = ID;
      Object.assign(el.style, {
        position: "absolute",
        inset: "0",
        zIndex: "2147483647",
        background: "transparent",
        display: "none",
        cursor: "grab", // ✅ 기본은 grab
      });

      const host = document.getElementById("map");
      if (!host) {
        console.warn("[InputShield] #map element not found");
        return null;
      }
      host.style.position = host.style.position || "relative";
      host.appendChild(el);

      // === 마우스 이벤트 지도에 재전달 ===
      const mapEl = host;
      const forwardMouse = (type, src) => {
        const e = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: src.clientX,
          clientY: src.clientY,
          screenX: src.screenX,
          screenY: src.screenY,
          button: src.button,
          buttons: src.buttons,
          ctrlKey: src.ctrlKey,
          shiftKey: src.shiftKey,
          altKey: src.altKey,
          metaKey: src.metaKey,
        });
        mapEl.dispatchEvent(e);
      };

      ["mousedown", "mousemove", "mouseup", "click", "dblclick", "contextmenu"].forEach(t => {
        el.addEventListener(
          t,
          evt => {
            evt.stopPropagation();
            evt.preventDefault();
            forwardMouse(t, evt);
          },
          { passive: false }
        );
      });

      el.addEventListener(
        "wheel",
        evt => {
          evt.stopPropagation();
          evt.preventDefault();
          forwardMouse("wheel", evt);
        },
        { passive: false }
      );
    }
    return el;
  }

  window.InputShield = {
    enable: (mode) => {
      const el = ensure();
      if (!el) return;
      el.style.display = "block";
      el.dataset.mode = mode || "";
      el.style.cursor = mode === "measure" ? "crosshair" : "grab"; // ✅ 거리재기만 crosshair
      console.log("[InputShield] enabled:", mode || "(none)");
    },
    disable: () => {
      const el = ensure();
      if (!el) return;
      el.style.display = "none";
      el.dataset.mode = "";
      el.style.cursor = "grab"; // ✅ 기본 grab로 복귀
      console.log("[InputShield] disabled");
    },
  };
})();
