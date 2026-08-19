{
    // ============================================================
    // ScaleKF_Paste.jsx  v1.0
    // After Effects Script UI Panel
    //
    // コピー元のScaleキーフレームの相対的な動きを保ったまま、
    // ペースト先の現在のScale値を最大値としてキーフレームを貼り付けます。
    //
    // 使い方:
    // 1. コピー元レイヤーのScaleを選択 → [COPY Scale KFs]
    // 2. 貼り付け先レイヤーのScaleを選択 → [PASTE (Keep Max)]
    //
    // インストール:
    // C:\Program Files\Adobe\Adobe After Effects <ver>\Support Files\Scripts\ScriptUI Panels\
    // に配置し、After Effectsを再起動 → ウィンドウメニューから表示
    // ============================================================

    (function buildUI(thisObj) {
        var SCRIPT_NAME = "ScaleKF Paste";

        var win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", SCRIPT_NAME, undefined, { resizeable: true });

        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 6;
        win.margins = 10;
        win.minimumSize = [230, 190];

        // ===== STATE =====
        var stored = null;

        // ===== HELPER FUNCTIONS =====

        function getMaxComponent(value) {
            if (typeof value === "number") return value;
            var m = -Infinity;
            for (var i = 0; i < value.length; i++) {
                if (value[i] > m) m = value[i];
            }
            return m;
        }

        function copyArray(arr) {
            var out = [];
            for (var i = 0; i < arr.length; i++) out.push(arr[i]);
            return out;
        }

        function getLayerFromProperty(prop) {
            try {
                var p = prop;
                for (var i = 0; i < 50; i++) {
                    if (!p || p instanceof Layer) break;
                    if (p.propertyGroup) {
                        p = p.propertyGroup(1);
                    } else {
                        break;
                    }
                }
                return (p instanceof Layer) ? p : null;
            } catch (e) {
                return null;
            }
        }

        function getSelectedScaleProp() {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("アクティブなコンポジションがありません。\nNo active composition.");
                return null;
            }

            var sel = comp.selectedProperties;
            if (sel.length > 0 && sel[0].matchName === "ADBE Scale") {
                return sel[0];
            }

            // Layer selected → use its Transform > Scale
            var layers = comp.selectedLayers;
            if (layers.length > 0) {
                try {
                    var s = layers[0].property("ADBE Transform Group").property("ADBE Scale");
                    if (s) return s;
                } catch (e) {}
            }

            if (sel.length > 0 && sel[0] instanceof PropertyGroup) {
                try {
                    var s2 = sel[0].property("ADBE Scale");
                    if (s2) return s2;
                } catch (e) {}
            }

            alert("Scaleプロパティかレイヤーを選択してください。\nPlease select a Scale property or layer.");
            return null;
        }

        // ===== UI ELEMENTS =====

        // Header
        var hdr = win.add("group");
        hdr.orientation = "row";
        hdr.alignChildren = ["left", "center"];
        hdr.spacing = 4;
        hdr.add("statictext", undefined, "\u25A0");
        var titleLabel = hdr.add("statictext", undefined, SCRIPT_NAME);
        titleLabel.graphics.font = ScriptUI.newFont("Arial", "Bold", 12);

        // Separator
        var sep = win.add("panel");
        sep.preferredSize = [0, 1];

        // Info panel
        var infoPnl = win.add("panel", undefined, "Stored Data");
        infoPnl.orientation = "column";
        infoPnl.alignChildren = ["fill", "left"];
        infoPnl.spacing = 2;
        infoPnl.margins = 6;

        var infoLine1 = infoPnl.add("statictext", undefined, "(no keyframes stored)");
        var infoLine2 = infoPnl.add("statictext", undefined, "");

        // Button row
        var btnRow = win.add("group");
        btnRow.orientation = "row";
        btnRow.alignChildren = ["fill", "center"];
        btnRow.spacing = 8;

        var copyBtn = btnRow.add("button", undefined, "COPY Scale KFs");
        copyBtn.preferredSize = [0, 28];

        var pasteBtn = btnRow.add("button", undefined, "PASTE (Keep Max)");
        pasteBtn.preferredSize = [0, 28];
        pasteBtn.enabled = false;

        // Options
        var optPnl = win.add("panel", undefined, "Options");
        optPnl.orientation = "column";
        optPnl.alignChildren = ["fill", "center"];
        optPnl.spacing = 3;
        optPnl.margins = 6;

        var optRow = optPnl.add("group");
        optRow.orientation = "row";
        optRow.alignChildren = ["left", "center"];
        optRow.spacing = 4;

        var multChk = optRow.add("checkbox", undefined, "Extra multiplier:");
        multChk.value = false;

        var multInp = optRow.add("edittext", undefined, "1.0");
        multInp.characters = 5;
        multInp.enabled = false;

        multChk.onClick = function () {
            multInp.enabled = multChk.value;
        };

        // Status
        var statusTxt = win.add("statictext", undefined, "Ready");
        statusTxt.alignment = ["fill", "center"];

        // ===== REFRESH UI =====
        function refreshUI() {
            if (stored) {
                infoLine1.text = stored.layerName + " / " + stored.propName;
                infoLine2.text = stored.count + " keyframes  |  Max: " + stored.maxVal.toFixed(1) + "%  |  " + stored.dim + "D";
                pasteBtn.enabled = true;
            } else {
                infoLine1.text = "(no keyframes stored)";
                infoLine2.text = "";
                pasteBtn.enabled = false;
            }
        }
        refreshUI();

        // ===== COPY =====
        copyBtn.onClick = function () {
            statusTxt.text = "Copying...";
            var prop = getSelectedScaleProp();
            if (!prop) { statusTxt.text = "Cancelled"; return; }

            if (prop.numKeys === 0) {
                alert("選択したScaleにキーフレームがありません。\nNo keyframes found on selected Scale.");
                statusTxt.text = "Ready";
                return;
            }

            if (prop.dimensionsSeparated) {
                alert("Scaleの次元が分離されています。分離を解除してください。\nScale dimensions are separated. Please un-separate.");
                statusTxt.text = "Ready";
                return;
            }

            var selKeys = prop.selectedKeys;
            var keyIndices = [];
            if (selKeys.length > 0) {
                keyIndices = copyArray(selKeys);
            } else {
                for (var i = 1; i <= prop.numKeys; i++) {
                    keyIndices.push(i);
                }
            }

            if (keyIndices.length < 1) {
                alert("コピーするキーフレームがありません。");
                statusTxt.text = "Ready";
                return;
            }

            var firstTime = prop.keyTime(keyIndices[0]);
            var firstVal = prop.keyValue(keyIndices[0]);
            var dim = Array.isArray(firstVal) ? firstVal.length : 1;
            var kfData = [];
            var maxVal = -Infinity;

            for (var k = 0; k < keyIndices.length; k++) {
                var idx = keyIndices[k];
                var t = prop.keyTime(idx);
                var v = prop.keyValue(idx);

                if (!Array.isArray(v)) v = [v];
                if (v.length !== dim) {
                    if (v.length < dim) {
                        while (v.length < dim) v.push(v[0]);
                    } else {
                        v = v.slice(0, dim);
                    }
                }

                var vMax = getMaxComponent(v);
                if (vMax > maxVal) maxVal = vMax;

                var ei = { speed: 0, influence: 0 };
                var eo = { speed: 0, influence: 0 };
                try {
                    var inE = prop.keyInTemporalEase(idx);
                    if (inE && inE.length > 0) { ei.speed = inE[0].speed; ei.influence = inE[0].influence; }
                    var outE = prop.keyOutTemporalEase(idx);
                    if (outE && outE.length > 0) { eo.speed = outE[0].speed; eo.influence = outE[0].influence; }
                } catch (e) {}

                kfData.push({
                    time: t - firstTime,
                    value: copyArray(v),
                    easeIn: ei,
                    easeOut: eo
                });
            }

            var layer = getLayerFromProperty(prop);
            stored = {
                layerName: layer ? layer.name : "Unknown",
                propName: prop.name,
                count: kfData.length,
                maxVal: maxVal,
                dim: dim,
                keyframes: kfData
            };

            refreshUI();
            statusTxt.text = "Copied " + kfData.length + " keyframes  |  Max: " + maxVal.toFixed(1) + "%";
        };

        // ===== PASTE =====
        pasteBtn.onClick = function () {
            statusTxt.text = "Pasting...";
            if (!stored) {
                alert("先にキーフレームをコピーしてください。\nCopy keyframes first.");
                statusTxt.text = "Ready";
                return;
            }

            var prop = getSelectedScaleProp();
            if (!prop) { statusTxt.text = "Cancelled"; return; }

            if (prop.dimensionsSeparated) {
                alert("貼り付け先のScaleの次元が分離されています。\nDestination Scale has separated dimensions.");
                statusTxt.text = "Ready";
                return;
            }

            var destVal = prop.value;
            if (!Array.isArray(destVal)) destVal = [destVal];
            var destDim = destVal.length;
            var destMax = getMaxComponent(destVal);

            if (destMax <= 0 || stored.maxVal <= 0) {
                alert("Scale値が正しくありません。\nInvalid scale values.");
                statusTxt.text = "Ready";
                return;
            }

            var ratio = destMax / stored.maxVal;

            if (multChk.value) {
                var m = parseFloat(multInp.text);
                if (isNaN(m) || m <= 0) {
                    alert("倍率には正の数値を入力してください。\nPlease enter a positive multiplier.");
                    statusTxt.text = "Ready";
                    return;
                }
                ratio *= m;
            }

            var comp = app.project.activeItem;
            var cti = comp.time;

            app.beginUndoGroup("ScaleKF Paste");

            try {
                for (var k = 0; k < stored.keyframes.length; k++) {
                    var kf = stored.keyframes[k];
                    var newTime = cti + kf.time;
                    var newVal = [];

                    for (var d = 0; d < kf.value.length; d++) {
                        newVal.push(kf.value[d] * ratio);
                    }

                    // Match destination dimension count
                    if (newVal.length !== destDim) {
                        if (newVal.length > destDim) {
                            newVal = newVal.slice(0, destDim);
                        } else {
                            var last = newVal[newVal.length - 1];
                            while (newVal.length < destDim) newVal.push(last);
                        }
                    }

                    prop.setValueAtTime(newTime, newVal);

                    // Restore easing on newly created keyframe
                    var newIdx = prop.nearestKeyIndex(newTime);
                    if (newIdx > 0) {
                        var kt = prop.keyTime(newIdx);
                        if (Math.abs(kt - newTime) < 0.001) {
                            try {
                                var inArr = [];
                                var outArr = [];
                                for (var d2 = 0; d2 < destDim; d2++) {
                                    inArr.push({ speed: kf.easeIn.speed, influence: kf.easeIn.influence });
                                    outArr.push({ speed: kf.easeOut.speed, influence: kf.easeOut.influence });
                                }
                                prop.setTemporalEaseAtKey(newIdx, inArr, outArr);
                            } catch (e) {}
                        }
                    }
                }
            } catch (e) {
                alert("Paste error: " + e.toString());
            }

            app.endUndoGroup();

            var ratioPercent = (ratio * 100).toFixed(1);
            statusTxt.text = "Pasted!  Scale ratio: " + ratioPercent + "%  (dest max: " + destMax.toFixed(1) + ")";
        };

        // ===== WINDOW EVENTS =====
        win.onResizing = win.onResize = function () {
            this.layout.resize();
        };

        if (win instanceof Window) {
            win.center();
            win.show();
        } else {
            win.layout.layout(true);
        }
    })(this);
}
