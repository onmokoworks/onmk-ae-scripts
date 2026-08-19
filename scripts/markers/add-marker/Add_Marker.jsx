#target aftereffects

(function addMarker() {
    var scriptName = "Add Marker";
    var comp = app.project ? app.project.activeItem : null;
    if (!(comp instanceof CompItem)) {
        alert("コンポジションを開いてください。", scriptName);
        return;
    }

    app.beginUndoGroup(scriptName);
    try {
        var marker = new MarkerValue("");
        var layers = comp.selectedLayers;
        if (layers.length > 0) {
            for (var i = 0; i < layers.length; i++) {
                layers[i].property("ADBE Marker").setValueAtTime(comp.time, marker);
            }
        } else {
            comp.markerProperty.setValueAtTime(comp.time, marker);
        }
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
