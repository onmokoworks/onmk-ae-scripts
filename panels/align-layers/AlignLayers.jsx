(function alignLayersPanel(thisObj) {
    var PANEL_NAME = "Align Layers";
    var ACCENT = [0.78, 0.78, 0.78, 1.0];

    var win = (thisObj instanceof Panel) ?
        thisObj : new Window("palette", PANEL_NAME, undefined, { resizeable: true });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 2;
    win.margins = 4;

    var targetRow = win.add("group");
    targetRow.orientation = "row";
    targetRow.alignChildren = ["left", "center"];
    targetRow.add("statictext", undefined, "Align To");
    var targetSelection = targetRow.add("radiobutton", undefined, "Selection");
    var targetComposition = targetRow.add("radiobutton", undefined, "Composition");
    targetSelection.value = true;

    var alignPanel = win.add("panel", undefined, "Align");
    alignPanel.orientation = "row";
    alignPanel.alignChildren = ["fill", "top"];
    alignPanel.margins = 4;
    alignPanel.spacing = 2;

    var alignRow = alignPanel.add("group");
    alignRow.orientation = "row";
    alignRow.alignChildren = ["left", "center"];
    alignRow.spacing = 2;

    var distributePanel = win.add("panel", undefined, "Distribute Centers");
    distributePanel.orientation = "row";
    distributePanel.alignChildren = ["left", "center"];
    distributePanel.margins = 4;
    distributePanel.spacing = 2;

    function makeIconButton(parent, kind, tip) {
        var button = parent.add("button", undefined, "");
        button.preferredSize = [30, 24];
        button.minimumSize = [30, 24];
        button.maximumSize = [30, 24];
        button.alignment = ["left", "center"];
        button.helpTip = tip;
        button._iconKind = kind;
        button.onDraw = function() {
            var g = this.graphics;
            var pen = g.newPen(g.PenType.SOLID_COLOR, ACCENT, 1.5);
            var brush = g.newBrush(g.BrushType.SOLID_COLOR, ACCENT);

            function line(x1, y1, x2, y2) {
                g.newPath();
                g.moveTo(x1, y1);
                g.lineTo(x2, y2);
                g.strokePath(pen);
            }
            function box(x, y, bw, bh) {
                g.newPath();
                g.rectPath(x, y, bw, bh);
                g.fillPath(brush);
            }

            if (kind === "left") {
                line(5, 4, 5, 20);
                box(8, 6, 10, 4);
                box(8, 14, 16, 4);
            } else if (kind === "hcenter") {
                line(15, 3, 15, 21);
                box(10, 6, 10, 4);
                box(7, 14, 16, 4);
            } else if (kind === "right") {
                line(25, 4, 25, 20);
                box(12, 6, 10, 4);
                box(6, 14, 16, 4);
            } else if (kind === "top") {
                line(5, 4, 25, 4);
                box(8, 7, 4, 9);
                box(18, 7, 4, 13);
            } else if (kind === "vcenter") {
                line(4, 12, 26, 12);
                box(8, 7, 4, 10);
                box(18, 5, 4, 14);
            } else if (kind === "bottom") {
                line(5, 20, 25, 20);
                box(8, 8, 4, 9);
                box(18, 5, 4, 12);
            } else if (kind === "distributeH") {
                box(5, 8, 4, 8);
                box(13, 5, 4, 14);
                box(21, 7, 4, 10);
            } else if (kind === "distributeV") {
                box(10, 4, 10, 3);
                box(6, 10, 18, 3);
                box(8, 17, 14, 3);
            }
        };
        return button;
    }

    var btnLeft = makeIconButton(alignRow, "left", "Align Left");
    var btnHCenter = makeIconButton(alignRow, "hcenter", "Align Horizontal Center");
    var btnRight = makeIconButton(alignRow, "right", "Align Right");
    var btnTop = makeIconButton(alignRow, "top", "Align Top");
    var btnVCenter = makeIconButton(alignRow, "vcenter", "Align Vertical Center");
    var btnBottom = makeIconButton(alignRow, "bottom", "Align Bottom");
    var btnDistributeH = makeIconButton(distributePanel, "distributeH", "Distribute Horizontal Centers");
    var btnDistributeV = makeIconButton(distributePanel, "distributeV", "Distribute Vertical Centers");

    function getContext(minimumLayers) {
        var comp = app.project && app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("コンポジションを開いてください。", PANEL_NAME);
            return null;
        }
        var layers = comp.selectedLayers;
        if (!layers || layers.length < minimumLayers) {
            alert(minimumLayers + "個以上のレイヤーを選択してください。", PANEL_NAME);
            return null;
        }
        return { comp: comp, layers: layers };
    }

    function getPositionProperty(layer) {
        var transform = layer.property("ADBE Transform Group");
        return transform ? transform.property("ADBE Position") : null;
    }

    function getPositionAtTime(layer, time) {
        var prop = getPositionProperty(layer);
        if (!prop) { return null; }
        if (prop.dimensionsSeparated) {
            var x = prop.getSeparationFollower(0).valueAtTime(time, false);
            var y = prop.getSeparationFollower(1).valueAtTime(time, false);
            var z = layer.threeDLayer ? prop.getSeparationFollower(2).valueAtTime(time, false) : 0;
            return [x, y, z];
        }
        var value = prop.valueAtTime(time, false);
        return [value[0], value[1], value.length > 2 ? value[2] : 0];
    }

    function setPositionAtTime(layer, time, value) {
        var prop = getPositionProperty(layer);
        if (!prop) { return false; }
        try {
            if (prop.dimensionsSeparated) {
                var xProp = prop.getSeparationFollower(0);
                var yProp = prop.getSeparationFollower(1);
                if ((xProp.expressionEnabled) || (yProp.expressionEnabled)) { return false; }
                if (xProp.numKeys > 0) { xProp.setValueAtTime(time, value[0]); } else { xProp.setValue(value[0]); }
                if (yProp.numKeys > 0) { yProp.setValueAtTime(time, value[1]); } else { yProp.setValue(value[1]); }
            } else {
                if (prop.expressionEnabled) { return false; }
                var result = layer.threeDLayer ? [value[0], value[1], value[2]] : [value[0], value[1]];
                if (prop.numKeys > 0) { prop.setValueAtTime(time, result); } else { prop.setValue(result); }
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    function getBounds(layer, time) {
        var position = getPositionAtTime(layer, time);
        if (!position) { return null; }

        var rect;
        try {
            rect = layer.sourceRectAtTime(time, false);
        } catch (error) {
            rect = { left: 0, top: 0, width: layer.width || 0, height: layer.height || 0 };
        }

        var transform = layer.property("ADBE Transform Group");
        var anchor = transform.property("ADBE Anchor Point").valueAtTime(time, false);
        var scale = transform.property("ADBE Scale").valueAtTime(time, false);
        var sx = Math.abs(scale[0]) / 100;
        var sy = Math.abs(scale[1]) / 100;
        var leftOffset = (rect.left - anchor[0]) * sx;
        var rightOffset = (rect.left + rect.width - anchor[0]) * sx;
        var topOffset = (rect.top - anchor[1]) * sy;
        var bottomOffset = (rect.top + rect.height - anchor[1]) * sy;

        return {
            layer: layer,
            position: position,
            left: position[0] + Math.min(leftOffset, rightOffset),
            right: position[0] + Math.max(leftOffset, rightOffset),
            top: position[1] + Math.min(topOffset, bottomOffset),
            bottom: position[1] + Math.max(topOffset, bottomOffset)
        };
    }

    function collectBounds(context) {
        var bounds = [];
        for (var i = 0; i < context.layers.length; i++) {
            var item = getBounds(context.layers[i], context.comp.time);
            if (item) { bounds.push(item); }
        }
        return bounds;
    }

    function unionBounds(bounds, comp) {
        if (targetComposition.value) {
            return { left: 0, right: comp.width, top: 0, bottom: comp.height };
        }
        var result = {
            left: bounds[0].left, right: bounds[0].right,
            top: bounds[0].top, bottom: bounds[0].bottom
        };
        for (var i = 1; i < bounds.length; i++) {
            result.left = Math.min(result.left, bounds[i].left);
            result.right = Math.max(result.right, bounds[i].right);
            result.top = Math.min(result.top, bounds[i].top);
            result.bottom = Math.max(result.bottom, bounds[i].bottom);
        }
        return result;
    }

    function align(kind) {
        var minimum = targetComposition.value ? 1 : 2;
        var context = getContext(minimum);
        if (!context) { return; }
        var bounds = collectBounds(context);
        if (bounds.length < minimum) { return; }
        var target = unionBounds(bounds, context.comp);

        app.beginUndoGroup("Align Layers");
        for (var i = 0; i < bounds.length; i++) {
            var item = bounds[i];
            var dx = 0;
            var dy = 0;
            if (kind === "left") { dx = target.left - item.left; }
            else if (kind === "hcenter") { dx = (target.left + target.right - item.left - item.right) / 2; }
            else if (kind === "right") { dx = target.right - item.right; }
            else if (kind === "top") { dy = target.top - item.top; }
            else if (kind === "vcenter") { dy = (target.top + target.bottom - item.top - item.bottom) / 2; }
            else if (kind === "bottom") { dy = target.bottom - item.bottom; }
            setPositionAtTime(item.layer, context.comp.time,
                [item.position[0] + dx, item.position[1] + dy, item.position[2]]);
        }
        app.endUndoGroup();
    }

    function distribute(axis) {
        var context = getContext(3);
        if (!context) { return; }
        var bounds = collectBounds(context);
        if (bounds.length < 3) { return; }
        bounds.sort(function(a, b) {
            var ac = axis === "x" ? (a.left + a.right) / 2 : (a.top + a.bottom) / 2;
            var bc = axis === "x" ? (b.left + b.right) / 2 : (b.top + b.bottom) / 2;
            return ac - bc;
        });
        var first = axis === "x" ? (bounds[0].left + bounds[0].right) / 2 : (bounds[0].top + bounds[0].bottom) / 2;
        var lastIndex = bounds.length - 1;
        var last = axis === "x" ? (bounds[lastIndex].left + bounds[lastIndex].right) / 2 :
            (bounds[lastIndex].top + bounds[lastIndex].bottom) / 2;
        var step = (last - first) / lastIndex;

        app.beginUndoGroup("Distribute Layers");
        for (var i = 1; i < lastIndex; i++) {
            var current = axis === "x" ? (bounds[i].left + bounds[i].right) / 2 :
                (bounds[i].top + bounds[i].bottom) / 2;
            var delta = first + step * i - current;
            var position = bounds[i].position;
            setPositionAtTime(bounds[i].layer, context.comp.time,
                axis === "x" ? [position[0] + delta, position[1], position[2]] :
                    [position[0], position[1] + delta, position[2]]);
        }
        app.endUndoGroup();
    }

    btnLeft.onClick = function() { align("left"); };
    btnHCenter.onClick = function() { align("hcenter"); };
    btnRight.onClick = function() { align("right"); };
    btnTop.onClick = function() { align("top"); };
    btnVCenter.onClick = function() { align("vcenter"); };
    btnBottom.onClick = function() { align("bottom"); };
    btnDistributeH.onClick = function() { distribute("x"); };
    btnDistributeV.onClick = function() { distribute("y"); };

    win.onResizing = win.onResize = function() { this.layout.resize(); };
    if (win instanceof Window) {
        win.preferredSize = [205, 122];
        win.center();
        win.show();
    } else {
        win.layout.layout(true);
        win.layout.resize();
    }
}(this));
