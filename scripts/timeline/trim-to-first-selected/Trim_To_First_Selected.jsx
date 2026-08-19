/* Trim selected layers to the first layer in AE's selectedLayers array. */
(function trimToFirstSelected() {
    var SCRIPT_NAME = "Trim To First Selected";
    var comp = app.project && app.project.activeItem;

    if (!comp || !(comp instanceof CompItem)) {
        alert("コンポジションを開いてください。", SCRIPT_NAME);
        return;
    }

    var layers = comp.selectedLayers;
    if (!layers || layers.length < 2) {
        alert("基準を含めて2つ以上のレイヤーを選択してください。", SCRIPT_NAME);
        return;
    }

    var reference = layers[0];
    var referenceIn = reference.inPoint;
    var referenceOut = reference.outPoint;

    app.beginUndoGroup(SCRIPT_NAME);
    try {
        for (var i = 1; i < layers.length; i++) {
            // Set both boundaries explicitly so changing the in point cannot
            // leave an AE-adjusted out point behind.
            layers[i].inPoint = referenceIn;
            layers[i].outPoint = referenceOut;
        }
    } finally {
        app.endUndoGroup();
    }
}());
