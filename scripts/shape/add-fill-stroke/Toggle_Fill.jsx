#target aftereffects

(function toggleFill() {
    var scriptName = "Toggle Fill";
    var comp = app.project ? app.project.activeItem : null;
    if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) {
        alert("コンポジションでシェイプレイヤーを選択してください。", scriptName);
        return;
    }

    function removeFills(group) {
        var removed = 0;
        for (var i = group.numProperties; i >= 1; i--) {
            var property = group.property(i);
            if (property.matchName === "ADBE Vector Graphic - Fill" ||
                property.matchName === "ADBE Vector Graphic - G-Fill") {
                property.remove();
                removed++;
            } else if (property.matchName === "ADBE Vector Group") {
                removed += removeFills(property.property("ADBE Vectors Group"));
            }
        }
        return removed;
    }

    function toggleTextFill(layer) {
        var sourceText = layer.property("ADBE Text Properties").property("ADBE Text Document");
        var document = sourceText.value;
        document.applyFill = !document.applyFill;
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
            if (root && removeFills(root) === 0) {
                var fill = root.addProperty("ADBE Vector Graphic - Fill");
                fill.name = "Fill";
                fill.property("ADBE Vector Fill Color").setValue([1, 1, 1, 1]);
            } else if (!root && layers[i].property("ADBE Text Properties")) {
                toggleTextFill(layers[i]);
            }
        }
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
