#target aftereffects

/*
    Select Shape Layers
    Adobe After Effects ExtendScript

    Keep only shape layers from the current selection.
    When no layer is selected, select every shape layer in the composition.
*/

(function selectShapeLayers() {
    var scriptName = "Select Shape Layers";
    var comp = app.project ? app.project.activeItem : null;

    if (!(comp instanceof CompItem)) {
        alert("コンポジションを開いてください。", scriptName);
        return;
    }

    var selectedLayers = comp.selectedLayers;
    var shapeLayers = [];
    var searchAllLayers = !selectedLayers || selectedLayers.length === 0;
    var i;

    if (searchAllLayers) {
        for (i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).property("ADBE Root Vectors Group") !== null) {
                shapeLayers.push(comp.layer(i));
            }
        }
    } else {
        for (i = 0; i < selectedLayers.length; i++) {
            if (selectedLayers[i].property("ADBE Root Vectors Group") !== null) {
                shapeLayers.push(selectedLayers[i]);
            }
        }
    }

    app.beginUndoGroup(scriptName);
    try {
        for (i = 0; i < selectedLayers.length; i++) {
            selectedLayers[i].selected = false;
        }
        for (i = 0; i < shapeLayers.length; i++) {
            shapeLayers[i].selected = true;
        }
    } finally {
        app.endUndoGroup();
    }

    if (shapeLayers.length === 0) {
        alert(searchAllLayers ?
            "コンポジションにシェイプレイヤーがありません。" :
            "選択中のレイヤーにシェイプレイヤーがありません。", scriptName);
    }
}());
