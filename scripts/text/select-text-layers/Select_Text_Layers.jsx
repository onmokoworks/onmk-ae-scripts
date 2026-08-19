#target aftereffects

/*
    Select Text Layers
    Adobe After Effects ExtendScript

    Keep only text layers from the current selection.
    When no layer is selected, select every text layer in the composition.
*/

(function selectTextLayers() {
    var scriptName = "Select Text Layers";
    var comp = app.project ? app.project.activeItem : null;

    if (!(comp instanceof CompItem)) {
        alert("コンポジションを開いてください。", scriptName);
        return;
    }

    var selectedLayers = comp.selectedLayers;
    var textLayers = [];
    var searchAllLayers = !selectedLayers || selectedLayers.length === 0;
    var i;

    function isTextLayer(layer) {
        return layer.property("ADBE Text Properties") !== null;
    }

    if (searchAllLayers) {
        for (i = 1; i <= comp.numLayers; i++) {
            if (isTextLayer(comp.layer(i))) textLayers.push(comp.layer(i));
        }
    } else {
        for (i = 0; i < selectedLayers.length; i++) {
            if (isTextLayer(selectedLayers[i])) textLayers.push(selectedLayers[i]);
        }
    }

    app.beginUndoGroup(scriptName);
    try {
        for (i = 0; i < selectedLayers.length; i++) {
            selectedLayers[i].selected = false;
        }
        for (i = 0; i < textLayers.length; i++) {
            textLayers[i].selected = true;
        }
    } finally {
        app.endUndoGroup();
    }

    if (textLayers.length === 0) {
        alert(searchAllLayers ?
            "コンポジションにテキストレイヤーがありません。" :
            "選択中のレイヤーにテキストレイヤーがありません。", scriptName);
    }
}());
