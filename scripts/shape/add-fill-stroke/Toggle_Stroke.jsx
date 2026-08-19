#target aftereffects

(function toggleStroke() {
    var scriptName = "Toggle Stroke";
    var comp = app.project ? app.project.activeItem : null;
    if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) {
        alert("コンポジションでシェイプレイヤーを選択してください。", scriptName);
        return;
    }

    function removeStrokes(group) {
        var removed = 0;
        for (var i = group.numProperties; i >= 1; i--) {
            var property = group.property(i);
            if (property.matchName === "ADBE Vector Graphic - Stroke" ||
                property.matchName === "ADBE Vector Graphic - G-Stroke") {
                property.remove();
                removed++;
            } else if (property.matchName === "ADBE Vector Group") {
                removed += removeStrokes(property.property("ADBE Vectors Group"));
            }
        }
        return removed;
    }

    function toggleTextStroke(layer) {
        var sourceText = layer.property("ADBE Text Properties").property("ADBE Text Document");
        var document = sourceText.value;
        document.applyStroke = !document.applyStroke;
        if (document.applyStroke && document.strokeWidth <= 0) {
            document.strokeWidth = 5;
        }
        if (sourceText.numKeys > 0) {
            sourceText.setValueAtTime(comp.time, document);
        } else {
            sourceText.setValue(document);
        }
    }

    app.beginUndoGroup(scriptName);
    try {
        var layers = comp.selectedLayers;
        for (var i = 0; i < layers.length; i++) {
            var root = layers[i].property("ADBE Root Vectors Group");
            if (root && removeStrokes(root) === 0) {
                var stroke = root.addProperty("ADBE Vector Graphic - Stroke");
                stroke.name = "Stroke";
                stroke.property("ADBE Vector Stroke Color").setValue([1, 1, 1, 1]);
                stroke.property("ADBE Vector Stroke Width").setValue(10);
            } else if (!root && layers[i].property("ADBE Text Properties")) {
                toggleTextStroke(layers[i]);
            }
        }
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
