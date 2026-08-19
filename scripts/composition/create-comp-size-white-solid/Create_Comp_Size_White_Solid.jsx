/* Create a white solid matching the active composition. */
(function createCompSizeWhiteSolid() {
    var SCRIPT_NAME = "Create Comp Size White Solid";
    var comp = app.project && app.project.activeItem;

    if (!comp || !(comp instanceof CompItem)) {
        alert("コンポジションを開いてください。", SCRIPT_NAME);
        return;
    }

    app.beginUndoGroup(SCRIPT_NAME);
    try {
        var solid = comp.layers.addSolid(
            [1, 1, 1],
            "White Solid",
            comp.width,
            comp.height,
            comp.pixelAspect,
            comp.duration
        );
        solid.startTime = 0;
        solid.inPoint = 0;
        solid.outPoint = comp.duration;
    } finally {
        app.endUndoGroup();
    }
}());
