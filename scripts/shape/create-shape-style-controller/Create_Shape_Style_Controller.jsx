#target aftereffects

/*
    Create Shape Style Controller
    Adobe After Effects ExtendScript

    Select shape layers, then run this script. It creates one null whose
    controls drive every solid fill and solid stroke in the selected layers.
*/

(function createShapeStyleController() {
    var scriptName = "Create Shape Style Controller";
    var comp = app.project ? app.project.activeItem : null;

    if (!(comp instanceof CompItem)) {
        alert("コンポジションを開いて、シェイプレイヤーを選択してください。", scriptName);
        return;
    }

    var selectedLayers = comp.selectedLayers;
    var shapeLayers = [];
    var i;
    for (i = 0; i < selectedLayers.length; i++) {
        if (selectedLayers[i].property("ADBE Root Vectors Group") !== null) {
            shapeLayers.push(selectedLayers[i]);
        }
    }

    if (shapeLayers.length === 0) {
        alert("シェイプレイヤーを1つ以上選択してください。", scriptName);
        return;
    }

    function escapeExpressionString(value) {
        return String(value).replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
    }

    function uniqueLayerName(baseName) {
        var name = baseName;
        var suffix = 2;
        while (comp.layer(name) !== null) {
            name = baseName + " " + suffix;
            suffix++;
        }
        return name;
    }

    function addControl(effects, matchName, name, valuePropertyName, initialValue) {
        var effect = effects.addProperty(matchName);
        effect.name = name;
        effect.property(valuePropertyName).setValue(initialValue);
        return effect;
    }

    function controlExpression(controllerName, effectName) {
        return 'thisComp.layer("' + escapeExpressionString(controllerName) +
            '").effect("' + escapeExpressionString(effectName) + '")(1);';
    }

    function firstStyleValues(layers) {
        var values = {
            fillColor: [1, 1, 1, 1],
            fillOpacity: 100,
            strokeColor: [0, 0, 0, 1],
            strokeWidth: 2,
            strokeOpacity: 100,
            foundFill: false,
            foundStroke: false
        };

        function scan(group) {
            var child;
            var n;
            for (n = 1; n <= group.numProperties; n++) {
                child = group.property(n);
                if (!values.foundFill && child.matchName === "ADBE Vector Graphic - Fill") {
                    values.fillColor = child.property("ADBE Vector Fill Color").value;
                    values.fillOpacity = child.property("ADBE Vector Fill Opacity").value;
                    values.foundFill = true;
                } else if (!values.foundStroke && child.matchName === "ADBE Vector Graphic - Stroke") {
                    values.strokeColor = child.property("ADBE Vector Stroke Color").value;
                    values.strokeWidth = child.property("ADBE Vector Stroke Width").value;
                    values.strokeOpacity = child.property("ADBE Vector Stroke Opacity").value;
                    values.foundStroke = true;
                }
                if (child.matchName === "ADBE Vector Group") {
                    scan(child.property("ADBE Vectors Group"));
                }
            }
        }

        for (var layerIndex = 0; layerIndex < layers.length; layerIndex++) {
            scan(layers[layerIndex].property("ADBE Root Vectors Group"));
        }
        return values;
    }

    var linkedFills = 0;
    var linkedStrokes = 0;
    var skipped = 0;

    app.beginUndoGroup(scriptName);
    try {
        var initial = firstStyleValues(shapeLayers);
        var controller = comp.layers.addNull();
        controller.name = uniqueLayerName("Shape Style Controller");
        controller.label = 9;
        controller.moveBefore(shapeLayers[0]);

        var effects = controller.property("ADBE Effect Parade");
        addControl(effects, "ADBE Color Control", "Fill Color", "ADBE Color Control-0001", initial.fillColor);
        addControl(effects, "ADBE Slider Control", "Fill Opacity", "ADBE Slider Control-0001", initial.fillOpacity);
        addControl(effects, "ADBE Color Control", "Stroke Color", "ADBE Color Control-0001", initial.strokeColor);
        addControl(effects, "ADBE Slider Control", "Stroke Width", "ADBE Slider Control-0001", initial.strokeWidth);
        addControl(effects, "ADBE Slider Control", "Stroke Opacity", "ADBE Slider Control-0001", initial.strokeOpacity);

        function setExpression(property, expression) {
            try {
                if (!property || !property.canSetExpression) {
                    skipped++;
                    return false;
                }
                property.expression = expression;
                if (property.expressionError && property.expressionError !== "") {
                    property.expression = "";
                    skipped++;
                    return false;
                }
                return true;
            } catch (error) {
                skipped++;
                return false;
            }
        }

        function linkGroup(group) {
            var child;
            var n;
            for (n = 1; n <= group.numProperties; n++) {
                child = group.property(n);
                if (child.matchName === "ADBE Vector Graphic - Fill") {
                    var fillColorLinked = setExpression(
                        child.property("ADBE Vector Fill Color"),
                        controlExpression(controller.name, "Fill Color")
                    );
                    var fillOpacityLinked = setExpression(
                        child.property("ADBE Vector Fill Opacity"),
                        controlExpression(controller.name, "Fill Opacity")
                    );
                    if (fillColorLinked || fillOpacityLinked) {
                        linkedFills++;
                    }
                } else if (child.matchName === "ADBE Vector Graphic - Stroke") {
                    var strokeColorLinked = setExpression(
                        child.property("ADBE Vector Stroke Color"),
                        controlExpression(controller.name, "Stroke Color")
                    );
                    var strokeWidthLinked = setExpression(
                        child.property("ADBE Vector Stroke Width"),
                        controlExpression(controller.name, "Stroke Width")
                    );
                    var strokeOpacityLinked = setExpression(
                        child.property("ADBE Vector Stroke Opacity"),
                        controlExpression(controller.name, "Stroke Opacity")
                    );
                    if (strokeColorLinked || strokeWidthLinked || strokeOpacityLinked) {
                        linkedStrokes++;
                    }
                }
                if (child.matchName === "ADBE Vector Group") {
                    linkGroup(child.property("ADBE Vectors Group"));
                }
            }
        }

        for (i = 0; i < shapeLayers.length; i++) {
            linkGroup(shapeLayers[i].property("ADBE Root Vectors Group"));
            shapeLayers[i].selected = false;
        }
        controller.selected = true;

        if (linkedFills === 0 && linkedStrokes === 0) {
            controller.remove();
            throw new Error("選択したレイヤーに単色の塗りまたは線が見つかりませんでした。");
        }

        var message = "コントローラーヌルを作成しました。\n塗り: " + linkedFills + " / 線: " + linkedStrokes;
        if (skipped > 0) {
            message += "\n変更できなかったプロパティ: " + skipped;
        }
        alert(message, scriptName);
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
