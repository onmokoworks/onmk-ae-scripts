/*
    Swap Fill / Stroke Colors
    Adobe After Effects ExtendScript

    Select one or more shape or text layers, then run this script.
    In shape groups, solid fills and solid strokes are paired in stack order.
*/

(function swapFillStrokeColors() {
    var scriptName = "Swap Fill / Stroke Colors";

    if (!app.project || !app.project.activeItem ||
        !(app.project.activeItem instanceof CompItem)) {
        alert("コンポジションを開いて、レイヤーを選択してください。", scriptName);
        return;
    }

    var comp = app.project.activeItem;
    var layers = comp.selectedLayers;

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
                // Avoid leaving only one side changed when the second property is locked.
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

        // Pair only operators that share this exact group.
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

        // Search nested vector groups as well.
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
        for (var layerIndex = 0; layerIndex < layers.length; layerIndex++) {
            var layer = layers[layerIndex];
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
}());

