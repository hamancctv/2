// content.js — v2025-10-09-FINAL-CONTEXT-FIX
// Service Worker 절전/Context 오류 완전 방어 + 자동 재시도 + CSP 완전 준수
const IS_TOP = (window === window.top);

(() => {
    const MAP_SEL = "#map";
    const RV_SEL  = "#roadview";
    const BTN_SELECTOR = "#btnCapture, [data-cap='capture']"; 

    const HIDE_SELECTORS = [
        ".toolbar", ".toolbar2", ".search-wrap", ".gx-suggest-search",
        ".suggest-box", ".distance-box", "#guide", "#btnCapture"
    ];

    let hiddenEls = [];
    let rvHidden  = [];
    let restoreFailSafe = null;

    /* ===== 유틸 ===== */
    const log = (...a)=>console.log("[cap-content]", ...a);

    function flash(msg) {
        try{
            const el = document.createElement("div");
            el.textContent = msg;
            el.style.cssText = "position:fixed;top:14px;left:50%;transform:translateX(-50%);"+
                "background:rgba(0,0,0,.88);color:#fff;padding:8px 12px;border-radius:8px;"+
                "font-size:13px;z-index:2147483647;pointer-events:none";
            document.body.appendChild(el);
            requestAnimationFrame(()=>{ el.style.transition="opacity .25s"; setTimeout(()=>{ el.style.opacity="0"; },1100); });
            setTimeout(()=>el.remove(),1500);
        }catch{}
    }
    const isVisible = el => el && getComputedStyle(el).display !== "none"
                            && getComputedStyle(el).visibility !== "hidden"
                            && el.offsetWidth > 0 && el.offsetHeight > 0;
    const area = el => {
        if (!isVisible(el)) return 0;
        const r = el.getBoundingClientRect();
        return Math.max(0, r.width * r.height);
    };
    function forceVisible(el){
        if(!el) return;
        el.style.setProperty("opacity","1","important");
        el.style.setProperty("visibility","visible","important");
        el.style.setProperty("pointer-events","auto","important");
    }

    /* ===== 컨테이너 선택 ===== */
    function pickActiveContainer(){
        const rv = document.querySelector(RV_SEL);
        const mp = document.querySelector(MAP_SEL);
        const aRV = area(rv), aMP = area(mp);
        if (aRV > 0 && aRV >= aMP) return { type:"rv", el:rv };
        if (aMP > 0) return { type:"map", el:mp };
        return { type:"none", el:null };
    }

    /* ===== 일반 UI 숨김 / 복원 ===== */
    function hideGeneralUI(){
        hiddenEls = [];
        const mapEl = document.querySelector(MAP_SEL);
        const rvEl  = document.querySelector(RV_SEL);

        const protects = (el)=>{
            if(!el) return false;
            if (el===mapEl || el===rvEl) return true;
            if (mapEl && el.contains(mapEl)) return true;
            if (rvEl  && el.contains(rvEl))  return true;
            return false;
        };

        HIDE_SELECTORS.forEach(sel=>{
            document.querySelectorAll(sel).forEach(el=>{
                if (!el || protects(el)) return;
                el.dataset.__prevOpacity = el.style.opacity || "";
                el.dataset.__prevPE      = el.style.pointerEvents || "";
                el.dataset.__prevVis     = el.style.visibility || "";
                el.style.opacity = "0";
                el.style.pointerEvents = "none";
                hiddenEls.push(el);
            });
        });

        forceVisible(mapEl);
        forceVisible(rvEl);
    }
    function restoreGeneralUI(){
        hiddenEls.forEach(el=>{
            el.style.opacity       = el.dataset.__prevOpacity || "";
            el.style.pointerEvents = el.dataset.__prevPE || "";
            el.style.visibility    = el.dataset.__prevVis || "";
            delete el.dataset.__prevOpacity;
            delete el.dataset.__prevPE;
            delete el.dataset.__prevVis;
        });
        hiddenEls = [];
    }

/* ===== 로드뷰 오버레이 제거 / 복원 (Strict 이름 유지 + 안전 렌더 유지형) ===== */
let rvHiddenEls = [];

function hideRoadviewOverlaysStrict() {
  rvHiddenEls = [];

  try {
    // ✅ 오빠 미니맵 숨김
    const miniMap = document.getElementById("mapWrapper");
    if (miniMap) {
      miniMap.dataset.__prevDisplay = miniMap.style.display || "";
      miniMap.style.display = "none";
      rvHiddenEls.push(miniMap);
      console.log("[cap-content] 숨김 처리됨: #mapWrapper (미니맵)");
    }

    // ✅ 동동이(웨지 포함), 리사이저 숨김
    document.querySelectorAll(".MapWalker, .rv-resizer").forEach(el => {
      el.dataset.__prevDisplay = el.style.display || "";
      el.style.display = "none";
      rvHiddenEls.push(el);
    });

    // ✅ 로드뷰 내부 기본 UI 일부만 최소화 (GPU 끄지 않도록)
    const rv = document.querySelector("#roadview");
    if (rv) {
      rv.querySelectorAll(".btn_zoom, .btn_compass, .toolbox_roadview").forEach(el => {
        el.dataset.__prevDisplay = el.style.display || "";
        el.style.display = "none";
        rvHiddenEls.push(el);
      });
      rv.style.opacity = "1";
      rv.style.visibility = "visible";
      rv.style.pointerEvents = "auto";
    }
  } catch (e) {
    console.warn("[cap-content] 로드뷰 숨김 중 오류:", e);
  }
}

function restoreRoadviewOverlaysStrict() {
  try {
    rvHiddenEls.forEach(el => {
      el.style.display = el.dataset.__prevDisplay || "";
      delete el.dataset.__prevDisplay;
    });
    rvHiddenEls = [];
    console.log("[cap-content] 로드뷰 UI 복원 완료");
  } catch (e) {
    console.warn("[cap-content] 로드뷰 복원 오류:", e);
  }
}




    /* ===== 안정화 대기 ===== */
function waitStable(){
    return new Promise(res=>{
        const pick = pickActiveContainer();
        if (window.kakao?.maps && window.map && kakao.maps.event?.addListener && pick.type==="map") {
            kakao.maps.event.addListener(window.map, 'tilesloaded', ()=> setTimeout(res, 200));
            setTimeout(res, 900); // ← 600 → 900 으로 늘림
        } else if (pick.type==="rv" && window.__rvInstance && kakao?.maps?.event?.addListener){
            kakao.maps.event.addListener(window.__rvInstance, 'init', ()=> setTimeout(res, 400));
            setTimeout(res, 1000); // ← 700 → 1000 으로 늘림
        } else {
            setTimeout(res, 500);
        }
    });
}


    /* ===== 크롭 rect / 파일명 메타데이터 ===== */
    function getActiveContainerRect() {
        const pick = pickActiveContainer();
        const el = pick.el;
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return null;
        return { left: r.left, top: r.top, width: r.width, height: r.height, type: pick.type };
    }
    function dateStr(){
        const d=new Date();
        return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
    }
    function probeMetaThenBuildName(fallbackType){
        return new Promise(resolve=>{
            const scriptUrl = chrome.runtime.getURL("injector.js");
            const s = document.createElement("script");
            s.src = scriptUrl;
            try{
                (document.head || document.documentElement).appendChild(s);
                s.remove();
            }catch(e){
                console.error("Failed to inject injector.js:", e);
                const prefix = (fallbackType==="rv" ? "roadview" : "map");
                resolve(`${prefix}(${dateStr()}) 좌표.png`);
                return;
            }
            let settled = false;
            function onMsg(ev){
                if (ev.source !== window) return;
                if (!ev.data || ev.data.type !== "CAP_META_READY") return;
                window.removeEventListener("message", onMsg);
                settled = true;
                const prefix = (ev.data.ok && ev.data.isRV) ? "roadview" : (fallbackType==="rv" ? "roadview" : "map");
                const suffix = (ev.data.ok && ev.data.name) ? ` ${ev.data.name}` : " 좌표";
                resolve(`${prefix}(${dateStr()})${suffix}.png`);
            }
            window.addEventListener("message", onMsg);
            setTimeout(()=>{
                if (settled) return;
                window.removeEventListener("message", onMsg);
                const prefix = (fallbackType==="rv" ? "roadview" : "map");
                resolve(`${prefix}(${dateStr()}) 좌표.png`);
            },700);
        });
    }

    /* ===== 메시지 핸들러 ===== */
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
 if (msg.type === "PREPARE_CAPTURE") {

    // 모든 프레임(= iframe 포함)에서 먼저 자기 UI를 숨긴다
    (async () => {
        try {
            hideGeneralUI();
            const pick = pickActiveContainer();
            if (pick.type === "rv") hideRoadviewOverlaysStrict();
            await waitStable();
        } catch (e) {
            // 개별 프레임의 숨김 실패는 조용히 무시 (top 프레임에서만 응답 반환)
            console.warn("[cap-content] frame prepare (non-fatal):", e);
        }
    })();

    // ⬇️ 오직 **상위 프레임**만 응답(sendResponse)과 크롭/파일명 계산을 수행
    if (IS_TOP) {
        (async () => {
            try {
                const dpr  = window.devicePixelRatio || 1;
                const rect = getActiveContainerRect();
                const filename = await probeMetaThenBuildName(rect?.type || "map");

                clearTimeout(restoreFailSafe);
                restoreFailSafe = setTimeout(restoreAll, 5000);

                sendResponse({
                    ok: true,
                    cropRect: rect && { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                    dpr,
                    filename
                });
            } catch (e) {
                console.error(e);
                sendResponse({ ok: false, error: String(e) });
            }
        })();
        return true; // ⬅️ 상위 프레임만 비동기 응답 약속
    }

    // 하위(iframe) 프레임은 응답 안 함 (top이 응답할 것)
    return false;
}


        if (msg.type === "CROP_IN_PAGE") {
            (async () => {
                try {
                    const { dataUrl, rect, dpr } = msg;
                    const scale = dpr || 1;
                    const sx = Math.max(0, Math.floor(rect.left*scale));
                    const sy = Math.max(0, Math.floor(rect.top*scale));
                    const sw = Math.max(1, Math.floor(rect.width*scale));
                    const sh = Math.max(1, Math.floor(rect.height*scale));

                    const img = new Image();
                    const loaded = new Promise((res, rej)=>{ img.onload=res; img.onerror=rej; });
                    img.src = dataUrl; await loaded;

                    const canvas = document.createElement("canvas");
                    canvas.width = sw; canvas.height = sh;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

                    sendResponse({ ok:true, dataUrl: canvas.toDataURL("image/png") });
                } catch (e) {
                    console.error("[CROP_IN_PAGE] error:", e);
                    sendResponse({ ok:false, error:String(e) });
                }
            })();
            return true;
        }

        if (msg.type === "RESTORE_UI") {
            restoreAll(); sendResponse({ ok:true });
        }

        if (msg.type === "CAPTURE_ERROR") {
            flash("캡처 실패: " + (msg.message || "권한/환경 문제"));
            restoreAll(); sendResponse({ ok:true });
        }
    });

    function restoreAll(){
        clearTimeout(restoreFailSafe);
        restoreRoadviewOverlaysStrict();
        restoreGeneralUI();
    }

    /* ===== 버튼 훅 강화 (Context 오류 방어 + 자동 재시도) ===== */
    function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

    function runCaptureFlow(e){
        e?.preventDefault?.();
        e?.stopPropagation?.();

        async function trySend(attempt = 0){
            try{
            // 🔸 수정 전
            // await chrome.runtime.sendMessage({ type: "RUN_CAPTURE_NOW" });

            // 🔸 수정 후 (응답 대기 안 함)
            chrome.runtime.sendMessage({ type: "RUN_CAPTURE_NOW" })
                .catch(error => { throw error; });                return true;
            }catch(error){
                const msg = String(error?.message || "");
                const swSleep = msg.includes("Extension context invalidated") || msg.includes("receiving end closed");

                if (swSleep && attempt < 3){
                    await sleep(220 + attempt*150);
                    return trySend(attempt + 1);
                }

                if (swSleep){
                    flash("확장 프로그램이 절전 상태입니다. 상단 툴바 아이콘(퍼즐 옆)을 눌러 활성화 후 다시 시도하세요.");
                    return false;
                }

                console.error("Failed to send message to service worker:", error);
                flash("캡처 시작 실패: " + msg);
                return false;
            }
        }
        void trySend(0);
    }

    function bindButton(btn){
        if (!btn || btn.dataset.__capBound === "1") return;
        if (!btn.getAttribute("type")) btn.setAttribute("type","button");
        btn.addEventListener("click", runCaptureFlow, { passive:false, capture:true });
        btn.dataset.__capBound = "1";
        log("button bound:", btn);
    }

    function bindInitial(){
        document.querySelectorAll(BTN_SELECTOR).forEach(bindButton);
    }

    const mo = new MutationObserver(muts=>{
        for (const m of muts){
            if (m.type === "childList"){
                m.addedNodes.forEach(node=>{
                    if (!(node instanceof HTMLElement)) return;
                    if (node.matches?.(BTN_SELECTOR)) bindButton(node);
                    node.querySelectorAll?.(BTN_SELECTOR).forEach(bindButton);
                });
            }
            if (m.type === "attributes" && m.target instanceof HTMLElement){
                if (m.target.matches(BTN_SELECTOR)) bindButton(m.target);
            }
        }
    });
    function startObserver(){
        mo.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:["id","class","data-cap"] });
    }

    function delegate(e){
        const path = e.composedPath ? e.composedPath() : [];
        const el = path.find(n => n instanceof HTMLElement && n.matches?.(BTN_SELECTOR));
        if (el) runCaptureFlow(e);
    }

    function init(){
        document.addEventListener("click", delegate, { capture:true });
        bindInitial();
        startObserver();
        log("ready (delegation + observer)");
    }

    if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", init, { once:true });
    } else {
        init();
    }
})();
