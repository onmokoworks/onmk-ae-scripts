(function(thisObj) {
    var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Fill / Stroke", undefined, {resizeable: true});
    win.alignment = ["fill", "fill"];
    win.alignChildren = ["fill", "top"];
    win.margins = 6;
    win.spacing = 2;

    // ---- Illustrator-like layout ----
    // Row 1: [■ Fill]  [⇄]
    // Row 2:    [□ Stroke]
    var row1 = win.add("group");
    row1.orientation = "row";
    row1.alignment = ["fill", "top"];
    row1.alignChildren = ["fill", "center"];
    row1.spacing = 2;

    var btnFill = row1.add("button", undefined, "■ Fill");
    btnFill.alignment = ["fill", "center"];
    btnFill.helpTip = "Toggle Fill on/off (adds Fill if none exists)";

    var btnSwap = row1.add("button", undefined, "⇄");
    btnSwap.preferredSize = [32, -1];
    btnSwap.maximumSize = [32, 200];
    btnSwap.alignment = ["right", "fill"];
    btnSwap.helpTip = "Swap Fill and Stroke colors";

    var row2 = win.add("group");
    row2.orientation = "row";
    row2.alignment = ["fill", "top"];
    row2.margins = [20, 0, 0, 0];

    var btnStroke = row2.add("button", undefined, "□ Stroke");
    btnStroke.alignment = ["fill", "center"];
    btnStroke.helpTip = "Toggle Stroke on/off (adds Stroke if none exists)";

    // ---- separator ----
    var sep = win.add("panel", undefined, undefined);
    sep.alignment = ["fill", "top"];
    sep.preferredSize = [-1, 0];

    // ---- Opacity swap ----
    var btnSwapOpacity = win.add("button", undefined, "⇄ Swap Opacity");
    btnSwapOpacity.alignment = ["fill", "top"];
    btnSwapOpacity.helpTip = "Swap Fill and Stroke opacity values";

    // ---- Helpers ----
    function getShapeLayers() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) { alert("No active composition."); return null; }
        var out = [];
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            if (comp.selectedLayers[i] instanceof ShapeLayer) out.push(comp.selectedLayers[i]);
        }
        if (out.length === 0) { alert("Select at least one Shape Layer."); return null; }
        return out;
    }

    function findProps(group, matchName) {
        var results = [];
        try {
            for (var i = 1; i <= group.numProperties; i++) {
                var p = group.property(i);
                if (p.matchName === matchName) {
                    results.push(p);
                } else if (p.propertyType === PropertyType.INDEXED_GROUP || p.propertyType === PropertyType.NAMED_GROUP) {
                    var sub = findProps(p, matchName);
                    for (var j = 0; j < sub.length; j++) results.push(sub[j]);
                }
            }
        } catch(e) {}
        return results;
    }

    function findFirstGroup(root) {
        for (var i = 1; i <= root.numProperties; i++) {
            if (root.property(i).matchName === "ADBE Vector Group") {
                return root.property(i).property("ADBE Vectors Group");
            }
        }
        return root;
    }

    // ---- Toggle ----
    function toggleContent(matchName, addName) {
        var layers = getShapeLayers(); if (!layers) return;
        app.beginUndoGroup("Toggle " + addName);
        for (var i = 0; i < layers.length; i++) {
            var root = layers[i].property("ADBE Root Vectors Group");
            var props = findProps(root, matchName);
            if (props.length === 0) {
                findFirstGroup(root).addProperty(matchName);
            } else {
                var anyOn = false;
                for (var j = 0; j < props.length; j++) { if (props[j].enabled) { anyOn = true; break; } }
                for (var j = 0; j < props.length; j++) {
                    try { props[j].enabled = !anyOn; } catch(e) {}
                }
            }
        }
        app.endUndoGroup();
    }

    btnFill.onClick = function() { toggleContent("ADBE Vector Graphic - Fill", "Fill"); };
    btnStroke.onClick = function() { toggleContent("ADBE Vector Graphic - Stroke", "Stroke"); };

    // ---- Swap helpers (keyframe-safe) ----
    function readKeyData(prop) {
        var arr = [];
        for (var k = 1; k <= prop.numKeys; k++) {
            var d = { time: prop.keyTime(k), value: prop.keyValue(k),
                inType: prop.keyInInterpolationType(k), outType: prop.keyOutInterpolationType(k),
                inEase: null, outEase: null };
            try { d.inEase = prop.keyInTemporalEase(k); d.outEase = prop.keyOutTemporalEase(k); } catch(e) {}
            arr.push(d);
        }
        return arr;
    }
    function writeKeyData(prop, keys) {
        for (var k = 0; k < keys.length; k++) {
            var idx = prop.addKey(keys[k].time);
            prop.setValueAtKey(idx, keys[k].value);
            prop.setInterpolationTypeAtKey(idx, keys[k].inType, keys[k].outType);
            if (keys[k].inEase && keys[k].outEase)
                try { prop.setTemporalEaseAtKey(idx, keys[k].inEase, keys[k].outEase); } catch(e) {}
        }
    }
    function swapTwoProps(propA, propB) {
        var aKeys = readKeyData(propA), bKeys = readKeyData(propB);
        var aVal = propA.value, bVal = propB.value;
        while (propA.numKeys > 0) propA.removeKey(1);
        while (propB.numKeys > 0) propB.removeKey(1);
        if (bKeys.length > 0) writeKeyData(propA, bKeys); else propA.setValue(bVal);
        if (aKeys.length > 0) writeKeyData(propB, aKeys); else propB.setValue(aVal);
    }

    // ---- Swap Colors ----
    btnSwap.onClick = function() {
        var layers = getShapeLayers(); if (!layers) return;
        app.beginUndoGroup("Swap Fill/Stroke Colors");
        for (var i = 0; i < layers.length; i++) {
            var root = layers[i].property("ADBE Root Vectors Group");
            var fills = findProps(root, "ADBE Vector Graphic - Fill");
            var strokes = findProps(root, "ADBE Vector Graphic - Stroke");
            var pairs = Math.min(fills.length, strokes.length);
            if (pairs === 0) { alert(layers[i].name + ": need both Fill and Stroke to swap."); continue; }
            for (var j = 0; j < pairs; j++) {
                swapTwoProps(
                    fills[j].property("ADBE Vector Fill Color"),
                    strokes[j].property("ADBE Vector Stroke Color")
                );
            }
        }
        app.endUndoGroup();
    };

    // ---- Swap Opacity ----
    btnSwapOpacity.onClick = function() {
        var layers = getShapeLayers(); if (!layers) return;
        app.beginUndoGroup("Swap Fill/Stroke Opacity");
        for (var i = 0; i < layers.length; i++) {
            var root = layers[i].property("ADBE Root Vectors Group");
            var fills = findProps(root, "ADBE Vector Graphic - Fill");
            var strokes = findProps(root, "ADBE Vector Graphic - Stroke");
            var pairs = Math.min(fills.length, strokes.length);
            if (pairs === 0) { alert(layers[i].name + ": need both Fill and Stroke to swap."); continue; }
            for (var j = 0; j < pairs; j++) {
                swapTwoProps(
                    fills[j].property("ADBE Vector Fill Opacity"),
                    strokes[j].property("ADBE Vector Stroke Opacity")
                );
            }
        }
        app.endUndoGroup();
    };

    win.onResizing = win.onResize = function() { this.layout.resize(); };
    if (win instanceof Window) { win.preferredSize = [220, 130]; win.center(); win.show(); }
    else { win.layout.layout(true); win.layout.resize(); }
})(this);
