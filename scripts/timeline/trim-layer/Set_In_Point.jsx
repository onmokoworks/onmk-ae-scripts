#target aftereffects

(function setInPoint() {
    var scriptName = "Set In Point";
    var comp = app.project ? app.project.activeItem : null;
    if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) {
        alert("コンポジションでレイヤーを選択してください。", scriptName);
        return;
    }

    app.beginUndoGroup(scriptName);
    try {
        var layers = comp.selectedLayers;
        for (var i = 0; i < layers.length; i++) {
            var savedOutPoint = layers[i].outPoint;
            layers[i].inPoint = comp.time;
            layers[i].outPoint = savedOutPoint;
        }
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
