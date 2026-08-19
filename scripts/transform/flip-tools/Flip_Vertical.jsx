#target aftereffects

(function flipVertical() {
    var scriptName = "Flip Vertical";
    var comp = app.project ? app.project.activeItem : null;
    if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) {
        alert("コンポジションでレイヤーを選択してください。", scriptName);
        return;
    }

    app.beginUndoGroup(scriptName);
    try {
        var layers = comp.selectedLayers;
        for (var i = 0; i < layers.length; i++) {
            var scale = layers[i].property("ADBE Transform Group").property("ADBE Scale");
            if (scale.dimensionsSeparated) {
                var yScale = scale.getSeparationFollower(1);
                if (yScale.numKeys > 0) {
                    for (var k = 1; k <= yScale.numKeys; k++) {
                        yScale.setValueAtKey(k, -yScale.keyValue(k));
                    }
                } else {
                    yScale.setValue(-yScale.value);
                }
            } else if (scale.numKeys > 0) {
                for (var keyIndex = 1; keyIndex <= scale.numKeys; keyIndex++) {
                    var keyValue = scale.keyValue(keyIndex);
                    keyValue[1] = -keyValue[1];
                    scale.setValueAtKey(keyIndex, keyValue);
                }
            } else {
                var value = scale.value;
                value[1] = -value[1];
                scale.setValue(value);
            }
        }
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
