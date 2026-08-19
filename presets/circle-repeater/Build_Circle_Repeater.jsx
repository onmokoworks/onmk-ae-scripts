#target aftereffects

/*
    Build Circle Repeater
    Creates a shape layer that can be saved as an Animation Preset (.ffx).
*/

(function buildCircleRepeater() {
    var scriptName = "Build Circle Repeater";
    var comp = app.project ? app.project.activeItem : null;

    if (!(comp instanceof CompItem)) {
        alert("コンポジションを開いてください。", scriptName);
        return;
    }

    function addSlider(effects, name, value) {
        var effect = effects.addProperty("ADBE Slider Control");
        effect.name = name;
        effect.property("ADBE Slider Control-0001").setValue(value);
        return effect;
    }

    function addCheckbox(effects, name, value) {
        var effect = effects.addProperty("ADBE Checkbox Control");
        effect.name = name;
        effect.property("ADBE Checkbox Control-0001").setValue(value);
        return effect;
    }

    app.beginUndoGroup(scriptName);
    try {
        var layer = comp.layers.addShape();
        layer.name = "Circle Repeater";
        layer.label = 11;

        var effects = layer.property("ADBE Effect Parade");
        addSlider(effects, "Columns", 3);
        addSlider(effects, "Rows", 3);
        addSlider(effects, "Width", 160);
        addSlider(effects, "Height", 160);
        addSlider(effects, "Circle Size", 32);
        addCheckbox(effects, "Top Left Start", 0);

        var root = layer.property("ADBE Root Vectors Group");
        var group = root.addProperty("ADBE Vector Group");
        group.name = "Circle Grid";
        var vectors = group.property("ADBE Vectors Group");

        // Keep the horizontal row in its own group. The outer repeater below
        // duplicates that completed row vertically.
        var rowGroup = vectors.addProperty("ADBE Vector Group");
        rowGroup.name = "Circle Row";
        var rowVectors = rowGroup.property("ADBE Vectors Group");

        var ellipse = rowVectors.addProperty("ADBE Vector Shape - Ellipse");
        ellipse.name = "Circle";
        ellipse.property("ADBE Vector Ellipse Size").expression =
            'var s = Math.max(0, effect("Circle Size")(1).value);\n[s, s];';
        ellipse.property("ADBE Vector Ellipse Position").expression =
            'var topLeft = effect("Top Left Start")(1).value > 0;\n' +
            'var requestedCols = Math.max(1, Math.round(effect("Columns")(1).value));\n' +
            'var requestedRows = Math.max(1, Math.round(effect("Rows")(1).value));\n' +
            'var cols = topLeft ? requestedCols : Math.floor(requestedCols / 2) * 2 + 1;\n' +
            'var rows = topLeft ? requestedRows : Math.floor(requestedRows / 2) * 2 + 1;\n' +
            'var x = cols > 1 ? -Math.max(0, effect("Width")(1).value) / 2 : 0;\n' +
            'var y = rows > 1 ? -Math.max(0, effect("Height")(1).value) / 2 : 0;\n' +
            'topLeft ? [0, 0] : [x, y];';

        var fill = rowVectors.addProperty("ADBE Vector Graphic - Fill");
        fill.name = "Fill";
        fill.property("ADBE Vector Fill Color").setValue([1, 1, 1, 1]);

        var columnRepeater = rowVectors.addProperty("ADBE Vector Filter - Repeater");
        columnRepeater.name = "Columns";
        columnRepeater.property("ADBE Vector Repeater Copies").expression =
            'var requested = Math.max(1, Math.round(effect("Columns")(1).value));\n' +
            'effect("Top Left Start")(1).value > 0 ? requested : Math.floor(requested / 2) * 2 + 1;';

        var columnTransform = columnRepeater.property("ADBE Vector Repeater Transform");
        columnTransform.property("ADBE Vector Repeater Position").expression =
            'var requested = Math.max(1, Math.round(effect("Columns")(1).value));\n' +
            'var n = effect("Top Left Start")(1).value > 0 ? requested : Math.floor(requested / 2) * 2 + 1;\n' +
            'var span = Math.max(0, effect("Width")(1).value);\n' +
            '[n > 1 ? span / (n - 1) : 0, 0];';

        var rowRepeater = vectors.addProperty("ADBE Vector Filter - Repeater");
        rowRepeater.name = "Rows";
        rowRepeater.property("ADBE Vector Repeater Copies").expression =
            'var requested = Math.max(1, Math.round(effect("Rows")(1).value));\n' +
            'effect("Top Left Start")(1).value > 0 ? requested : Math.floor(requested / 2) * 2 + 1;';

        var rowTransform = rowRepeater.property("ADBE Vector Repeater Transform");
        rowTransform.property("ADBE Vector Repeater Position").expression =
            'var requested = Math.max(1, Math.round(effect("Rows")(1).value));\n' +
            'var n = effect("Top Left Start")(1).value > 0 ? requested : Math.floor(requested / 2) * 2 + 1;\n' +
            'var span = Math.max(0, effect("Height")(1).value);\n' +
            '[0, n > 1 ? span / (n - 1) : 0];';

        function ensureExpression(property, label) {
            // Force evaluation so a broken expression does not silently leave
            // the Repeater at its default three copies / 100 px spacing.
            property.valueAtTime(comp.time, false);
            if (property.expressionError && property.expressionError !== "") {
                throw new Error(label + ":\n" + property.expressionError);
            }
        }

        var liveGrid = root.property("Circle Grid");
        var liveGridVectors = liveGrid.property("ADBE Vectors Group");
        var liveRow = liveGridVectors.property("Circle Row");
        var liveRowVectors = liveRow.property("ADBE Vectors Group");
        var liveColumns = liveRowVectors.property("Columns");
        var liveRows = liveGridVectors.property("Rows");
        ensureExpression(liveRowVectors.property("Circle").property("ADBE Vector Ellipse Position"), "Circle / Position");
        ensureExpression(liveColumns.property("ADBE Vector Repeater Copies"), "Columns / Copies");
        ensureExpression(
            liveColumns.property("ADBE Vector Repeater Transform").property("ADBE Vector Repeater Position"),
            "Columns / Position"
        );
        ensureExpression(liveRows.property("ADBE Vector Repeater Copies"), "Rows / Copies");
        ensureExpression(
            liveRows.property("ADBE Vector Repeater Transform").property("ADBE Vector Repeater Position"),
            "Rows / Position"
        );

        // Select the properties needed when using Animation > Save Animation Preset.
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
