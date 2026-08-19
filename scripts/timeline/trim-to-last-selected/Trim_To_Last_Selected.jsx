/* Trim selected layers to the last layer in AE's selectedLayers array. */
(function trimToLastSelected() {
    var SCRIPT_NAME = "Trim To Last Selected";
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

    var lastIndex = layers.length - 1;
    var reference = layers[lastIndex];
    var referenceIn = reference.inPoint;
    var referenceOut = reference.outPoint;

    app.beginUndoGroup(SCRIPT_NAME);
    try {
        for (var i = 0; i < lastIndex; i++) {
            layers[i].inPoint = referenceIn;
            layers[i].outPoint = referenceOut;
        }
    } finally {
        app.endUndoGroup();
    }
}());
