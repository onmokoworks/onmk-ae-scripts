#target aftereffects

(function deleteMarkerAtPlayhead() {
    var scriptName = "Delete Marker At Playhead";
    var comp = app.project ? app.project.activeItem : null;
    if (!(comp instanceof CompItem)) {
        alert("コンポジションを開いてください。", scriptName);
        return;
    }

    function removeAtTime(markerProperty, time, tolerance) {
        for (var k = markerProperty.numKeys; k >= 1; k--) {
            if (Math.abs(markerProperty.keyTime(k) - time) <= tolerance) {
                markerProperty.removeKey(k);
            }
        }
    }

    app.beginUndoGroup(scriptName);
    try {
        var tolerance = comp.frameDuration / 2;
        var layers = comp.selectedLayers;
        if (layers.length > 0) {
            for (var i = 0; i < layers.length; i++) {
                removeAtTime(layers[i].property("ADBE Marker"), comp.time, tolerance);
            }
        } else {
            removeAtTime(comp.markerProperty, comp.time, tolerance);
        }
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
