/*
    Comp Bookmarks - After Effects ScriptUI Panel
    Reads actual AE label colors from prefs file on disk (custom colors supported).

    Install:
      Copy to [AE]/Support Files/Scripts/ScriptUI Panels/
      Restart AE  ->  Window > Comp Bookmarks
*/
(function(thisObj) {

    var NAME = "Comp Bookmarks";
    var SEC  = "CompBookmarks_v2";
    var SZ   = 14;

    var FALLBACK = [
        [136,136,136],[178,36,36],[226,196,58],[163,219,219],
        [216,145,181],[163,142,214],[224,178,122],[122,201,163],
        [89,130,201],[137,196,89],[155,89,165],[234,150,58],
        [137,99,63],[216,73,150],[81,188,201],[196,168,122],[71,122,71]
    ];
    var LABEL_NAMES = [
        "None","Red","Yellow","Aqua","Pink","Lavender","Peach","SeaFoam",
        "Blue","Green","Purple","Orange","Brown","Fuchsia","Cyan","Sand","DkGreen"
    ];

    // =====================================================
    //  Label color reading — multi-strategy
    // =====================================================
    var colorSource = "fallback";

    function readAELabelColors() {
        var c;
        c = tryModernAPI();     if (c) { colorSource = "API";   return c; }
        c = tryPrefsFile();     if (c) { colorSource = "prefs file"; return c; }
        c = tryPrefsAPI();      if (c) { colorSource = "prefs API";  return c; }
        colorSource = "fallback";
        return null;
    }

    // --- Strategy 1: AE 24.0+ getLabelColor API ---
    function tryModernAPI() {
        try {
            if (app.project && typeof app.project.getLabelColor === "function") {
                var out = [];
                for (var i = 0; i <= 16; i++) {
                    var c = app.project.getLabelColor(i);
                    out.push([Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255)]);
                }
                return out;
            }
        } catch (e) {}
        return null;
    }

    // --- Strategy 2: Read prefs .txt file from disk ---
    function tryPrefsFile() {
        try {
            var dir = findPrefsDir();
            if (!dir) return null;
            var files = dir.getFiles("*.txt");
            for (var fi = 0; fi < files.length; fi++) {
                if (!(files[fi] instanceof File)) continue;
                var result = parseLabelColorsFromFile(files[fi]);
                if (result) return result;
            }
        } catch (e) {}
        return null;
    }

    function findPrefsDir() {
        var bases = [];
        try { var ad = $.getenv("APPDATA"); if (ad) bases.push(ad + "/Adobe/After Effects"); } catch(e) {}
        try { bases.push(Folder.userData.fsName + "/Adobe/After Effects"); } catch(e) {}
        try { bases.push("~/Library/Preferences/Adobe/After Effects"); } catch(e) {}

        var majorVer = app.version.split(".")[0];

        for (var bi = 0; bi < bases.length; bi++) {
            var base = new Folder(bases[bi]);
            if (!base.exists) continue;
            var subs = base.getFiles(function(f) { return f instanceof Folder; });
            for (var si = 0; si < subs.length; si++) {
                if (subs[si].name.indexOf(majorVer) === 0) return subs[si];
            }
            if (subs.length > 0) {
                subs.sort(function(a, b) { return a.name > b.name ? -1 : 1; });
                return subs[0];
            }
        }
        return null;
    }

    function parseLabelColorsFromFile(file) {
        try {
            file.open("r");
            file.encoding = "UTF-8";
            var text = file.read();
            file.close();
        } catch (e) { return null; }

        var map = {};
        var patterns = [
            /"[^"]*Label[^"]*?(\d+)\s+(Red|Green|Blue)\s*"\s*=\s*"?([0-9.eE+\-]+)"?/g,
            /"[^"]*[Ll]abel[^"]*?(\d+)\s*[_\-]?\s*(red|green|blue|r|g|b)\s*"\s*[:=]\s*"?([0-9.eE+\-]+)"?/gi
        ];

        for (var pi = 0; pi < patterns.length; pi++) {
            var rx = patterns[pi];
            var m;
            while ((m = rx.exec(text)) !== null) {
                var idx = parseInt(m[1], 10);
                if (idx < 1 || idx > 16) continue;
                var ch  = m[2].charAt(0).toLowerCase();
                var val = parseFloat(m[3]);
                if (isNaN(val)) continue;
                if (!map[idx]) map[idx] = {};
                if (ch === "r") map[idx].r = val;
                else if (ch === "g") map[idx].g = val;
                else if (ch === "b") map[idx].b = val;
            }
            if (countComplete(map) >= 16) break;
        }

        if (countComplete(map) < 16) return null;
        return buildColorArray(map);
    }

    function countComplete(map) {
        var n = 0;
        for (var k in map) {
            if (map.hasOwnProperty(k)) {
                var c = map[k];
                if (c.r !== undefined && c.g !== undefined && c.b !== undefined) n++;
            }
        }
        return n;
    }

    function normalizeVal(v) {
        if (v > 255)  return Math.round(v / 257);
        if (v <= 1.0 && v >= 0) return Math.round(v * 255);
        return Math.round(v);
    }

    function buildColorArray(map) {
        var out = [[136, 136, 136]];
        var isFloat = false;
        var isHigh  = false;
        for (var i = 1; i <= 16; i++) {
            var c = map[i];
            if (c.r <= 1 && c.g <= 1 && c.b <= 1) isFloat = true;
            if (c.r > 255 || c.g > 255 || c.b > 255) isHigh = true;
        }
        for (var i = 1; i <= 16; i++) {
            var c = map[i];
            var r, g, b;
            if (isHigh) {
                r = Math.round(c.r / 257); g = Math.round(c.g / 257); b = Math.round(c.b / 257);
            } else if (isFloat) {
                r = Math.round(c.r * 255); g = Math.round(c.g * 255); b = Math.round(c.b * 255);
            } else {
                r = Math.round(c.r); g = Math.round(c.g); b = Math.round(c.b);
            }
            out.push([clamp(r), clamp(g), clamp(b)]);
        }
        var allZero = true;
        for (var i = 1; i < out.length; i++) {
            if (out[i][0] || out[i][1] || out[i][2]) { allZero = false; break; }
        }
        return allZero ? null : out;
    }

    function clamp(v) { return Math.max(0, Math.min(255, v)); }

    // --- Strategy 3: app.preferences API (auto-discover key format) ---
    function tryPrefsAPI() {
        var secs = [
            "Label Preference Color Section 5",
            "Label Preference Color Section 6",
            "Label Preference Color Section 7",
            "Label Preference Color Section 4"
        ];
        var fmts = [
            function(i, c) { return "Label Color ID " + i + " " + c; },
            function(i, c) { return "Label Color ID 2 " + i + " " + c; },
            function(i, c) { return "Label Color " + i + " " + c; }
        ];
        var pts = [];
        try { pts.push(PREFType.PREF_Type_MACHINE_INDEPENDENT); } catch(e) { pts.push(1); }
        try { pts.push(PREFType.PREF_Type_MACHINE_SPECIFIC); }    catch(e) { pts.push(0); }
        pts.push(2); pts.push(3); pts.push(4);

        for (var s = 0; s < secs.length; s++) {
            for (var f = 0; f < fmts.length; f++) {
                for (var p = 0; p < pts.length; p++) {
                    try {
                        var test = app.preferences.getPrefAsLong(secs[s], fmts[f](1, "Red"), pts[p]);
                        if (test === undefined || isNaN(test)) continue;
                        var cols = readAllWithCombo(secs[s], fmts[f], pts[p]);
                        if (cols) return cols;
                    } catch (e) {}
                }
            }
        }
        return null;
    }

    function readAllWithCombo(sec, fmt, pt) {
        var map = {};
        try {
            for (var i = 1; i <= 16; i++) {
                var r = app.preferences.getPrefAsLong(sec, fmt(i, "Red"),   pt);
                var g = app.preferences.getPrefAsLong(sec, fmt(i, "Green"), pt);
                var b = app.preferences.getPrefAsLong(sec, fmt(i, "Blue"),  pt);
                map[i] = {r: r, g: g, b: b};
            }
        } catch(e) { return null; }
        if (countComplete(map) < 16) return null;
        return buildColorArray(map);
    }

    // =====================================================
    //  CRC32 / Adler32  (for PNG generation)
    // =====================================================
    var CRC_T = (function() {
        var t = [];
        for (var n = 0; n < 256; n++) {
            var c = n;
            for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            t[n] = c;
        }
        return t;
    })();

    function crc32(s) {
        var c = 0xFFFFFFFF;
        for (var i = 0; i < s.length; i++) c = CRC_T[(c ^ s.charCodeAt(i)) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    function adler32(s) {
        var a = 1, b = 0;
        for (var i = 0; i < s.length; i++) { a = (a + s.charCodeAt(i)) % 65521; b = (b + a) % 65521; }
        return ((b << 16) | a) >>> 0;
    }

    function be32(v) {
        return String.fromCharCode((v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF);
    }

    function pngChunk(type, data) {
        var body = type + data;
        return be32(data.length) + body + be32(crc32(body));
    }

    // =====================================================
    //  PNG circle swatch
    // =====================================================
    function circlePNG(r, g, b) {
        var cx = (SZ - 1) / 2.0, cy = cx;
        var outerR = SZ / 2.0;
        var innerR = outerR - 1.2;
        var raw = "";
        for (var y = 0; y < SZ; y++) {
            raw += "\x00";
            for (var x = 0; x < SZ; x++) {
                var dx = x - cx, dy = y - cy;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var alpha;
                if (dist <= innerR)      alpha = 255;
                else if (dist <= outerR) alpha = Math.round(Math.max(0, (outerR - dist) / (outerR - innerR)) * 255);
                else                     alpha = 0;
                raw += String.fromCharCode(r, g, b, alpha);
            }
        }
        var zlib = "\x78\x01";
        var pos = 0;
        while (pos < raw.length) {
            var remain = raw.length - pos;
            var blen = Math.min(remain, 65535);
            var last = (pos + blen >= raw.length);
            zlib += String.fromCharCode(last ? 0x01 : 0x00);
            zlib += String.fromCharCode(blen & 0xFF, (blen >> 8) & 0xFF);
            var nlen = (~blen) & 0xFFFF;
            zlib += String.fromCharCode(nlen & 0xFF, (nlen >> 8) & 0xFF);
            zlib += raw.substring(pos, pos + blen);
            pos += blen;
        }
        zlib += be32(adler32(raw));
        return "\x89PNG\r\n\x1a\n"
            + pngChunk("IHDR", be32(SZ) + be32(SZ) + "\x08\x06\x00\x00\x00")
            + pngChunk("IDAT", zlib)
            + pngChunk("IEND", "");
    }

    // =====================================================
    //  Generate swatches
    // =====================================================
    var COLORS   = readAELabelColors() || FALLBACK;
    var swatches = [];
    var tmpFiles = [];
    var iconsOK  = true;

    function rebuildSwatches() {
        for (var i = 0; i < tmpFiles.length; i++) { try { tmpFiles[i].remove(); } catch(e) {} }
        tmpFiles = []; swatches = [];
        try {
            for (var i = 0; i < COLORS.length; i++) {
                var c = COLORS[i];
                var png = circlePNG(c[0], c[1], c[2]);
                var f = new File(Folder.temp.fsName + "/ae_cbm_" + i + ".png");
                f.open("w"); f.encoding = "BINARY"; f.write(png); f.close();
                tmpFiles.push(f);
                swatches[i] = ScriptUI.newImage(f);
            }
            iconsOK = true;
        } catch (e) { iconsOK = false; }
    }
    rebuildSwatches();

    function cleanup() {
        for (var i = 0; i < tmpFiles.length; i++) { try { tmpFiles[i].remove(); } catch(e) {} }
    }

    // =====================================================
    //  UI
    // =====================================================
    var w = (thisObj instanceof Panel) ? thisObj
          : new Window("palette", NAME, undefined, {resizeable: true});
    w.orientation   = "column";
    w.alignChildren = ["fill", "fill"];
    w.spacing = 4;
    w.margins = [8, 8, 8, 8];

    // ---- toolbar ----
    var bar = w.add("group");
    bar.alignment     = ["fill", "top"];
    bar.alignChildren = ["left", "center"];
    bar.spacing = 3;

    function tb(parent, label, tip, width) {
        var b = parent.add("button", undefined, label);
        b.preferredSize = [width || 28, 22];
        b.helpTip = tip;
        return b;
    }
    var bAdd  = tb(bar, "+",  "Bookmark active comp");
    var bDel  = tb(bar, "–", "Remove selected  [Del]");
    var bUp   = tb(bar, "▲", "Move up");
    var bDn   = tb(bar, "▼", "Move down");
    bar.add("group").alignment = ["fill", "center"];
    var bSync = tb(bar, "↻", "Refresh & re-read label colors from AE");

    // ---- separator ----
    var sep1 = w.add("panel"); sep1.alignment = ["fill", "top"]; sep1.preferredSize = [-1, 2];

    // ---- list ----
    var list = w.add("listbox", undefined, [], {multiselect: false});
    list.alignment     = ["fill", "fill"];
    list.preferredSize = [260, 320];

    // ---- info bar (selected comp details) ----
    var infoGrp = w.add("group");
    infoGrp.alignment     = ["fill", "bottom"];
    infoGrp.alignChildren = ["fill", "center"];
    infoGrp.margins = [2, 2, 2, 0];
    var infoTxt = infoGrp.add("statictext", undefined, "");
    infoTxt.alignment = ["fill", "center"];
    try {
        var gfxI = infoTxt.graphics;
        infoTxt.graphics.foregroundColor = gfxI.newPen(gfxI.PenType.SOLID_COLOR, [0.75, 0.75, 0.75, 1], 1);
    } catch (e) {}

    // ---- separator ----
    var sep2 = w.add("panel"); sep2.alignment = ["fill", "bottom"]; sep2.preferredSize = [-1, 2];

    // ---- status ----
    var stGrp = w.add("group");
    stGrp.alignment = ["fill", "bottom"];
    stGrp.margins   = [2, 0, 2, 0];
    var stTxt = stGrp.add("statictext", undefined, "");
    stTxt.alignment = ["fill", "center"];
    try {
        var gfx = stTxt.graphics;
        stTxt.graphics.foregroundColor = gfx.newPen(gfx.PenType.SOLID_COLOR, [0.55, 0.55, 0.55, 1], 1);
    } catch (e) {}

    // =====================================================
    //  State
    // =====================================================
    var bookmarks = [];
    var compMap   = {};

    function projectKey() {
        if (app.project.file) return app.project.file.fsName.replace(/[^a-zA-Z0-9_\-]/g, "_");
        return "__unsaved__";
    }

    function save() {
        var parts = [];
        for (var i = 0; i < bookmarks.length; i++)
            parts.push(bookmarks[i].name + "||" + bookmarks[i].label);
        app.settings.saveSetting(SEC, projectKey(), parts.join(";;"));
    }

    function load() {
        bookmarks = [];
        try {
            if (app.settings.haveSetting(SEC, projectKey())) {
                var raw = app.settings.getSetting(SEC, projectKey());
                if (raw) {
                    var recs = raw.split(";;");
                    for (var i = 0; i < recs.length; i++) {
                        var p = recs[i].split("||");
                        if (p.length >= 2) bookmarks.push({name: p[0], label: parseInt(p[1], 10) || 0});
                    }
                }
            }
        } catch (e) {}
    }

    function buildCompMap() {
        compMap = {};
        for (var i = 1; i <= app.project.numItems; i++) {
            var it = app.project.item(i);
            if (it instanceof CompItem && !compMap[it.name]) compMap[it.name] = it;
        }
    }

    function findComp(name) { return compMap[name] || null; }

    function fmtInfo(comp) {
        if (!comp) return "";
        var d = comp.duration, m = Math.floor(d / 60), s = (d % 60).toFixed(1);
        return comp.width + "×" + comp.height + "   " + comp.frameRate + " fps   " + (m > 0 ? m + "m " : "") + s + "s";
    }

    function updateInfo() {
        if (!list.selection || list.selection.index < 0 || list.selection.index >= bookmarks.length) {
            infoTxt.text = "";
            return;
        }
        var bm   = bookmarks[list.selection.index];
        var comp  = findComp(bm.name);
        if (comp) {
            var label = (bm.label > 0 && bm.label < LABEL_NAMES.length) ? LABEL_NAMES[bm.label] : "";
            infoTxt.text = fmtInfo(comp) + (label ? "   [" + label + "]" : "");
        } else {
            infoTxt.text = "not found in project";
        }
    }

    function refresh() {
        buildCompMap();
        var sel = list.selection ? list.selection.index : -1;
        list.removeAll();
        for (var i = 0; i < bookmarks.length; i++) {
            var bm  = bookmarks[i];
            var comp = findComp(bm.name);
            if (comp) bm.label = comp.label;

            var text = bm.name;
            if (!comp) text += "  — missing";

            if (!iconsOK && bm.label > 0 && bm.label < LABEL_NAMES.length)
                text = "[" + LABEL_NAMES[bm.label] + "]  " + text;

            var item = list.add("item", text);
            if (iconsOK && bm.label >= 0 && bm.label < swatches.length && swatches[bm.label])
                try { item.image = swatches[bm.label]; } catch (e) {}
        }
        if (sel >= 0 && sel < list.items.length) list.selection = sel;
        var n = bookmarks.length;
        stTxt.text = n + " bookmark" + (n !== 1 ? "s" : "") + "  │  " + colorSource + "  │  dbl-click to open";
        updateInfo();
    }

    // =====================================================
    //  Actions
    // =====================================================
    function addBookmark() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) { alert("Select a composition first.", NAME); return; }
        for (var i = 0; i < bookmarks.length; i++) {
            if (bookmarks[i].name === comp.name) { alert("“" + comp.name + "” is already bookmarked.", NAME); return; }
        }
        bookmarks.push({name: comp.name, label: comp.label});
        save(); refresh();
        list.selection = list.items.length - 1;
    }

    function removeBookmark() {
        if (!list.selection) return;
        bookmarks.splice(list.selection.index, 1);
        save(); refresh();
    }

    function swap(dir) {
        if (!list.selection) return;
        var idx = list.selection.index, tgt = idx + dir;
        if (tgt < 0 || tgt >= bookmarks.length) return;
        var tmp = bookmarks[idx]; bookmarks[idx] = bookmarks[tgt]; bookmarks[tgt] = tmp;
        save(); refresh();
        list.selection = tgt;
    }

    function openComp() {
        if (!list.selection) return;
        var comp = findComp(bookmarks[list.selection.index].name);
        if (comp) comp.openInViewer();
        else alert("Composition not found in project.", NAME);
    }

    // =====================================================
    //  Wiring
    // =====================================================
    bAdd.onClick  = addBookmark;
    bDel.onClick  = removeBookmark;
    bUp.onClick   = function() { swap(-1); };
    bDn.onClick   = function() { swap(1);  };
    bSync.onClick = function() {
        COLORS = readAELabelColors() || FALLBACK;
        rebuildSwatches();
        load();
        refresh();
    };

    list.onChange = updateInfo;
    list.onDoubleClick = openComp;
    list.addEventListener("keydown", function(ev) {
        if (ev.keyName === "Enter")  openComp();
        if (ev.keyName === "Delete") removeBookmark();
    });

    w.onResizing = w.onResize = function() { this.layout.resize(); };
    if (!(thisObj instanceof Panel)) w.onClose = cleanup;

    // =====================================================
    //  Init
    // =====================================================
    load();
    refresh();
    if (!(thisObj instanceof Panel)) { w.center(); w.show(); }
    else { w.layout.layout(true); }

})(this);
