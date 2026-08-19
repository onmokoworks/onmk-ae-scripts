#target aftereffects

(function linkScaleDimensions() {
    var scriptName = "Link Scale Dimensions";
    var marker = "// ONMK_SCALE_CONTROLS";
    var names = ["Scale X", "Scale Y", "Scale Z"];
    var comp = app.project ? app.project.activeItem : null;
    if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) {
        alert("コンポジションでレイヤーを選択してください。", scriptName);
        return;
    }

    function containsTime(times, time) {
        for (var i = 0; i < times.length; i++) {
            if (Math.abs(times[i] - time) < 0.0001) return true;
        }
        return false;
    }

    function removeKeys(property) {
        while (property.numKeys > 0) property.removeKey(1);
    }

    app.beginUndoGroup(scriptName);
    try {
        var layers = comp.selectedLayers;
        for (var i = 0; i < layers.length; i++) {
            var scale = layers[i].property("ADBE Transform Group").property("ADBE Scale");
            if (!scale || !scale.expressionEnabled || scale.expression.indexOf(marker) !== 0) continue;

            var effects = layers[i].property("ADBE Effect Parade");
            var times = [];
            var foundEffects = [];
            for (var d = 0; d < names.length; d++) {
                var effect = effects.property(names[d]);
                if (!effect) continue;
                foundEffects.push(effect);
                var slider = effect.property("ADBE Slider Control-0001");
                for (var k = 1; k <= slider.numKeys; k++) {
                    var time = slider.keyTime(k);
                    if (!containsTime(times, time)) times.push(time);
                }
            }
            times.sort(function(a, b) { return a - b; });

            var values = [];
            if (times.length === 0) {
                values.push(scale.valueAtTime(comp.time, false));
            } else {
                for (k = 0; k < times.length; k++) {
                    values.push(scale.valueAtTime(times[k], false));
                }
            }

            scale.expressionEnabled = false;
            scale.expression = "";
            removeKeys(scale);
            if (times.length === 0) {
                scale.setValue(values[0]);
            } else {
                for (k = 0; k < times.length; k++) {
                    scale.setValueAtTime(times[k], values[k]);
                }
            }

            // Re-acquire by name because removing an indexed effect invalidates references.
            for (d = names.length - 1; d >= 0; d--) {
                effect = effects.property(names[d]);
                if (effect) effect.remove();
            }
        }
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
