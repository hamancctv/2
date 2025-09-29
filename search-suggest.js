<script>
// search-suggest.js (v2025-09-29e-FINAL-Cleaned)
(function () {
    console.log("[search-suggest] loaded v2025-09-29e-FINAL-Cleaned");

    // ===== 스타일 주입 (기존과 동일) =====
    const CSS = `
    .gx-suggest-search{
      position:absolute; top:8px; left:50%; transform:translateX(-50%);
      display:flex; gap:8px; align-items:center;
      width:min(520px,90vw); z-index:600;
    }
    .gx-suggest-search input{
      flex:1; height:40px; padding:0 12px; border:1px solid #ccc; border-radius:10px;
      background:#fff; font-size:14px; outline:none;
    }
    .gx-suggest-search button{ display:none; }
    .gx-suggest-box{
      position:absolute; top:48px; left:50%; transform:translateX(-50%) translateY(-6px);
      width:min(520px,90vw);
      max-height:40vh; overflow-y:auto;
      border:1px solid #ccc; border-radius:10px;
      background:rgba(255,255,255,0.96);
      box-shadow:0 8px 20px rgba(0,0,0,.15);
      z-index:610;
      opacity:0; pointer-events:none; transition:opacity .18s ease, transform .18s ease;
      display:block;
    }
    .gx-suggest-box.open{ opacity:1; transform:translateX(-50%) translateY(0); pointer-events:auto; }
    .gx-suggest-item{ padding:10px 12px; cursor:pointer; display:flex; align-items:center; gap:8px; }
    .gx-suggest-item:hover, .gx-suggest-item.active{ background:#eef3ff; }
    .gx-suggest-title{ display:inline-block; max-width:60%; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-weight:600; }
    .gx-badge{ font-size:12px; color:#555; background:#f2f4f8; padding:2px 6px; border-radius:6px; }
    .gx-suggest-empty{ color:#777; padding:12px; }
    `;
    const styleEl = document.createElement('style'); styleEl.textContent = CSS; document.head.appendChild(styleEl);

    // ===== 한글 초성 유틸 (기존과 동일) =====
    const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    const CHO_SET = new Set(CHO);
    const normalize = s => (s||"").toUpperCase().replace(/\s+/g,"");
    function buildKey(str){
      let out=""; for (const ch of (str||"")){
        const c = ch.charCodeAt(0);
        if (c>=0xAC00 && c<=0xD7A3) out += CHO[Math.floor((c-0xAC00)/588)];
        else if (CHO_SET.has(ch)) out += ch;
        else if (c>=48&&c<=57) out += ch;
        else if (c>=65&&c<=90) out += ch;
        else if (c>=97&&c<=122) out += ch.toUpperCase();
      }
      return out;
    }
    const esc = s => (s||"").replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

    // 💥 ===== 순수 시설명 추출 함수 (로직 강화) =====
    function extractKorean(str) {
        if (!str) return "";
        let s = String(str).trim();

        // 1. 괄호, 숫자, 영문, 기호 등 한글과 공백 외 모든 문자를 공백으로 치환합니다.
        s = s.replace(/[^가-힣\s]/g, ' ').replace(/\s+/g, ' ').trim();

        // 2. 남은 한글 단어들을 추출합니다.
        const m = s.match(/[가-힣]+/g);
        if (!m) return "";

        let longest = "";
        // 3. 추출된 단어들 중 가장 긴 단어(순수 시설명으로 간주)를 찾습니다.
        for (const word of m) {
            if (word.length > longest.length) {
                longest = word;
            }
        }

        // 4. 가장 긴 단어(시설명)를 반환하거나, 단어가 여러 개인 경우 그냥 합쳐서 반환합니다.
        return longest || m.join(" ");
    }
    // 💥 함수 전역 노출 (markers-handler가 사용하도록)
    window.extractKorean = extractKorean;


    // ===== 메인 초기화 (기존과 동일) =====
    function initSuggestUI(opts){
      const {
        map,
        data = window.SEL_SUGGEST || [],
        parent = document.getElementById('mapWrapper') || document.body,
        getMarkers = () => window.markers || [],
        badges = ['line','encloser','ip'],
        maxItems = 30,
        chooseOnEnter = true,
        openOnFocus = true
      } = opts || {};
      if (!map) { console.error('initSuggestUI: map 필요'); }

      const wrap = document.createElement('div');
      wrap.className = 'gx-suggest-search';
      wrap.innerHTML = `
        <input type="search" class="gx-input" placeholder="예) ㅎㅇㄱㅂㄱㅅ, ㄷ032, 시설명…" autocomplete="off" /> 
        <button type="button" class="gx-btn">검색</button>
      `;
      const box = document.createElement('div'); box.className = 'gx-suggest-box';
      parent.appendChild(wrap); parent.appendChild(box);

      const kw = wrap.querySelector('.gx-input');
      const RAW = (data||[]).filter(it => it && (it.name||it.addr||it.ip)).map((it,idx)=>({
        id: it.id || `s_${idx}`,
        name: it.name || "",
        line: it.line || "",
        encloser: it.encloser || "",
        addr: it.addr || "",
        lat: it.lat, lng: it.lng,
        ip: it.ip || ""
      }));
      RAW.forEach(it=>{
        it.key = buildKey([it.name, it.line, it.encloser, it.ip].filter(Boolean).join(" "));
        it.nameLen = (it.name||"").length;
      });
      const IDMAP = Object.fromEntries(RAW.map(it => [it.id, it]));

      function match(q){
        const k = buildKey(q); if (!k) return [];
        const res=[];
        for (const it of RAW){
          if (it.key.indexOf(k)!==-1) res.push(it);
          if (res.length>=2000) break;
        }
        res.sort((a,b)=>{
          const ai=a.key.indexOf(k), bi=b.key.indexOf(k);
          if (ai!==bi) return ai-bi;
          if (a.nameLen!==b.nameLen) return a.nameLen-b.nameLen;
          return a.id.localeCompare(b.id);
        });
        return res.slice(0, maxItems);
      }
      function render(items){
        if (!items.length){ box.innerHTML = `<div class="gx-suggest-empty">검색 결과 없음</div>`; return; }
        box.innerHTML = items.map(it=>{
          const title = esc(it.name);
          const badgeHtml = badges.map(b=>{
            const v = it[b]; return v ? `<span class="gx-badge">${esc(String(v))}</span>` : '';
          }).join('');
          return `<div class="gx-suggest-item" data-id="${it.id}">
            <span class="gx-suggest-title">${title}</span>${badgeHtml}
          </div>`;
        }).join('');
      }
      const openBox = ()=> box.classList.add('open');
      const closeBox= ()=> { box.classList.remove('open'); setActive(-1); };

      let active=-1, rafId=null;
      function setActive(i){
        const items = box.querySelectorAll('.gx-suggest-item');
        items.forEach((el,idx)=> el.classList.toggle('active', idx===i));
        active=i;
        if (i>=0 && items[i]) items[i].scrollIntoView({block:'nearest'});
      }
      function schedule(q){
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(()=>{
          rafId=null;
          const items = match(q);
          if (items.length){ render(items); openBox(); setActive(-1); }
          else closeBox();
        });
      }
      
      // 💥 applySelection 함수 수정: 추출 로직 적용
      function applySelection(item){
        if (!item) return;
        kw.value = extractKorean(item.name); // 💥 수정된 extractKorean 함수 사용

        const markers = getMarkers()||[];
        const found = markers.find(m=>{
          const p=m.getPosition?.(); if (!p) return false;
          return Math.abs(p.getLat()-item.lat)<1e-9 && Math.abs(p.getLng()-item.lng)<1e-9;
        });
        if (found && window.kakao && window.kakao.maps){
          // 마커를 찾으면 마커의 mousedown/mouseup 이벤트를 직접 트리거하여 마커 클릭과 동일한 효과를 냅니다.
          kakao.maps.event.trigger(found,"mousedown");
          setTimeout(()=>kakao.maps.event.trigger(found,"mouseup"),0);
          map.panTo(found.getPosition());
        } else if (Number.isFinite(item.lat)&&Number.isFinite(item.lng)){
          map.panTo(new kakao.maps.LatLng(item.lat,item.lng));
        }
        closeBox();
      }

      kw.addEventListener('compositionupdate', ()=>{ const v=kw.value.trim(); if(!v){closeBox();return;} schedule(v); });
      kw.addEventListener('input', ()=>{ const v=kw.value.trim(); if(!v){closeBox();return;} schedule(v); });
      kw.addEventListener('keydown', e=>{
        const visible = box.classList.contains('open');
        if (visible){
          const items = box.querySelectorAll('.gx-suggest-item');
          if (e.key==='ArrowDown'){ e.preventDefault(); setActive(active<items.length-1?active+1:0); }
          else if (e.key==='ArrowUp'){ e.preventDefault(); setActive(active>0?active-1:items.length-1); }
          else if (e.key==='Enter'){ e.preventDefault(); const list=match(kw.value); if(list.length){ applySelection(active>=0? list[active] : list[0]); } else closeBox(); }
          else if (e.key==='Escape'){ closeBox(); }
        } else if (e.key==='Enter'){
          e.preventDefault(); const list=match(kw.value); if(list.length) applySelection(list[0]);
        }
      });

      box.addEventListener('mousedown', e=>{
        const el = e.target.closest('.gx-suggest-item'); if(!el) return;
        applySelection(IDMAP[el.dataset.id]); e.preventDefault();
      });

      if (openOnFocus){
        kw.addEventListener('focus', ()=>{
          const v = kw.value.trim();
          if (v) schedule(v);
        });
      }
      document.addEventListener('click', (e)=>{
        const within = e.target.closest('.gx-suggest-search') || e.target.closest('.gx-suggest-box');
        if (!within) closeBox();
      });

      // 공개 API (기존과 동일)
      return {
        destroy(){
          document.removeEventListener('click', closeBox);
          wrap.remove(); box.remove();
        },
        focus(){ kw.focus(); },
        setData(newData){
          RAW.length = 0;
          (newData||[]).forEach((it, idx)=>{
            const row = {
              id: it.id || `s_${idx}`,
              name: it.name || "",
              line: it.line || "",
              encloser: it.encloser || "",
              addr: it.addr || "",
              lat: it.lat, lng: it.lng,
              ip: it.ip || ""
            };
            row.key = buildKey([row.name, row.line, row.encloser, row.ip].filter(Boolean).join(" "));
            row.nameLen = (row.name||"").length;
            RAW.push(row);
          });
          Object.keys(IDMAP).forEach(k=>delete IDMAP[k]);
          RAW.forEach(it => IDMAP[it.id] = it);
        }
      };
    }

    window.initSuggestUI = initSuggestUI;
})();
</script>
