/*
    Swap Fill / Stroke Colors - Dockable ScriptUI Panel
    Install into After Effects/Scripts/ScriptUI Panels, then restart After Effects.
*/

(function swapFillStrokePanel(thisObj) {
    var scriptName = "Swap Fill / Stroke Colors";

    function swapSelectedLayers() {
        if (!app.project || !app.project.activeItem ||
            !(app.project.activeItem instanceof CompItem)) {
            alert("コンポジションを開いて、レイヤーを選択してください。", scriptName);
            return;
        }

        var layers = app.project.activeItem.selectedLayers;
        if (!layers || layers.length === 0) {
            alert("塗りと線を入れ替えるレイヤーを選択してください。", scriptName);
            return;
        }

        var swappedPairs = 0;
        var skippedPairs = 0;

        function swapColorProperties(fillColor, strokeColor) {
            var fillValue;
            var strokeValue;

            try {
                fillValue = fillColor.value;
                strokeValue = strokeColor.value;
                fillColor.setValue(strokeValue);

                try {
                    strokeColor.setValue(fillValue);
                } catch (strokeError) {
                    fillColor.setValue(fillValue);
                    throw strokeError;
                }
                swappedPairs++;
            } catch (error) {
                skippedPairs++;
            }
        }

        function processShapeGroup(group) {
            var fills = [];
            var strokes = [];
            var i;
            var child;

            for (i = 1; i <= group.numProperties; i++) {
                child = group.property(i);
                if (child.matchName === "ADBE Vector Graphic - Fill") {
                    fills.push(child);
                } else if (child.matchName === "ADBE Vector Graphic - Stroke") {
                    strokes.push(child);
                }
            }

            var pairCount = Math.min(fills.length, strokes.length);
            for (i = 0; i < pairCount; i++) {
                swapColorProperties(
                    fills[i].property("ADBE Vector Fill Color"),
                    strokes[i].property("ADBE Vector Stroke Color")
                );
            }

            for (i = 1; i <= group.numProperties; i++) {
                child = group.property(i);
                if (child.matchName === "ADBE Vector Group") {
                    processShapeGroup(child.property("ADBE Vectors Group"));
                }
            }
        }

        function processTextLayer(layer) {
            var textProperties = layer.property("ADBE Text Properties");
            if (!textProperties) {
                return;
            }

            var sourceText = textProperties.property("ADBE Text Document");
            if (!sourceText) {
                return;
            }

            try {
                var doc = sourceText.value;
                var oldFill = doc.fillColor;
                var oldStroke = doc.strokeColor;
                doc.fillColor = oldStroke;
                doc.strokeColor = oldFill;
                sourceText.setValue(doc);
                swappedPairs++;
            } catch (error) {
                skippedPairs++;
            }
        }

        app.beginUndoGroup(scriptName);
        try {
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                var rootVectors = layer.property("ADBE Root Vectors Group");

                if (rootVectors) {
                    processShapeGroup(rootVectors);
                } else if (layer.property("ADBE Text Properties")) {
                    processTextLayer(layer);
                }
            }
        } finally {
            app.endUndoGroup();
        }

        if (swappedPairs === 0) {
            var message = "交換できる塗りと線の組み合わせが見つかりませんでした。";
            if (skippedPairs > 0) {
                message += "\nロック中、または変更できないプロパティがあります。";
            }
            alert(message, scriptName);
        }
    }

    function buildUI(host) {
        var panel = (host instanceof Panel)
            ? host
            : new Window("palette", "塗り・線カラー交換", undefined, {resizeable: true});

        panel.orientation = "column";
        panel.alignChildren = ["fill", "fill"];
        panel.spacing = 6;
        panel.margins = 8;

        var swapButton = panel.add("button", undefined, "塗り ⇄ 線");
        swapButton.alignment = ["fill", "fill"];
        swapButton.helpTip = "選択レイヤーの塗り色と線色を交換します";
        swapButton.onClick = swapSelectedLayers;

        panel.onResizing = panel.onResize = function () {
            this.layout.resize();
        };

        return panel;
    }

    var ui = buildUI(thisObj);
    if (ui instanceof Window) {
        ui.center();
        ui.show();
    } else {
        ui.layout.layout(true);
    }
}(this));

