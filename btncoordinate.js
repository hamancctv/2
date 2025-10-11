// btnCoordinate.js — v2025-10-FINAL-ZTOP (D1 SAVE+LOAD + Z-ORDER FIX)
console.log("[btnCoordinate] loaded");

const API_BASE = "https://emoji-save-api-v2.tmxkwkd.workers.dev";

(function () {
  const btn = document.getElementById("btncoordinate");
  if (!btn) return console.warn("[btnCoordinate] #btncoordinate not found");

  /* =========================
      1️⃣ CSS (1회 주입)
  ========================= */
  const STYLE_ID = "pickmode-mapcursor-css";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #mapWrapper.__pickmode-cursor #map,
      #mapWrapper.__pickmode-cursor #map > div,
      #mapWrapper.__pickmode-cursor #map .mMap,
      #mapWrapper.__pickmode-cursor #map .mMap * {
        cursor: default !important;
      }

      .emoji-marker {
        position:absolute;
        transform:translate(-50%, -100%);
        font-size:30px;
        line-height:1;
        user-select:none;
        pointer-events:auto;
      }

      .emoji-marker .emoji-close {
        position:absolute;
        top:-10px; right:-1px;
        background:#fff;
        border:1px solid #999;
        border-radius:50%;
        width:15px; height:15px;
        display:flex; align-items:center; justify-content:center;
        font-size:10px;
        box-shadow:0 1px 3px rgba(0,0,0,0.25);
        user-select:none;
        opacity:0;
        transition:opacity .15s ease;
        cursor:pointer !important;
      }

      .emoji-marker.hover-enabled:hover .emoji-close { opacity:1; }

      .flash-msg {
        position:fixed;
        top:14px; left:50%;
        transform:translateX(-50%);
        background:rgba(0,0,0,.85);
        color:#fff;
        padding:8px 14px;
        border-radius:8px;
        font-size:13px;
        z-index:9999;
        pointer-events:none;
        transition:opacity .25s ease;
      }
    `;
    document.head.appendChild(style);
  }

  /* =========================
      2️⃣ Flash 유틸
  ========================= */
  function flash(msg) {
    const old = document.querySelector(".flash-msg");
    if (old) old.remove();
    const el = document.createElement("div");
    el.className = "flash-msg";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => (el.style.opacity = "0"), 1000);
    setTimeout(() => el.remove(), 1300);
  }

  /* =========================
      3️⃣ Kakao Map 준비 대기
  ========================= */
  function waitForMap(fn) {
    if (window.kakao?.maps?.Map && window.map instanceof kakao.maps.Map) return fn();
    setTimeout(() => waitForMap(fn), 120);
  }

  /* =========================
      4️⃣ DB 불러오기
  ========================= */
  async function loadSavedEmojis() {
    try {
      const res = await fetch(`${API_BASE}/api/load`);
      const list = await res.json();
      console.log(`[btnCoordinate] 불러온 이모지 ${list.length}개`);
      for (const row of list) {
        const latlng = new kakao.maps.LatLng(row.lat, row.lng);
        createEmojiMarker(latlng, row.icon || "📍", false);
      }
    } catch (err) {
      console.error("[btnCoordinate] 불러오기 실패:", err);
    }
  }

  /* =========================
      5️⃣ 이모지 생성 함수
  ========================= */
  async function createEmojiMarker(latlng, icon = "📍", saveToDB = true) {
    const div = document.createElement("div");
    div.className = "emoji-marker";
    div.textContent = icon;

    const close = document.createElement("div");
    close.className = "emoji-close";
    close.textContent = "✕";
    div.appendChild(close);

    const overlay = new kakao.maps.CustomOverlay({
      position: latlng,
      content: div,
      yAnchor: 1,
      clickable: true,
    });

    overlay.setZIndex(9999); // ✅ 항상 마커 위

    setTimeout(() => overlay.setMap(window.map), 50);

    // ✕ 클릭 시 지도에서만 제거
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      overlay.setMap(null);
    });

    // hover 활성화 (처음엔 ✕ 숨김)
    let hoverActivated = false;
    div.addEventListener("mouseleave", () => {
      if (!hoverActivated) {
        div.classList.add("hover-enabled");
        hoverActivated = true;
      }
    });

    // 📋 좌표 복사
    const coordText = `${latlng.getLat().toFixed(6)}, ${latlng.getLng().toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(coordText);
      flash("좌표 복사됨 📋");
    } catch {
      flash("복사 실패 ❌");
    }

    // 💾 D1 DB 저장
    if (saveToDB) {
      try {
        await fetch(`${API_BASE}/api/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: latlng.getLat(),
            lng: latlng.getLng(),
            icon,
          }),
        });
        console.log("[btnCoordinate] 좌표 저장 완료:", coordText);
      } catch (e) {
        console.error("[btnCoordinate] 저장 실패:", e);
      }
    }
  }

  /* =========================
      6️⃣ pick 모드 토글
  ========================= */
  waitForMap(() => {
    let pickMode = false;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      pickMode = !pickMode;
      btn.classList.toggle("active", pickMode);

      const mapWrapper = document.getElementById("mapWrapper");
      if (!mapWrapper) return;

      if (pickMode) {
        mapWrapper.classList.add("__pickmode-cursor", "__pickmode-active");
        if (typeof setAllMarkersClickable === "function") setAllMarkersClickable(false);
        window.isCoordinateMode = true;
        window.isMarkerInteractionEnabled = false;

        if (window.isDistanceMode) window.DistanceModule?.toggleDistance(false);
        if (window.overlayOn) {
          window.overlayOn = false;
          document.body.classList.remove("view_roadview");
        }

        // ✅ pickMode 중엔 완전 전면으로
        document.querySelectorAll(".emoji-marker").forEach((el) => {
          el.parentElement.style.zIndex = 10000;
        });
      } else {
        mapWrapper.classList.remove("__pickmode-cursor", "__pickmode-active");
        if (typeof setAllMarkersClickable === "function") setAllMarkersClickable(true);
        window.isCoordinateMode = false;
        window.isMarkerInteractionEnabled = true;

        // ✅ 일반 모드 복귀 시 기본 zIndex로
        document.querySelectorAll(".emoji-marker").forEach((el) => {
          el.parentElement.style.zIndex = 9999;
        });
      }
    });

    /* 지도 클릭 시 이모지 생성 */
    kakao.maps.event.addListener(window.map, "click", (mouseEvent) => {
      if (!pickMode) return;
      createEmojiMarker(mouseEvent.latLng, "📍", true);
    });

    /* ✅ 페이지 로드시 DB 불러오기 */
    loadSavedEmojis();
  });
})();
