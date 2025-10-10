// injector.js - CSP 안전하게 Kakao API 접근
(async function(){
    try{
        const isRV = (() => {
            if (document.body.classList.contains('view_roadview')) return true;
            const rv = document.getElementById('roadview');
            return !!(window.__rvInstance && rv && rv.offsetParent !== null);
        })();

        const centerLike = isRV 
            ? (window.__rvInstance?.getPosition?.())
            : (window.map?.getCenter?.());

        const lat = centerLike?.getLat?.() ?? null;
        const lng = centerLike?.getLng?.() ?? null;
        let name = "";

        if (lat != null && lng != null && window.kakao?.maps?.services?.Geocoder) {
            const g = new kakao.maps.services.Geocoder();
            await new Promise(res => {
                g.coord2Address(lng, lat, (r, st) => {
                    if (st === kakao.maps.services.Status.OK && r[0]?.address) {
                        const a = r[0].address;
                        name = a.region_3depth_name || a.region_2depth_name || "";
                    }
                    res();
                });
            });
        }

        // 결과를 content script로 postMessage
        window.postMessage({ type: "CAP_META_READY", isRV, name, ok: true }, "*");

    } catch (e) {
        window.postMessage({ type: "CAP_META_READY", ok: false }, "*");
    }
})();
