#target aftereffects

/*
    Create Trimmed Circle
    Creates a circular shape whose Trim Paths controls are exposed as effects.
*/

(function createTrimmedCircle() {
    var scriptName = "Create Trimmed Circle";
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

    function ensureExpression(property, label) {
        property.valueAtTime(comp.time, false);
        if (property.expressionError && property.expressionError !== "") {
            throw new Error(label + ":\n" + property.expressionError);
        }
    }

    app.beginUndoGroup(scriptName);
    try {
        var layer = comp.layers.addShape();
        layer.name = "Trimmed Circle";
        layer.label = 13;

        var effects = layer.property("ADBE Effect Parade");
        addSlider(effects, "Start", 0);
        addSlider(effects, "End", 75);
        addSlider(effects, "Offset", 0);
        addSlider(effects, "Circle Size", 300);
        addSlider(effects, "Stroke Width", 20);

        var root = layer.property("ADBE Root Vectors Group");
        var group = root.addProperty("ADBE Vector Group");
        group.name = "Trimmed Circle";
        var vectors = group.property("ADBE Vectors Group");

        var ellipse = vectors.addProperty("ADBE Vector Shape - Ellipse");
        ellipse.name = "Circle";
        ellipse.property("ADBE Vector Ellipse Size").expression =
            'var s = Math.max(0, effect("Circle Size")(1).value);\n[s, s];';

        var stroke = vectors.addProperty("ADBE Vector Graphic - Stroke");
        stroke.name = "Stroke";
        stroke.property("ADBE Vector Stroke Color").setValue([1, 1, 1, 1]);
        stroke.property("ADBE Vector Stroke Width").expression =
            'Math.max(0, effect("Stroke Width")(1).value);';
        stroke.property("ADBE Vector Stroke Line Cap").setValue(2);

        var trim = vectors.addProperty("ADBE Vector Filter - Trim");
        trim.name = "Trim Paths";
        trim.property("ADBE Vector Trim Start").expression =
            'Math.max(0, Math.min(100, effect("Start")(1).value));';
        trim.property("ADBE Vector Trim End").expression =
            'Math.max(0, Math.min(100, effect("End")(1).value));';
        trim.property("ADBE Vector Trim Offset").expression =
            'effect("Offset")(1).value;';

        // Re-acquire indexed properties after all addProperty() calls.
        var liveGroup = root.property("Trimmed Circle");
        var liveVectors = liveGroup.property("ADBE Vectors Group");
        ensureExpression(
            liveVectors.property("Circle").property("ADBE Vector Ellipse Size"),
            "Circle Size"
        );
        ensureExpression(
            liveVectors.property("Stroke").property("ADBE Vector Stroke Width"),
            "Stroke Width"
        );
        var liveTrim = liveVectors.property("Trim Paths");
        ensureExpression(liveTrim.property("ADBE Vector Trim Start"), "Start");
        ensureExpression(liveTrim.property("ADBE Vector Trim End"), "End");
        ensureExpression(liveTrim.property("ADBE Vector Trim Offset"), "Offset");

        for (var i = 1; i <= comp.numLayers; i++) {
            comp.layer(i).selected = false;
        }
        layer.selected = true;
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
