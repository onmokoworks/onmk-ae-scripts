#target aftereffects

(function createSimpleRectangle() {
    var scriptName = "Create Simple Rectangle";
    var comp = app.project ? app.project.activeItem : null;
    if (!(comp instanceof CompItem)) {
        alert("コンポジションを開いてください。", scriptName);
        return;
    }

    function addSlider(effects, name, value) {
        var effect = effects.addProperty("ADBE Slider Control");
        effect.name = name;
        effect.property("ADBE Slider Control-0001").setValue(value);
    }

    app.beginUndoGroup(scriptName);
    try {
        var layer = comp.layers.addShape();
        layer.name = "Simple Rectangle";
        layer.label = 13;

        var effects = layer.property("ADBE Effect Parade");
        addSlider(effects, "Width", 400);
        addSlider(effects, "Height", 240);
        addSlider(effects, "Roundness", 20);

        var root = layer.property("ADBE Root Vectors Group");
        var group = root.addProperty("ADBE Vector Group");
        group.name = "Rectangle";
        var vectors = group.property("ADBE Vectors Group");
        var rectangle = vectors.addProperty("ADBE Vector Shape - Rect");
        rectangle.name = "Rectangle Path";
        rectangle.property("ADBE Vector Rect Size").expression =
            '[Math.max(0, effect("Width")(1).value), Math.max(0, effect("Height")(1).value)];';
        rectangle.property("ADBE Vector Rect Roundness").expression =
            'Math.max(0, effect("Roundness")(1).value);';

        var fill = vectors.addProperty("ADBE Vector Graphic - Fill");
        fill.name = "Fill";
        fill.property("ADBE Vector Fill Color").setValue([1, 1, 1, 1]);

        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        layer.selected = true;
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
