/*
    Swap Fill / Stroke Colors
    Adobe After Effects ExtendScript

    Select one or more shape or text layers, then run this script.
    Solid fills and strokes are paired in stack order. Unpaired operators are
    converted to the opposite type.
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

    var changedItems = 0;
    var skippedItems = 0;

    function swapStyleProperties(fill, stroke) {
        try {
            var fillColor = fill.property("ADBE Vector Fill Color");
            var fillOpacity = fill.property("ADBE Vector Fill Opacity");
            var strokeColor = stroke.property("ADBE Vector Stroke Color");
            var strokeOpacity = stroke.property("ADBE Vector Stroke Opacity");
            var oldFillColor = fillColor.value;
            var oldFillOpacity = fillOpacity.value;
            var oldStrokeColor = strokeColor.value;
            var oldStrokeOpacity = strokeOpacity.value;
            fillColor.setValue(oldStrokeColor);
            fillOpacity.setValue(oldStrokeOpacity);
            strokeColor.setValue(oldFillColor);
            strokeOpacity.setValue(oldFillOpacity);
            changedItems++;
        } catch (error) {
            skippedItems++;
        }
    }

    function processPair(fill, stroke) {
        try {
            if (fill.enabled && stroke.enabled) {
                swapStyleProperties(fill, stroke);
            } else if (fill.enabled !== stroke.enabled) {
                var fillWasEnabled = fill.enabled;
                fill.enabled = !fillWasEnabled;
                stroke.enabled = fillWasEnabled;
                changedItems++;
            }
        } catch (error) {
            skippedItems++;
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
            processPair(fills[i], strokes[i]);
        }

        // Store plain values before adding operators. addProperty() invalidates
        // Property references in AE, so existing operators are disabled first.
        var conversions = [];
        for (i = pairCount; i < fills.length; i++) {
            if (fills[i].enabled) {
                conversions.push({
                    target: "stroke",
                    color: fills[i].property("ADBE Vector Fill Color").value,
                    opacity: fills[i].property("ADBE Vector Fill Opacity").value
                });
                fills[i].enabled = false;
            }
        }
        for (i = pairCount; i < strokes.length; i++) {
            if (strokes[i].enabled) {
                conversions.push({
                    target: "fill",
                    color: strokes[i].property("ADBE Vector Stroke Color").value,
                    opacity: strokes[i].property("ADBE Vector Stroke Opacity").value
                });
                strokes[i].enabled = false;
            }
        }

        for (i = 0; i < conversions.length; i++) {
            if (conversions[i].target === "stroke") {
                var newStroke = group.addProperty("ADBE Vector Graphic - Stroke");
                newStroke.name = "Stroke";
                newStroke.property("ADBE Vector Stroke Color").setValue(conversions[i].color);
                newStroke.property("ADBE Vector Stroke Opacity").setValue(conversions[i].opacity);
                newStroke.property("ADBE Vector Stroke Width").setValue(10);
            } else {
                var newFill = group.addProperty("ADBE Vector Graphic - Fill");
                newFill.name = "Fill";
                newFill.property("ADBE Vector Fill Color").setValue(conversions[i].color);
                newFill.property("ADBE Vector Fill Opacity").setValue(conversions[i].opacity);
            }
            changedItems++;
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
            var oldApplyFill = doc.applyFill;
            var oldApplyStroke = doc.applyStroke;
            var oldFill;
            var oldStroke;

            // AE throws when reading fillColor/strokeColor while that style is
            // disabled. Read only colors that are currently available.
            if (oldApplyFill) {
                oldFill = doc.fillColor;
            }
            if (oldApplyStroke) {
                oldStroke = doc.strokeColor;
            }

            if (oldApplyFill && oldApplyStroke) {
                doc.fillColor = oldStroke;
                doc.strokeColor = oldFill;
            } else if (oldApplyFill) {
                doc.applyStroke = true;
                doc.strokeColor = oldFill;
                if (doc.strokeWidth <= 0) {
                    doc.strokeWidth = 5;
                }
                doc.applyFill = false;
            } else if (oldApplyStroke) {
                doc.applyFill = true;
                doc.fillColor = oldStroke;
                doc.applyStroke = false;
            } else {
                return;
            }
            if (sourceText.numKeys > 0) {
                sourceText.setValueAtTime(comp.time, doc);
            } else {
                sourceText.setValue(doc);
            }
            changedItems++;
        } catch (error) {
            skippedItems++;
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

}());
