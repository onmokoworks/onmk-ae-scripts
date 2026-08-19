#target aftereffects

(function addSliderControl() {
    var scriptName = "Add Slider Control";
    var comp = app.project ? app.project.activeItem : null;

    if (!(comp instanceof CompItem)) {
        alert("コンポジションを開いて、数値プロパティを選択してください。", scriptName);
        return;
    }

    function escapeExpressionString(value) {
        return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    }

    function uniqueEffectName(effects, baseName) {
        var name = baseName + " Control";
        var index = 2;
        while (effects.property(name) !== null) {
            name = baseName + " Control " + index;
            index++;
        }
        return name;
    }

    function propertyIndexPath(layer, property) {
        var path = [];
        var current = property;
        while (current && current !== layer) {
            path.unshift(current.propertyIndex);
            current = current.parentProperty;
        }
        return path;
    }

    function resolveProperty(layer, path) {
        var property = layer;
        for (var i = 0; i < path.length; i++) {
            property = property.property(path[i]);
            if (!property) return null;
        }
        return property;
    }

    function snapshotKey(property, keyIndex) {
        var key = {
            time: property.keyTime(keyIndex),
            value: property.keyValue(keyIndex)
        };
        try {
            key.inInterpolationType = property.keyInInterpolationType(keyIndex);
            key.outInterpolationType = property.keyOutInterpolationType(keyIndex);
        } catch (ignoreInterpolation) {}
        try {
            key.inTemporalEase = property.keyInTemporalEase(keyIndex);
            key.outTemporalEase = property.keyOutTemporalEase(keyIndex);
        } catch (ignoreEase) {}
        try {
            key.temporalContinuous = property.keyTemporalContinuous(keyIndex);
        } catch (ignoreContinuous) {}
        try {
            key.temporalAutoBezier = property.keyTemporalAutoBezier(keyIndex);
        } catch (ignoreAutoBezier) {}
        return key;
    }

    function applyKeyAttributes(key, destination, keyIndex) {
        try {
            if (key.inInterpolationType !== undefined) {
                destination.setInterpolationTypeAtKey(
                    keyIndex,
                    key.inInterpolationType,
                    key.outInterpolationType
                );
            }
        } catch (ignoreInterpolation) {}
        try {
            if (key.inTemporalEase !== undefined) {
                destination.setTemporalEaseAtKey(
                    keyIndex,
                    key.inTemporalEase,
                    key.outTemporalEase
                );
            }
        } catch (ignoreEase) {}
        try {
            if (key.temporalContinuous !== undefined) {
                destination.setTemporalContinuousAtKey(keyIndex, key.temporalContinuous);
            }
        } catch (ignoreContinuous) {}
        try {
            if (key.temporalAutoBezier !== undefined) {
                destination.setTemporalAutoBezierAtKey(keyIndex, key.temporalAutoBezier);
            }
        } catch (ignoreAutoBezier) {}
    }

    function snapshotProperty(layer, property) {
        var snapshot = {
            layer: layer,
            path: propertyIndexPath(layer, property),
            name: property.name,
            value: property.valueAtTime(comp.time, false),
            keys: []
        };
        for (var i = 1; i <= property.numKeys; i++) {
            snapshot.keys.push(snapshotKey(property, i));
        }
        return snapshot;
    }

    function selectedNumericProperties(layer) {
        var result = [];
        var selected = layer.selectedProperties;
        for (var i = 0; i < selected.length; i++) {
            var property = selected[i];
            if (property.propertyType !== PropertyType.PROPERTY) continue;
            if (property.propertyValueType !== PropertyValueType.OneD) continue;
            if (!property.canSetExpression) continue;
            result.push(property);
        }
        return result;
    }

    var jobs = [];
    var layers = comp.selectedLayers;
    var i;
    var j;
    for (i = 0; i < layers.length; i++) {
        var properties = selectedNumericProperties(layers[i]);
        for (j = 0; j < properties.length; j++) {
            if (!properties[j].expressionEnabled) {
                jobs.push(snapshotProperty(layers[i], properties[j]));
            }
        }
    }

    if (jobs.length === 0) {
        alert("式のない数値プロパティを1つ以上選択してください。", scriptName);
        return;
    }

    app.beginUndoGroup(scriptName);
    try {
        for (i = 0; i < jobs.length; i++) {
            var effects = jobs[i].layer.property("ADBE Effect Parade");
            var controllerName = uniqueEffectName(effects, jobs[i].name);
            var effect = effects.addProperty("ADBE Slider Control");
            effect.name = controllerName;

            var slider = effect.property("ADBE Slider Control-0001");
            if (jobs[i].keys.length > 0) {
                for (j = 0; j < jobs[i].keys.length; j++) {
                    slider.setValueAtTime(jobs[i].keys[j].time, jobs[i].keys[j].value);
                    applyKeyAttributes(jobs[i].keys[j], slider, j + 1);
                }
            } else {
                slider.setValue(jobs[i].value);
            }

            // Adding an effect can invalidate every Property reference on the
            // layer, so resolve the source again from its saved index path.
            var source = resolveProperty(jobs[i].layer, jobs[i].path);
            if (!source) throw new Error(jobs[i].name + "を再取得できませんでした。");
            source.expression = 'effect("' + escapeExpressionString(effect.name) + '")(1).value;';
            source.expressionEnabled = true;
            if (source.expressionError && source.expressionError !== "") {
                throw new Error(jobs[i].name + ":\n" + source.expressionError);
            }
        }
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
