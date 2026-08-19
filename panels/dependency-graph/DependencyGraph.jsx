/*
    DependencyGraph.jsx - Self-contained AE Dependency Graph Viewer
    Scans entire project, generates HTML graph, opens in browser.
    No external files needed.
*/
(function(thisObj) {

    // ===== JSON serializer =====
    function toJ(v) {
        if (v === null || v === undefined) return "null";
        if (typeof v === "number" || typeof v === "boolean") return String(v);
        if (typeof v === "string") {
            return '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
                          .replace(/\n/g, "\\n").replace(/\r/g, "")
                          .replace(/\t/g, "\\t") + '"';
        }
        if (v instanceof Array) {
            var a = [];
            for (var i = 0; i < v.length; i++) a.push(toJ(v[i]));
            return "[" + a.join(",") + "]";
        }
        if (typeof v === "object") {
            var a = [];
            for (var k in v) {
                if (v.hasOwnProperty(k)) a.push('"' + k + '":' + toJ(v[k]));
            }
            return "{" + a.join(",") + "}";
        }
        return "null";
    }

    function typeOf(item) {
        if (item instanceof CompItem) return "comp";
        if (item instanceof FootageItem) {
            if (item.mainSource instanceof SolidSource) return "solid";
            if (item.mainSource instanceof PlaceholderSource) return "place";
            return "ftg";
        }
        return "ftg";
    }

    // ===== Scanner with progress =====
    function scanProject(onProgress) {
        var nodes = [], edges = [], idMap = {}, compItems = [];
        var total = app.project.numItems;

        for (var i = 1; i <= total; i++) {
            var item = app.project.item(i);
            if (item instanceof FolderItem) continue;
            var idx = nodes.length;
            idMap[item.id] = idx;
            nodes.push({ id: item.id, name: item.name, type: typeOf(item) });
            if (item instanceof CompItem) compItems.push(item);
            if (i % 20 === 0 || i === total)
                onProgress(i, total + compItems.length, "Collecting: " + item.name);
        }

        for (var c = 0; c < compItems.length; c++) {
            var ci = compItems[c];
            var srcIdx = idMap[ci.id];
            if (srcIdx === undefined) continue;
            var seen = {};
            for (var j = 1; j <= ci.numLayers; j++) {
                try {
                    var src = ci.layer(j).source;
                    if (!src || seen[src.id]) continue;
                    seen[src.id] = true;
                    var tgtIdx = idMap[src.id];
                    if (tgtIdx !== undefined) edges.push({ s: srcIdx, t: tgtIdx });
                } catch (e) {}
            }
            if (c % 10 === 0 || c === compItems.length - 1)
                onProgress(total + c + 1, total + compItems.length, "Scanning: " + ci.name);
        }

        var selIds = [];
        var sel = app.project.selection;
        if (sel) {
            for (var i = 0; i < sel.length; i++) {
                if (!(sel[i] instanceof FolderItem) && idMap[sel[i].id] !== undefined)
                    selIds.push(idMap[sel[i].id]);
            }
        }
        if (selIds.length === 0 && app.project.activeItem instanceof CompItem) {
            var ai = idMap[app.project.activeItem.id];
            if (ai !== undefined) selIds.push(ai);
        }

        return { nodes: nodes, edges: edges, selected: selIds };
    }

    // ===== HTML builder (fully embedded) =====
    function buildHTML(data) {
        var j = toJ(data);
        var H = [];

        // --- Head ---
        H.push("<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'>");
        H.push("<title>AE Dependency Graph</title><style>");

        // --- CSS ---
        H.push("*{margin:0;padding:0;box-sizing:border-box}");
        H.push("html,body{width:100%;height:100%;overflow:hidden}");
        H.push("body{background:#131316;color:#bbb;font-family:'Segoe UI',system-ui,-apple-system,sans-serif}");
        H.push("#header{position:fixed;top:0;left:0;right:0;height:46px;background:rgba(19,19,22,.92);backdrop-filter:blur(16px);display:flex;align-items:center;padding:0 18px;gap:14px;z-index:10;border-bottom:1px solid rgba(255,255,255,.05)}");
        H.push(".logo{font-size:11px;font-weight:700;color:#555;letter-spacing:1.2px;text-transform:uppercase;white-space:nowrap}");
        H.push("#search{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:6px 12px;color:#ccc;font-size:13px;width:200px;outline:none;transition:border-color .2s}");
        H.push("#search:focus{border-color:rgba(100,150,240,.45)}#search::placeholder{color:#555}");
        H.push(".legend{display:flex;gap:14px;font-size:11px;color:#666}.legend span{display:flex;align-items:center;gap:5px}");
        H.push(".dot{width:9px;height:9px;border-radius:50%;display:inline-block}");
        H.push("#stats{font-size:11px;color:#444;margin-left:auto;white-space:nowrap}");
        H.push("#cv{display:block;cursor:grab}#cv:active{cursor:grabbing}");
        H.push("#tip{position:fixed;display:none;background:rgba(22,22,26,.96);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 14px;font-size:12px;line-height:1.6;pointer-events:none;z-index:20;max-width:320px;backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(0,0,0,.5)}");
        H.push("#tip b{color:#eee;font-size:13px}#tip .detail{color:#777;font-size:11px;margin-top:2px}");
        H.push("</style></head><body>");

        // --- Body ---
        H.push("<div id='header'><div class='logo'>Dependency Graph</div>");
        H.push("<input id='search' type='text' placeholder='Search items...' spellcheck='false'>");
        H.push("<div class='legend'>");
        H.push("<span><span class='dot' style='background:#4a8ae6'></span>Comp</span>");
        H.push("<span><span class='dot' style='background:#50b050'></span>Footage</span>");
        H.push("<span><span class='dot' style='background:#888'></span>Solid</span>");
        H.push("<span><span class='dot' style='background:#c88040'></span>Placeholder</span>");
        H.push("</div><div id='stats'></div></div>");
        H.push("<canvas id='cv'></canvas><div id='tip'></div>");

        // --- Script ---
        H.push("<script>");
        H.push("(function(){");
        H.push("'use strict';");

        // Setup
        H.push("var cv=document.getElementById('cv'),ctx=cv.getContext('2d');");
        H.push("var tipEl=document.getElementById('tip'),searchEl=document.getElementById('search'),statsEl=document.getElementById('stats');");
        H.push("var TC={comp:'#4a8ae6',ftg:'#50b050',solid:'#888',place:'#c88040'},BG='#131316';");
        H.push("var D=" + j + ";");

        // Data init
        H.push("var nodes=[],edges=[],adj=[];");
        H.push("function initData(){nodes=[];edges=[];");
        H.push("for(var i=0;i<D.nodes.length;i++){var n=D.nodes[i];");
        H.push("nodes.push({idx:i,id:n.id,name:n.name,type:n.type,");
        H.push("x:(Math.random()-.5)*Math.min(600,D.nodes.length*3),");
        H.push("y:(Math.random()-.5)*Math.min(600,D.nodes.length*3),");
        H.push("vx:0,vy:0,r:14,conns:0,pinned:false,isSel:D.selected.indexOf(i)>=0});}");
        H.push("for(var i=0;i<D.edges.length;i++)edges.push({s:D.edges[i].s,t:D.edges[i].t});");
        H.push("adj=[];for(var i=0;i<nodes.length;i++)adj[i]=[];");
        H.push("for(var i=0;i<edges.length;i++){adj[edges[i].s].push(edges[i].t);adj[edges[i].t].push(edges[i].s);nodes[edges[i].s].conns++;nodes[edges[i].t].conns++;}");
        H.push("for(var i=0;i<nodes.length;i++)nodes[i].r=Math.min(12+nodes[i].conns*1.8,38);");
        H.push("statsEl.textContent=nodes.length+' items \\u00B7 '+edges.length+' connections';}");
        H.push("initData();");

        // State
        H.push("var tx=0,ty=0,sc=1,hoverIdx=-1,selIdx=-1,dragIdx=-1,panActive=false;");
        H.push("var mx0=0,my0=0,tx0=0,ty0=0,alpha=1,alphaDecay=.997,alphaMin=.002,searchQ='',W=0,HH=0;");

        // Resize
        H.push("function resize(){W=window.innerWidth;HH=window.innerHeight;");
        H.push("cv.width=W*devicePixelRatio;cv.height=HH*devicePixelRatio;");
        H.push("cv.style.width=W+'px';cv.style.height=HH+'px';");
        H.push("ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);}");
        H.push("resize();window.addEventListener('resize',resize);");

        // Simulation
        H.push("function simulate(){var N=nodes.length;if(N===0)return;");
        H.push("var repK=Math.max(800,4000*Math.min(1,80/N)),attK=.004,gravK=.025;");
        H.push("for(var i=0;i<N;i++){var ni=nodes[i];for(var j=i+1;j<N;j++){var nj=nodes[j];");
        H.push("var dx=nj.x-ni.x,dy=nj.y-ni.y,d2=dx*dx+dy*dy+1,f=repK*alpha/d2,d=Math.sqrt(d2);");
        H.push("var fx=f*dx/d,fy=f*dy/d;ni.vx-=fx;ni.vy-=fy;nj.vx+=fx;nj.vy+=fy;}}");
        H.push("for(var i=0;i<edges.length;i++){var e=edges[i],s=nodes[e.s],t=nodes[e.t];");
        H.push("var dx=t.x-s.x,dy=t.y-s.y,d=Math.sqrt(dx*dx+dy*dy)+1,f=attK*d*alpha;");
        H.push("var fx=f*dx/d,fy=f*dy/d;s.vx+=fx;s.vy+=fy;t.vx-=fx;t.vy-=fy;}");
        H.push("for(var i=0;i<N;i++){var n=nodes[i];n.vx-=n.x*gravK*alpha;n.vy-=n.y*gravK*alpha;}");
        H.push("var damp=.82;for(var i=0;i<N;i++){var n=nodes[i];if(n.pinned||i===dragIdx)continue;");
        H.push("n.vx*=damp;n.vy*=damp;n.x+=n.vx;n.y+=n.vy;}}");

        // Lighten helper
        H.push("function lighten(hex,p){var r=parseInt(hex.substr(1,2),16),g=parseInt(hex.substr(3,2),16),b=parseInt(hex.substr(5,2),16);");
        H.push("return 'rgb('+Math.min(255,r+p)+','+Math.min(255,g+p)+','+Math.min(255,b+p)+')';}");

        // Render
        H.push("function render(){ctx.fillStyle=BG;ctx.fillRect(0,0,W,HH);");
        H.push("ctx.save();ctx.translate(W/2+tx,HH/2+ty);ctx.scale(sc,sc);");
        H.push("var q=searchQ,connSet=null;");
        H.push("if(selIdx>=0){connSet={};connSet[selIdx]=true;var a=adj[selIdx];for(var i=0;i<a.length;i++)connSet[a[i]]=true;}");

        // Edges
        H.push("for(var i=0;i<edges.length;i++){var e=edges[i],s=nodes[e.s],t=nodes[e.t];");
        H.push("var hi=selIdx>=0&&(e.s===selIdx||e.t===selIdx),dim=selIdx>=0&&!hi;");
        H.push("var dx=t.x-s.x,dy=t.y-s.y,nx=-dy*.08,ny=dx*.08;");
        H.push("ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.quadraticCurveTo((s.x+t.x)/2+nx,(s.y+t.y)/2+ny,t.x,t.y);");
        H.push("ctx.strokeStyle=hi?'rgba(245,210,60,.55)':dim?'rgba(60,60,70,.1)':'rgba(90,90,100,.2)';");
        H.push("ctx.lineWidth=hi?2:.8;ctx.stroke();");
        H.push("if(!dim||hi){var dd=Math.sqrt(dx*dx+dy*dy)||1,ux=dx/dd,uy=dy/dd;");
        H.push("var ax=t.x-ux*t.r,ay=t.y-uy*t.r,as=Math.min(7,4+t.r*.15);");
        H.push("ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax-ux*as+uy*as*.45,ay-uy*as-ux*as*.45);");
        H.push("ctx.lineTo(ax-ux*as-uy*as*.45,ay-uy*as+ux*as*.45);ctx.closePath();");
        H.push("ctx.fillStyle=hi?'rgba(245,210,60,.5)':'rgba(90,90,100,.25)';ctx.fill();}}");

        // Nodes
        H.push("for(var i=0;i<nodes.length;i++){var n=nodes[i],col=TC[n.type]||TC.ftg;");
        H.push("var isH=i===hoverIdx,isS=i===selIdx,isI=n.isSel,isDim=connSet&&!connSet[i];");
        H.push("var isM=q&&n.name.toLowerCase().indexOf(q)>=0;");
        // Glow
        H.push("if(isH||isS){var gg=ctx.createRadialGradient(n.x,n.y,n.r*.3,n.x,n.y,n.r+14);");
        H.push("gg.addColorStop(0,col+'40');gg.addColorStop(1,col+'00');");
        H.push("ctx.beginPath();ctx.arc(n.x,n.y,n.r+14,0,Math.PI*2);ctx.fillStyle=gg;ctx.fill();}");
        // Circle
        H.push("ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);");
        H.push("if(isDim){ctx.fillStyle='#2a2a2e';ctx.globalAlpha=.35;}");
        H.push("else{var cg=ctx.createRadialGradient(n.x-n.r*.3,n.y-n.r*.3,0,n.x,n.y,n.r*1.2);");
        H.push("cg.addColorStop(0,lighten(col,30));cg.addColorStop(1,col);ctx.fillStyle=cg;ctx.globalAlpha=1;}");
        H.push("ctx.fill();ctx.globalAlpha=1;");
        // Rings
        H.push("if(isM&&!isDim){ctx.beginPath();ctx.arc(n.x,n.y,n.r+3,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();}");
        H.push("if(isI){ctx.beginPath();ctx.arc(n.x,n.y,n.r+2.5,0,Math.PI*2);ctx.strokeStyle='#f0b820';ctx.lineWidth=2.5;ctx.stroke();}");
        H.push("if(isS){ctx.beginPath();ctx.arc(n.x,n.y,n.r+3,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();}");
        // Label
        H.push("if(sc>.25&&!isDim){var fs=Math.max(9,Math.min(12,11/Math.max(sc,.5)));");
        H.push("ctx.font=fs+'px Segoe UI,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='top';");
        H.push("ctx.fillStyle='rgba(210,210,215,.85)';");
        H.push("var lbl=n.name.length>28?n.name.substr(0,27)+'\\u2026':n.name;");
        H.push("ctx.fillText(lbl,n.x,n.y+n.r+5);}}");
        // Watermark
        H.push("ctx.restore();ctx.fillStyle='#222';ctx.font='10px sans-serif';ctx.textAlign='right';");
        H.push("ctx.fillText('drag:pan  wheel:zoom  click:select  F:fit',W-12,HH-10);}");

        // Main loop
        H.push("function tick(){if(alpha>alphaMin){simulate();alpha*=alphaDecay;}render();requestAnimationFrame(tick);}");

        // Coords + hit test
        H.push("function s2w(sx,sy){return{x:(sx-W/2-tx)/sc,y:(sy-HH/2-ty)/sc};}");
        H.push("function hitTest(wx,wy){for(var i=nodes.length-1;i>=0;i--){var dx=wx-nodes[i].x,dy=wy-nodes[i].y;if(dx*dx+dy*dy<=nodes[i].r*nodes[i].r)return i;}return-1;}");

        // Mouse
        H.push("var didDrag=false;");
        H.push("cv.addEventListener('mousedown',function(e){var w=s2w(e.clientX,e.clientY);var idx=hitTest(w.x,w.y);didDrag=false;");
        H.push("if(idx>=0){dragIdx=idx;mx0=w.x-nodes[idx].x;my0=w.y-nodes[idx].y;cv.style.cursor='grabbing';}");
        H.push("else{panActive=true;mx0=e.clientX;my0=e.clientY;tx0=tx;ty0=ty;}});");

        H.push("cv.addEventListener('mousemove',function(e){");
        H.push("if(dragIdx>=0){didDrag=true;var w=s2w(e.clientX,e.clientY);nodes[dragIdx].x=w.x-mx0;nodes[dragIdx].y=w.y-my0;nodes[dragIdx].vx=0;nodes[dragIdx].vy=0;alpha=Math.max(alpha,.08);}");
        H.push("else if(panActive){didDrag=true;tx=tx0+(e.clientX-mx0);ty=ty0+(e.clientY-my0);}");
        H.push("else{var w=s2w(e.clientX,e.clientY);var idx=hitTest(w.x,w.y);");
        H.push("if(idx!==hoverIdx){hoverIdx=idx;cv.style.cursor=idx>=0?'pointer':'grab';}");
        H.push("if(idx>=0)showTip(e.clientX,e.clientY,nodes[idx]);else tipEl.style.display='none';}});");

        H.push("cv.addEventListener('mouseup',function(e){");
        H.push("if(dragIdx>=0&&!didDrag)selIdx=selIdx===dragIdx?-1:dragIdx;");
        H.push("if(panActive&&!didDrag)selIdx=-1;");
        H.push("dragIdx=-1;panActive=false;cv.style.cursor=hoverIdx>=0?'pointer':'grab';});");

        H.push("cv.addEventListener('wheel',function(e){e.preventDefault();");
        H.push("var f=e.deltaY<0?1.12:1/1.12,px=e.clientX-W/2,py=e.clientY-HH/2;");
        H.push("tx=px-(px-tx)*f;ty=py-(py-ty)*f;sc=Math.max(.03,Math.min(sc*f,12));},{passive:false});");

        H.push("cv.addEventListener('dblclick',function(e){var w=s2w(e.clientX,e.clientY);var idx=hitTest(w.x,w.y);if(idx>=0)nodes[idx].pinned=!nodes[idx].pinned;});");

        // Tooltip
        H.push("function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}");
        H.push("function showTip(sx,sy,n){var deps=0,usedBy=0;");
        H.push("for(var i=0;i<edges.length;i++){if(edges[i].s===n.idx)deps++;if(edges[i].t===n.idx)usedBy++;}");
        H.push("var tl={comp:'Composition',ftg:'Footage',solid:'Solid',place:'Placeholder'};");
        H.push("tipEl.innerHTML='<b>'+esc(n.name)+'</b><div class=\"detail\">'+(tl[n.type]||n.type)+' \\u00B7 uses '+deps+' \\u00B7 used by '+usedBy+(n.pinned?' \\u00B7 pinned':'')+'</div>';");
        H.push("tipEl.style.display='block';var tw=tipEl.offsetWidth,th=tipEl.offsetHeight;");
        H.push("var left=Math.min(sx+14,W-tw-8),top=sy-th-8;if(top<50)top=sy+18;");
        H.push("tipEl.style.left=left+'px';tipEl.style.top=top+'px';}");

        // Search + keys
        H.push("searchEl.addEventListener('input',function(){searchQ=this.value.toLowerCase();});");
        H.push("document.addEventListener('keydown',function(e){");
        H.push("if(e.key==='/'&&document.activeElement!==searchEl){e.preventDefault();searchEl.focus();}");
        H.push("if(e.key==='Escape'){searchEl.value='';searchQ='';searchEl.blur();selIdx=-1;}");
        H.push("if((e.key==='f'||e.key==='F')&&document.activeElement!==searchEl)fitView();});");

        // Fit
        H.push("function fitView(){if(nodes.length===0)return;");
        H.push("var minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;");
        H.push("for(var i=0;i<nodes.length;i++){var n=nodes[i];if(n.x-n.r<minX)minX=n.x-n.r;if(n.x+n.r>maxX)maxX=n.x+n.r;if(n.y-n.r<minY)minY=n.y-n.r;if(n.y+n.r>maxY)maxY=n.y+n.r;}");
        H.push("var gw=maxX-minX+80,gh=maxY-minY+80,cw=W-40,ch=HH-80;");
        H.push("sc=Math.min(cw/gw,ch/gh,2);sc=Math.max(sc,.05);");
        H.push("tx=-(minX+maxX)/2*sc;ty=-(minY+maxY)/2*sc;}");
        H.push("setTimeout(fitView,1500);setTimeout(fitView,4000);");

        // Start
        H.push("tick();");
        H.push("})();");
        H.push("<" + "/script></body></html>");

        return H.join("\n");
    }

    // ===== UI =====
    function buildUI(obj) {
        var win = (obj instanceof Panel) ? obj
            : new Window("palette", "Dep Graph", undefined, { resizeable: false });
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.margins = [8, 8, 8, 8];
        win.spacing = 4;

        var btn = win.add("button", undefined, "Scan Project & Open Graph");
        btn.preferredSize = [280, 28];
        var info = win.add("statictext", undefined, "Click to scan and open in browser");
        info.alignment = ["fill", "center"];

        btn.onClick = function() {
            btn.enabled = false;

            // Separate progress window (more reliable than updating panel controls)
            var pw = new Window("palette", "Scanning...", undefined, { closeButton: false });
            pw.orientation = "column";
            pw.alignChildren = ["fill", "top"];
            pw.margins = [16, 12, 16, 12];
            pw.spacing = 6;
            var plbl = pw.add("statictext", undefined, "Preparing...");
            plbl.preferredSize = [340, 20];
            var pbar = pw.add("progressbar", undefined, 0, 100);
            pbar.preferredSize = [340, 8];
            pw.layout.layout(true);
            pw.center();
            pw.show();
            pw.update();

            try {
                // 1. Scan
                var data = scanProject(function(cur, tot, label) {
                    pbar.value = Math.round(cur / tot * 100);
                    plbl.text = pbar.value + "%  " + label;
                    pw.update();
                });

                // 2. Build HTML
                plbl.text = "Generating graph HTML...";
                pbar.value = 100;
                pw.update();

                var html = buildHTML(data);

                // 3. Write file
                plbl.text = "Writing file...";
                pw.update();

                var out = new File(Folder.temp.fsName + "/ae_depgraph.html");
                if (!out.open("w")) {
                    throw new Error("Cannot write to " + out.fsName + "\nEnable: Preferences > Scripting > Allow Scripts to Write Files");
                }
                out.encoding = "UTF-8";
                out.write(html);
                out.close();

                // 4. Open
                pw.close();
                out.execute();

                info.text = data.nodes.length + " items / " + data.edges.length + " connections";

            } catch (e) {
                try { pw.close(); } catch (ex) {}
                alert("Dependency Graph Error:\n\n" + e.message + (e.line ? "\nLine: " + e.line : ""));
                info.text = "Error (see alert)";
            }
            btn.enabled = true;
        };

        if (!(obj instanceof Panel)) win.preferredSize = [300, 60];
        win.layout.layout(true);
        return win;
    }

    var ui = buildUI(thisObj);
    if (ui instanceof Window) { ui.center(); ui.show(); }
})(this);
