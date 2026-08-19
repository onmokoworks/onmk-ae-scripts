#target aftereffects

(function unlinkScaleDimensions() {
    var scriptName = "Unlink Scale Dimensions";
    var marker = "// ONMK_SCALE_CONTROLS";
    var names = ["Scale X", "Scale Y", "Scale Z"];
    var comp = app.project ? app.project.activeItem : null;
    if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) {
        alert("コンポジションでレイヤーを選択してください。", scriptName);
        return;
    }

    function removeKeys(property) {
        while (property.numKeys > 0) property.removeKey(1);
    }

    app.beginUndoGroup(scriptName);
    try {
        var layers = comp.selectedLayers;
        for (var i = 0; i < layers.length; i++) {
            var scale = layers[i].property("ADBE Transform Group").property("ADBE Scale");
            if (!scale || !scale.canSetExpression) continue;
            if (scale.expressionEnabled && scale.expression.indexOf(marker) !== 0) continue;
            if (scale.expressionEnabled) continue;

            var dimensions = scale.value.length;
            var values = [];
            var times = [];
            var k;
            if (scale.numKeys > 0) {
                for (k = 1; k <= scale.numKeys; k++) {
                    times.push(scale.keyTime(k));
                    values.push(scale.keyValue(k));
                }
            } else {
                values.push(scale.value);
            }

            var effects = layers[i].property("ADBE Effect Parade");
            for (var d = 0; d < dimensions; d++) {
                var oldEffect = effects.property(names[d]);
                if (oldEffect) oldEffect.remove();
                var effect = effects.addProperty("ADBE Slider Control");
                effect.name = names[d];
            }

            removeKeys(scale);
            effects = layers[i].property("ADBE Effect Parade");
            for (d = 0; d < dimensions; d++) {
                var slider = effects.property(names[d]).property("ADBE Slider Control-0001");
                if (times.length === 0) {
                    slider.setValue(values[0][d]);
                } else {
                    for (k = 0; k < times.length; k++) {
                        slider.setValueAtTime(times[k], values[k][d]);
                    }
                }
            }

            scale.expression = marker + "\n" +
                (dimensions > 2 ?
                    '[effect("Scale X")(1).value, effect("Scale Y")(1).value, effect("Scale Z")(1).value];' :
                    '[effect("Scale X")(1).value, effect("Scale Y")(1).value];');
            scale.expressionEnabled = true;
        }
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
