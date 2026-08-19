#target aftereffects

(function nullsFromSelectedShapePaths() {
    app.beginUndoGroup("Nulls From Selected Shape Paths");

    function esc(s) {
        return String(s).replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
    }

    function uniqueLayerName(comp, base) {
        var name = base;
        var n = 2;
        while (comp.layer(name) !== null) {
            name = base + " " + n;
            n++;
        }
        return name;
    }

    function numberText(value) {
        if (!isFinite(value)) {
            return "0";
        }
        return String(Math.round(value * 1000000) / 1000000);
    }

    function pointsText(points) {
        var items = [];
        for (var i = 0; i < points.length; i++) {
            items.push("[" + numberText(points[i][0]) + "," + numberText(points[i][1]) + "]");
        }
        return "[" + items.join(",") + "]";
    }

    function propertyExpressionPath(layer, prop) {
        var parts = [];
        var p = prop;
        while (p && p !== layer) {
            parts.unshift('.property("' + esc(p.name) + '")');
            p = p.parentProperty;
        }
        return 'thisComp.layer("' + esc(layer.name) + '")' + parts.join("");
    }

    function selectedShapePaths(layer) {
        var result = [];
        var props = layer.selectedProperties;
        for (var i = 0; i < props.length; i++) {
            // Match Adobe's Create Nulls From Paths selection behavior:
            // only path properties directly reported by selectedProperties.
            if (props[i].matchName === "ADBE Vector Shape") {
                result.push(props[i]);
            }
        }
        return result;
    }

    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            throw new Error("コンポジションを開いてください。");
        }

        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            throw new Error("シェイプレイヤーと、その中のパスを選択してください。");
        }

        var madeNulls = 0;
        var linkedPaths = 0;
        var skipped = [];
        var expressionErrors = [];

        for (var l = 0; l < selectedLayers.length; l++) {
            var layer = selectedLayers[l];
            var paths = selectedShapePaths(layer);

            for (var p = 0; p < paths.length; p++) {
                var pathProp = paths[p];
                if (!pathProp.canSetExpression) {
                    skipped.push(layer.name + " / " + pathProp.name);
                    continue;
                }

                var shape = pathProp.expressionEnabled ?
                    pathProp.valueAtTime(comp.time, true) : pathProp.value;
                if (!shape || !shape.vertices || shape.vertices.length === 0) {
                    skipped.push(layer.name + " / " + pathProp.name);
                    continue;
                }

                var pathRef = propertyExpressionPath(layer, pathProp);
                var nullNames = [];

                for (var v = 0; v < shape.vertices.length; v++) {
                    var baseName = layer.name + " - " + pathProp.name + " - V" + (v + 1);
                    var nullName = uniqueLayerName(comp, baseName);
                    var nullLayer = comp.layers.addNull();
                    nullLayer.name = nullName;
                    nullLayer.label = 10;
                    nullLayer.moveBefore(layer);
                    nullLayer.inPoint = layer.inPoint;
                    nullLayer.outPoint = layer.outPoint;

                    var pos = nullLayer.property("ADBE Transform Group").property("ADBE Position");
                    pos.expression =
                        'var pathLayer = thisComp.layer("' + esc(layer.name) + '");\n' +
                        'var path = ' + pathRef + ';\n' +
                        'pathLayer.toComp(path.points()[' + v + ']);';
                    // Force AE to evaluate the just-assigned expression. Reading
                    // .value immediately can return the null's old default position,
                    // which collapses every path vertex onto the same point.
                    var bakedPosition = pos.valueAtTime(comp.time, false);
                    pos.expression = "";
                    pos.setValue(bakedPosition);

                    nullNames.push(nullName);
                    madeNulls++;
                }

                var expression = [];
                // Embed the source geometry. Reading thisProperty.points() from the
                // expression on the same property can become a circular evaluation
                // in some versions of After Effects.
                expression.push("var pts = " + pointsText(shape.vertices) + ";");
                expression.push("var inT = " + pointsText(shape.inTangents) + ";");
                expression.push("var outT = " + pointsText(shape.outTangents) + ";");
                expression.push("var isClosed = " + (shape.closed ? "true" : "false") + ";");
                for (var n = 0; n < nullNames.length; n++) {
                    expression.push(
                        'var ctrl' + n + ' = thisComp.layer("' + esc(nullNames[n]) + '");'
                    );
                    expression.push(
                        'var local' + n + ' = fromCompToSurface(ctrl' + n + '.toComp(ctrl' + n + '.anchorPoint));'
                    );
                    expression.push('pts[' + n + '] = [local' + n + '[0], local' + n + '[1]];');
                }
                expression.push("createPath(pts, inT, outT, isClosed);");
                pathProp.expression = expression.join("\n");
                if (pathProp.expressionError && pathProp.expressionError !== "") {
                    expressionErrors.push(
                        layer.name + " / " + pathProp.name + ":\n" + pathProp.expressionError
                    );
                    pathProp.expression = "";
                } else {
                    linkedPaths++;
                }
            }
        }

        if (linkedPaths === 0) {
            if (expressionErrors.length > 0) {
                throw new Error(
                    "パスの式を適用できなかったため、元の形状へ戻しました。\n\n" +
                    expressionErrors.join("\n\n")
                );
            }
            throw new Error("選択中のシェイプパスが見つかりませんでした。タイムラインで「パス」プロパティを選択してください。");
        }

        var message = linkedPaths + " 個のパスを " + madeNulls + " 個のヌルに紐づけました。";
        if (skipped.length > 0) {
            message += "\n\n処理できなかったパス:\n" + skipped.join("\n");
        }
        if (expressionErrors.length > 0) {
            message += "\n\n式エラーのため元に戻したパス:\n" + expressionErrors.join("\n\n");
        }
        alert(message);
    } catch (err) {
        alert("Nulls From Selected Shape Paths\n\n" + err.message);
    } finally {
        app.endUndoGroup();
    }
})();
