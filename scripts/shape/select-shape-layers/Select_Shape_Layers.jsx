#target aftereffects

/*
    Select Shape Layers
    Adobe After Effects ExtendScript

    Keep only shape layers selected from the current layer selection.
*/

(function selectShapeLayers() {
    var scriptName = "Select Shape Layers";
    var comp = app.project ? app.project.activeItem : null;

    if (!(comp instanceof CompItem)) {
        alert("コンポジションを開いて、レイヤーを選択してください。", scriptName);
        return;
    }

    var selectedLayers = comp.selectedLayers;
    if (!selectedLayers || selectedLayers.length === 0) {
        alert("レイヤーを選択してください。", scriptName);
        return;
    }

    var shapeLayers = [];
    var i;

    for (i = 0; i < selectedLayers.length; i++) {
        if (selectedLayers[i].property("ADBE Root Vectors Group") !== null) {
            shapeLayers.push(selectedLayers[i]);
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
        alert("選択中のレイヤーにシェイプレイヤーがありません。", scriptName);
    }
}());
