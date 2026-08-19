(function(thisObj) {
    var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Flip & Scale Link", undefined, {resizeable: true});
    win.alignment = ["fill", "fill"];
    win.alignChildren = ["fill", "top"];

    var flipGroup = win.add("panel", undefined, "Flip");
    flipGroup.alignment = ["fill", "top"];
    flipGroup.alignChildren = ["fill", "top"];
    flipGroup.orientation = "row";
    var btnFlipH = flipGroup.add("button", undefined, "↔ Left/Right");
    var btnFlipV = flipGroup.add("button", undefined, "↕ Up/Down");
    btnFlipH.alignment = ["fill", "center"];
    btnFlipV.alignment = ["fill", "center"];

    var linkGroup = win.add("panel", undefined, "Scale Link");
    linkGroup.alignment = ["fill", "top"];
    linkGroup.alignChildren = ["fill", "top"];
    linkGroup.orientation = "row";
    var btnUnlink = linkGroup.add("button", undefined, "Unlink XY");
    var btnLink = linkGroup.add("button", undefined, "Link XY");
    btnUnlink.alignment = ["fill", "center"];
    btnLink.alignment = ["fill", "center"];

    function getSelectedLayers() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) { alert("No active composition."); return null; }
        if (comp.selectedLayers.length === 0) { alert("Select at least one layer."); return null; }
        return comp.selectedLayers;
    }

    function flipScale(layers, axis) {
        for (var i = 0; i < layers.length; i++) {
            var s = layers[i].property("ADBE Transform Group").property("ADBE Scale");
            if (s.dimensionsSeparated) {
                var prop = s.getSeparationFollower(axis);
                if (prop.numKeys > 0) {
                    for (var k = 1; k <= prop.numKeys; k++)
                        prop.setValueAtKey(k, prop.keyValue(k) * -1);
                }
                prop.setValue(prop.value * -1);
            } else {
                if (s.numKeys > 0) {
                    for (var k = 1; k <= s.numKeys; k++) {
                        var v = s.keyValue(k); v[axis] *= -1;
                        s.setValueAtKey(k, v);
                    }
                }
                var cv = s.value; cv[axis] *= -1;
                s.setValue(cv);
            }
        }
    }

    btnFlipH.onClick = function() {
        var layers = getSelectedLayers(); if (!layers) return;
        app.beginUndoGroup("Flip Horizontal");
        flipScale(layers, 0);
        app.endUndoGroup();
    };
    btnFlipV.onClick = function() {
        var layers = getSelectedLayers(); if (!layers) return;
        app.beginUndoGroup("Flip Vertical");
        flipScale(layers, 1);
        app.endUndoGroup();
    };

    function readKeys1D(prop) {
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
    function readKeys2D(prop) {
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
    function removeAllKeys(prop) { while (prop.numKeys > 0) prop.removeKey(1); }
    function writeKeys1D(prop, keys) {
        for (var k = 0; k < keys.length; k++) {
            var idx = prop.addKey(keys[k].time);
            prop.setValueAtKey(idx, keys[k].value);
            prop.setInterpolationTypeAtKey(idx, keys[k].inType, keys[k].outType);
            if (keys[k].inEase && keys[k].outEase)
                try { prop.setTemporalEaseAtKey(idx, keys[k].inEase, keys[k].outEase); } catch(e) {}
        }
    }
    function writeKeys2D(prop, keys) {
        for (var k = 0; k < keys.length; k++) {
            var idx = prop.addKey(keys[k].time);
            prop.setValueAtKey(idx, keys[k].value);
            prop.setInterpolationTypeAtKey(idx, keys[k].inType, keys[k].outType);
            if (keys[k].inEase && keys[k].outEase)
                try { prop.setTemporalEaseAtKey(idx, keys[k].inEase, keys[k].outEase); } catch(e) {}
        }
    }

    btnUnlink.onClick = function() {
        var layers = getSelectedLayers(); if (!layers) return;
        app.beginUndoGroup("Unlink Scale XY");
        for (var i = 0; i < layers.length; i++) {
            var s = layers[i].property("ADBE Transform Group").property("ADBE Scale");
            if (s.dimensionsSeparated) continue;
            var curVal = s.value;
            var expr = "";
            try { if (s.expressionEnabled) expr = s.expression; } catch(e) {}
            var keys = readKeys2D(s);
            removeAllKeys(s);
            if (expr !== "") { try { s.expression = ""; s.expressionEnabled = false; } catch(e) {} }
            s.dimensionsSeparated = true;
            var xProp = s.getSeparationFollower(0);
            var yProp = s.getSeparationFollower(1);
            if (keys.length > 0) {
                var xKeys = [], yKeys = [];
                for (var k = 0; k < keys.length; k++) {
                    xKeys.push({ time: keys[k].time, value: keys[k].value[0],
                        inType: keys[k].inType, outType: keys[k].outType,
                        inEase: keys[k].inEase ? [keys[k].inEase[0]] : null,
                        outEase: keys[k].outEase ? [keys[k].outEase[0]] : null });
                    yKeys.push({ time: keys[k].time, value: keys[k].value[1],
                        inType: keys[k].inType, outType: keys[k].outType,
                        inEase: keys[k].inEase ? [keys[k].inEase[1]] : null,
                        outEase: keys[k].outEase ? [keys[k].outEase[1]] : null });
                }
                writeKeys1D(xProp, xKeys);
                writeKeys1D(yProp, yKeys);
            } else {
                xProp.setValue(curVal[0]);
                yProp.setValue(curVal[1]);
            }
        }
        app.endUndoGroup();
    };

    btnLink.onClick = function() {
        var layers = getSelectedLayers(); if (!layers) return;
        app.beginUndoGroup("Link Scale XY");
        for (var i = 0; i < layers.length; i++) {
            var s = layers[i].property("ADBE Transform Group").property("ADBE Scale");
            if (!s.dimensionsSeparated) continue;
            var xProp = s.getSeparationFollower(0);
            var yProp = s.getSeparationFollower(1);
            var curX = xProp.value, curY = yProp.value;
            var xKeys = readKeys1D(xProp), yKeys = readKeys1D(yProp);
            var timeMap = {};
            for (var k = 0; k < xKeys.length; k++) timeMap[xKeys[k].time] = true;
            for (var k = 0; k < yKeys.length; k++) timeMap[yKeys[k].time] = true;
            var allTimes = [];
            for (var t in timeMap) allTimes.push(parseFloat(t));
            allTimes.sort(function(a, b) { return a - b; });
            removeAllKeys(xProp); removeAllKeys(yProp);
            s.dimensionsSeparated = false;
            if (allTimes.length > 0) {
                var combined = [];
                for (var k = 0; k < allTimes.length; k++) {
                    var t = allTimes[k];
                    var xV = curX, yV = curY;
                    var inT = KeyframeInterpolationType.LINEAR, outT = KeyframeInterpolationType.LINEAR;
                    var xIE = null, xOE = null, yIE = null, yOE = null;
                    for (var j = 0; j < xKeys.length; j++) {
                        if (Math.abs(xKeys[j].time - t) < 0.0001) {
                            xV = xKeys[j].value; inT = xKeys[j].inType; outT = xKeys[j].outType;
                            xIE = xKeys[j].inEase ? xKeys[j].inEase[0] : null;
                            xOE = xKeys[j].outEase ? xKeys[j].outEase[0] : null; break;
                        }
                    }
                    for (var j = 0; j < yKeys.length; j++) {
                        if (Math.abs(yKeys[j].time - t) < 0.0001) {
                            yV = yKeys[j].value;
                            if (!xIE) { inT = yKeys[j].inType; outT = yKeys[j].outType; }
                            yIE = yKeys[j].inEase ? yKeys[j].inEase[0] : null;
                            yOE = yKeys[j].outEase ? yKeys[j].outEase[0] : null; break;
                        }
                    }
                    var eIn = null, eOut = null;
                    if (xIE && yIE) { eIn = [xIE, yIE]; eOut = [xOE, yOE]; }
                    combined.push({ time: t, value: [xV, yV, 100],
                        inType: inT, outType: outT, inEase: eIn, outEase: eOut });
                }
                writeKeys2D(s, combined);
            } else {
                s.setValue([curX, curY, 100]);
            }
        }
        app.endUndoGroup();
    };

    win.onResizing = win.onResize = function() { this.layout.resize(); };
    if (win instanceof Window) { win.preferredSize = [260, 140]; win.center(); win.show(); }
    else { win.layout.layout(true); win.layout.resize(); }
})(this);
