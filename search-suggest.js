<!-- ✅ 안정판 search-suggest.js -->

(function () {
  console.log("[search-suggest] loaded v2025-10-stable-original");
  const CSS = `
    .gx-suggest-root{position:absolute;top:8px;left:50%;transform:translateX(-50%);
      display:flex;flex-direction:column;align-items:stretch;width:min(520px,90vw);
      z-index:99999;font-family:inherit;}
    .gx-suggest-search{display:flex;gap:8px;align-items:center;}
    .gx-suggest-search input{flex:1;height:40px;padding:0 12px;border:1px solid #ccc;
      border-radius:10px;background:#fff;font-size:14px;outline:none;
      transition:border .2s,box-shadow .2s;}
    .gx-suggest-search input:focus{border-color:#4a90e2;box-shadow:0 0 0 2px rgba(74,144,226,.2);}
    .gx-suggest-box{position:absolute;top:48px;left:50%;transform:translateX(-50%);
      width:min(520px,90vw);background:#fff;border:1px solid #ccc;border-radius:10px;
      box-shadow:0 4px 12px rgba(0,0,0,.1);max-height:45vh;overflow-y:auto;z-index:99998;}
    .gx-suggest-item{padding:6px 12px;cursor:pointer;font-size:14px;transition:background .15s;}
    .gx-suggest-item:hover,.gx-suggest-item.active{background:#f0f4ff;}
    .gx-suggest-item .gx-badges{float:right;opacity:.6;font-size:12px;}
  `;
  const st=document.createElement("style");st.textContent=CSS;document.head.appendChild(st);

  window.initSuggestUI=function(opt={}){
    const parent=opt.parent||document.body,data=Array.isArray(opt.data)?opt.data:[],
      map=opt.map,getMarkers=opt.getMarkers||(()=>window.markers||[]),
      badges=opt.badges||[];
    const root=document.createElement("div");
    root.className="gx-suggest-root";
    root.innerHTML=`<div class="gx-suggest-search"><input type="text" placeholder="검색..." autocomplete="off"/></div><div class="gx-suggest-box" style="display:none;"></div>`;
    parent.appendChild(root);
    const input=root.querySelector("input"),box=root.querySelector(".gx-suggest-box");
    let current=[],selIndex=-1;
    const CHO=["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    const getCho=s=>{let r="";for(let c of s){const n=c.charCodeAt(0)-44032;if(n>=0&&n<=11171)r+=CHO[Math.floor(n/588)];else r+=c;}return r;};
    const normalize=s=>(s||"").toString().trim().replace(/\s+/g,"").toLowerCase();
    const filterData=q=>{
      const nq=normalize(q),nqCho=getCho(nq);
      return data.filter(it=>{
        const name=normalize(it.name||it.name1||it.searchName),nameCho=getCho(name);
        return name.includes(nq)||nameCho.includes(nqCho);
      });
    };
    function render(list){
      box.innerHTML="";
      list.forEach((it,i)=>{
        const d=document.createElement("div");
        d.className="gx-suggest-item";
        d.innerHTML=`<span>${it.name||it.name1||it.searchName}</span>`+(badges.length?`<span class="gx-badges">${badges.map(b=>it[b]||"").filter(Boolean).join(" ")}</span>`:"");
        d.addEventListener("click",()=>choose(i));box.appendChild(d);
      });
      box.style.display=list.length?"block":"none";
    }
    function choose(i){
      const it=current[i];if(!it)return;
      input.value=it.name||it.name1||it.searchName;box.style.display="none";
      if(map&&it.lat&&it.lng){
        const latlng=new kakao.maps.LatLng(it.lat,it.lng);map.setCenter(latlng);map.setLevel(3);
      }
      const markers=getMarkers();
      for(const m of markers){
        if(m.content===it.name||m.searchName===it.name||m.name===it.name){
          kakao.maps.event.trigger(m,"click");break;
        }
      }
    }
    input.addEventListener("input",()=>{
      const q=(input.value||"").trim();
      if(!q){box.style.display="none";return;}
      const list=filterData(q);current=list;render(list);
    });
    input.addEventListener("keydown",e=>{
      if(box.style.display==="none")return;
      if(e.key==="ArrowDown"){selIndex=(selIndex+1)%current.length;updateSel();e.preventDefault();}
      else if(e.key==="ArrowUp"){selIndex=(selIndex-1+current.length)%current.length;updateSel();e.preventDefault();}
      else if(e.key==="Enter"){if(selIndex>=0)choose(selIndex);e.preventDefault();}
    });
    function updateSel(){const items=box.querySelectorAll(".gx-suggest-item");items.forEach((it,i)=>it.classList.toggle("active",i===selIndex));}
    input.addEventListener("focus",()=>{if(current.length)box.style.display="block";});
    document.addEventListener("mousedown",e=>{if(!root.contains(e.target))box.style.display="none";});
    console.log("[search-suggest] ready");
  };
})();
