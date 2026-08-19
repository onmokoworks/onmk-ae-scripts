(function initializeOnmkPresets() {
    if (!$._onmkPresets) { $._onmkPresets = {}; }
    var api = $._onmkPresets;
    var SECTION = "onmk Animation Preset Library";
    var KEY = "libraryFolder";

    function library() {
        try {
            if (app.settings.haveSetting(SECTION, KEY)) {
                var folder = new Folder(app.settings.getSetting(SECTION, KEY));
                if (folder.exists) { return folder; }
            }
        } catch (error) {}
        return null;
    }
    function jsonEscape(text) {
        return String(text).replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\r/g, "\\r").replace(/\n/g, "\\n");
    }
    function fileUrl(file) {
        var path = file.fsName.replace(/\\/g, "/");
        if (path.charAt(0) !== "/") { path = "/" + path; }
        return "file://" + encodeURI(path);
    }
    function collect(folder, root, output) {
        var entries = folder.getFiles();
        for (var i = 0; i < entries.length; i++) {
            if (entries[i] instanceof Folder) { collect(entries[i], root, output); }
            else if (entries[i] instanceof File && /\.(ffx|aep)$/i.test(entries[i].name)) {
                var kind = /\.aep$/i.test(entries[i].name) ? "aep" : "ffx";
                var relative = entries[i].fsName.substring(root.fsName.length).replace(/^[\\\/]+/, "").replace(/\.(ffx|aep)$/i, "").replace(/\\/g, "/");
                var png = new File(entries[i].parent.fsName + "/" + entries[i].name.replace(/\.(ffx|aep)$/i, ".png"));
                output.push({
                    name: relative,
                    path: entries[i].fsName,
                    kind: kind,
                    thumbnail: png.exists ? fileUrl(png) : "",
                    stamp: png.exists ? png.modified.getTime() : 0
                });
            }
        }
    }
    function selectPresetContent(layer) {
        var selectedCount = 0;

        function selectProperty(property) {
            try {
                property.selected = true;
                selectedCount++;
            } catch (error) {}
        }

        function walk(group, insideEffect) {
            for (var i = 1; i <= group.numProperties; i++) {
                var property = group.property(i);
                if (property.propertyType === PropertyType.PROPERTY) {
                    var hasExpression = false;
                    try { hasExpression = property.canSetExpression && property.expressionEnabled; }
                    catch (expressionError) {}
                    if (insideEffect || property.numKeys > 0 || hasExpression) {
                        selectProperty(property);
                    }
                } else {
                    var isEffect = property.parentProperty &&
                        property.parentProperty.matchName === "ADBE Effect Parade";
                    if (isEffect) {
                        // Selecting the effect group preserves the complete effect,
                        // including parameters that have no keyframes.
                        selectProperty(property);
                        walk(property, true);
                    } else {
                        walk(property, insideEffect);
                    }
                }
            }
        }

        walk(layer, false);
        return selectedCount;
    }
    api.getLibrary = function() { var folder = library(); return folder ? folder.fsName : ""; };
    api.chooseLibrary = function() {
        var chosen = Folder.selectDialog("FFXライブラリフォルダを選択", library());
        if (!chosen) { return api.getLibrary(); }
        app.settings.saveSetting(SECTION, KEY, chosen.fsName);
        return chosen.fsName;
    };
    api.revealLibrary = function() { var folder = library(); if (folder) { folder.execute(); } return ""; };
    api.deletePreset = function(path) {
        var folder = library();
        if (!folder) { return "Library folder not found"; }
        var preset = new File(path);
        var libraryPath = folder.fsName.replace(/\\/g, "/");
        var presetPath = preset.fsName.replace(/\\/g, "/");
        if (presetPath.indexOf(libraryPath + "/") !== 0 || !/\.(ffx|aep)$/i.test(preset.name)) {
            return "Refused: preset is outside the library";
        }
        if (!preset.exists) { return "Preset not found"; }
        var thumbnail = new File(preset.parent.fsName + "/" + preset.name.replace(/\.(ffx|aep)$/i, ".png"));
        var presetName = preset.displayName;
        if (!preset.remove()) { return "Could not delete " + presetName; }
        if (thumbnail.exists) { thumbnail.remove(); }
        return "Deleted " + presetName;
    };
    api.listPresets = function() {
        var folder = library(), items = [];
        if (folder) { collect(folder, folder, items); }
        items.sort(function(a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
        var parts = [];
        for (var i = 0; i < items.length; i++) {
            parts.push('{"name":"' + jsonEscape(items[i].name) + '","path":"' + jsonEscape(items[i].path) + '","kind":"' + items[i].kind + '","thumbnail":"' + jsonEscape(items[i].thumbnail) + '","stamp":' + items[i].stamp + '}');
        }
        return "[" + parts.join(",") + "]";
    };
    api.applyPreset = function(path) {
        var file = new File(path);
        if (!file.exists) { return "Preset not found"; }
        if (/\.aep$/i.test(file.name)) {
            app.beginUndoGroup("Import AEP Template");
            try {
                app.project.importFile(new ImportOptions(file));
                return "Imported " + file.displayName;
            } catch (importError) {
                return "Error: " + importError.message;
            } finally {
                app.endUndoGroup();
            }
        }

        var comp = app.project && app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) { return "Open a composition"; }
        var target = comp.selectedLayers.length > 0 ? comp.selectedLayers[0] : null;
        var createdSolid = null;
        app.beginUndoGroup("Apply Animation Preset");
        try {
            if (!target) {
                createdSolid = comp.layers.addSolid(
                    [1, 1, 1],
                    file.displayName.replace(/\.ffx$/i, ""),
                    comp.width,
                    comp.height,
                    comp.pixelAspect,
                    comp.duration
                );
                target = createdSolid;
            }
            target.applyPreset(file);
            return createdSolid ?
                "Applied " + file.displayName + " to a new solid" :
                "Applied " + file.displayName;
        } catch (error) {
            if (createdSolid) { try { createdSolid.remove(); } catch (removeError) {} }
            return "Error: " + error.message;
        }
        finally { app.endUndoGroup(); }
    };
    api.captureThumbnail = function(path) {
        var comp = app.project && app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) { return "Open a composition"; }
        var preset = new File(path);
        var png = new File(preset.parent.fsName + "/" + preset.name.replace(/\.(ffx|aep)$/i, ".png"));
        var selectedLayers = comp.selectedLayers;
        var useLayerIsolation = selectedLayers && selectedLayers.length > 0;
        var selectedIndexes = {};
        var queue = app.project.renderQueue;
        var queueStates = [];
        var renderComp = null;
        var renderItem = null;

        function findPngTemplate(outputModule) {
            var templates = outputModule.templates;
            for (var templateIndex = 0; templateIndex < templates.length; templateIndex++) {
                try {
                    outputModule.applyTemplate(templates[templateIndex]);
                    outputModule = renderItem.outputModule(1);
                    var settings = outputModule.getSettings(GetSettingsFormat.STRING);
                    if (/PNG/i.test(settings.Format) && /Alpha/i.test(settings.Channels)) {
                        return templates[templateIndex];
                    }
                } catch (templateError) {}
            }
            return null;
        }

        try {
            for (var queueIndex = 1; queueIndex <= queue.numItems; queueIndex++) {
                queueStates.push(queue.item(queueIndex).render);
                queue.item(queueIndex).render = false;
            }

            renderComp = comp.duplicate();
            renderComp.name = "__onmk_preset_thumbnail__";
            if (useLayerIsolation) {
                for (var selectedIndex = 0; selectedIndex < selectedLayers.length; selectedIndex++) {
                    selectedIndexes[String(selectedLayers[selectedIndex].index)] = true;
                }
                for (var layerIndex = 1; layerIndex <= renderComp.numLayers; layerIndex++) {
                    var copiedLayer = renderComp.layer(layerIndex);
                    var keepVisible = selectedIndexes[String(layerIndex)] ||
                        copiedLayer instanceof CameraLayer || copiedLayer instanceof LightLayer;
                    if (!keepVisible) {
                        try { copiedLayer.enabled = false; } catch (visibilityError) {}
                    }
                    try { copiedLayer.solo = false; } catch (soloError) {}
                }
            }

            // Remove the previous thumbnail and any unfinished sequence frame
            // with the same basename before rendering the replacement.
            var siblings = png.parent.getFiles(png.name + "*");
            for (var siblingIndex = 0; siblingIndex < siblings.length; siblingIndex++) {
                if (siblings[siblingIndex] instanceof File) { siblings[siblingIndex].remove(); }
            }

            renderItem = queue.items.add(renderComp);
            renderItem.timeSpanStart = comp.time;
            renderItem.timeSpanDuration = comp.frameDuration;
            var outputModule = renderItem.outputModule(1);
            var pngTemplate = findPngTemplate(outputModule);
            if (!pngTemplate) { throw new Error("PNG + Alpha output template not found"); }
            outputModule = renderItem.outputModule(1);
            outputModule.applyTemplate(pngTemplate);
            outputModule = renderItem.outputModule(1);
            outputModule.file = png;
            queue.render();

            var renderedFrames = png.parent.getFiles(png.name + "*");
            var renderedFile = null;
            for (var frameIndex = 0; frameIndex < renderedFrames.length; frameIndex++) {
                if (renderedFrames[frameIndex] instanceof File && renderedFrames[frameIndex].fsName !== png.fsName) {
                    renderedFile = renderedFrames[frameIndex];
                    break;
                }
            }
            if (!renderedFile || !renderedFile.exists) { throw new Error("Rendered PNG frame was not found"); }
            if (!renderedFile.rename(png.name)) { throw new Error("Rendered PNG could not be renamed"); }
            return useLayerIsolation ? "Captured selected layer" : "Captured composition";
        } catch (error) {
            return "Error: " + error.message;
        } finally {
            if (renderItem) { try { renderItem.remove(); } catch (removeQueueError) {} }
            if (renderComp) { try { renderComp.remove(); } catch (removeCompError) {} }
            for (var restoreIndex = 1; restoreIndex <= queueStates.length; restoreIndex++) {
                try { queue.item(restoreIndex).render = queueStates[restoreIndex - 1]; }
                catch (restoreError) {}
            }
        }
    };
    api.saveSelected = function() {
        var folder = library();
        if (!folder) { return "Choose a library folder"; }
        var comp = app.project && app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) { return "Open a composition"; }

        var autoSelected = false;
        if (comp.selectedProperties.length === 0) {
            if (comp.selectedLayers.length !== 1) {
                return "Select properties, or select one layer";
            }
            autoSelected = selectPresetContent(comp.selectedLayers[0]) > 0;
            if (!autoSelected) { return "The selected layer has no effects, keyframes, or expressions"; }
        }
        var names = ["Save Animation Preset...", "Save Animation Preset…", "アニメーションプリセットを保存...", "アニメーションプリセットを保存…"];
        var commandId = 0;
        for (var i = 0; i < names.length; i++) { commandId = app.findMenuCommandId(names[i]); if (commandId > 0) { break; } }
        if (!commandId) { return "Save Animation Preset command not found"; }
        var previous = Folder.current;
        try { Folder.current = folder; app.executeCommand(commandId); return "Save dialog closed"; }
        catch (error) { return "Error: " + error.message; }
        finally {
            Folder.current = previous;
            if (autoSelected) {
                var selectedProperties = comp.selectedProperties;
                for (var selectedIndex = 0; selectedIndex < selectedProperties.length; selectedIndex++) {
                    try { selectedProperties[selectedIndex].selected = false; }
                    catch (selectionError) {}
                }
            }
        }
    };
    api.saveProjectCopy = function() {
        var folder = library();
        if (!folder) { return "Choose a library folder"; }
        if (!app.project || !app.project.file) { return "Save the current AEP first"; }

        try {
            app.project.save();
            var source = app.project.file;
            var suggested = new File(folder.fsName + "/" + source.name);
            var destination = suggested.saveDlg("Save AEP template", "After Effects Project:*.aep");
            if (!destination) { return "Canceled"; }
            if (!/\.aep$/i.test(destination.name)) {
                destination = new File(destination.fsName + ".aep");
            }
            if (destination.fsName === source.fsName) { return "Choose a different file name"; }
            if (!source.copy(destination.fsName)) { return "Could not copy the AEP"; }
            return "Saved " + destination.displayName;
        } catch (error) {
            return "Error: " + error.message;
        }
    };
}());
