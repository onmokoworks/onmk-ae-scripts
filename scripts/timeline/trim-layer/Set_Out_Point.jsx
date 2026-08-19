#target aftereffects

(function setOutPoint() {
    var scriptName = "Set Out Point";
    var comp = app.project ? app.project.activeItem : null;
    if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) {
        alert("コンポジションでレイヤーを選択してください。", scriptName);
        return;
    }

    app.beginUndoGroup(scriptName);
    try {
        var layers = comp.selectedLayers;
        for (var i = 0; i < layers.length; i++) {
            layers[i].outPoint = comp.time;
        }
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
