#target aftereffects

(function flipHorizontal() {
    var scriptName = "Flip Horizontal";
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
                var xScale = scale.getSeparationFollower(0);
                if (xScale.numKeys > 0) {
                    for (var k = 1; k <= xScale.numKeys; k++) {
                        xScale.setValueAtKey(k, -xScale.keyValue(k));
                    }
                } else {
                    xScale.setValue(-xScale.value);
                }
            } else if (scale.numKeys > 0) {
                for (var keyIndex = 1; keyIndex <= scale.numKeys; keyIndex++) {
                    var keyValue = scale.keyValue(keyIndex);
                    keyValue[0] = -keyValue[0];
                    scale.setValueAtKey(keyIndex, keyValue);
                }
            } else {
                var value = scale.value;
                value[0] = -value[0];
                scale.setValue(value);
            }
        }
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
