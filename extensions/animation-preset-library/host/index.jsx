(function initializeOnmkPresets() {
    if (!$._onmkPresets) { $._onmkPresets = {}; }
    var api = $._onmkPresets;
    var SECTION = "onmk Animation Preset Library";
    var KEY = "libraryFolder";
    var THEME_KEY = "themeColor";
    var FOLDER_FFX = "Animation Presets";
    var FOLDER_COMPS = "Composition Templates";
    var FOLDER_PROJECTS = "Project Templates";

    function library() {
        try {
            if (app.settings.haveSetting(SECTION, KEY)) {
                var folder = new Folder(app.settings.getSetting(SECTION, KEY));
                if (folder.exists) { return folder; }
            }
        } catch (error) {}
        return null;
    }
    function categoryFolder(name) {
        var root = library();
        if (!root) { return null; }
        var folder = new Folder(root.fsName + "/" + name);
        if (!folder.exists && !folder.create()) { return root; }
        return folder;
    }
    function ensureCategoryFolders() {
        categoryFolder(FOLDER_FFX);
        categoryFolder(FOLDER_COMPS);
        categoryFolder(FOLDER_PROJECTS);
    }
    function projectBookmarkKey() {
        if (!app.project || !app.project.file) { return ""; }
        var text = app.project.file.fsName.toLowerCase();
        var hash = 2166136261;
        for (var i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return "compBookmarks_" + (hash >>> 0).toString(16);
    }
    function readBookmarkIds() {
        var key = projectBookmarkKey();
        if (!key) { return []; }
        try {
            if (app.settings.haveSetting(SECTION, key)) {
                var raw = app.settings.getSetting(SECTION, key);
                if (!raw) { return []; }
                var values = raw.split(",");
                var ids = [];
                for (var i = 0; i < values.length; i++) {
                    var id = parseInt(values[i], 10);
                    if (!isNaN(id)) { ids.push(id); }
                }
                return ids;
            }
        } catch (error) {}
        return [];
    }
    function writeBookmarkIds(ids) {
        var key = projectBookmarkKey();
        if (!key) { return false; }
        app.settings.saveSetting(SECTION, key, ids.join(","));
        return true;
    }
    function findCompById(id) {
        if (!app.project) { return null; }
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.id === id) { return item; }
        }
        return null;
    }
    function bookmarkCacheFolder() {
        var key = projectBookmarkKey();
        if (!key) { return null; }
        var root = new Folder(Folder.userData.fsName + "/onmk/Comp Bookmarks");
        if (!root.exists) { root.create(); }
        var folder = new Folder(root.fsName + "/" + key);
        if (!folder.exists) { folder.create(); }
        return folder;
    }
    function bookmarkThumbnail(id) {
        var folder = bookmarkCacheFolder();
        return folder ? new File(folder.fsName + "/" + id + ".png") : null;
    }
    function jsonEscape(text) {
        return String(text).replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\r/g, "\\r").replace(/\n/g, "\\n");
    }
    function fileUrl(file) {
        var path = file.fsName.replace(/\\/g, "/");
        var parts, encoded = [], i;
        if (path.indexOf("//") === 0) {
            parts = path.substring(2).split("/");
            for (i = 0; i < parts.length; i++) { encoded.push(encodeURIComponent(parts[i])); }
            return "file://" + encoded.join("/");
        }
        if (/^[A-Za-z]:\//.test(path)) {
            parts = path.substring(3).split("/");
            for (i = 0; i < parts.length; i++) { encoded.push(encodeURIComponent(parts[i])); }
            return "file:///" + path.substring(0, 2) + "/" + encoded.join("/");
        }
        parts = path.replace(/^\/+/, "").split("/");
        for (i = 0; i < parts.length; i++) { encoded.push(encodeURIComponent(parts[i])); }
        return "file:///" + encoded.join("/");
    }
    function findPngTemplate(renderItem) {
        var outputModule = renderItem.outputModule(1);
        var templates = outputModule.templates;
        var pngFallback = null;
        for (var i = 0; i < templates.length; i++) {
            try {
                outputModule.applyTemplate(templates[i]);
                outputModule = renderItem.outputModule(1);
                var settings = outputModule.getSettings(GetSettingsFormat.STRING);
                if (/PNG/i.test(settings.Format)) {
                    if (!pngFallback) { pngFallback = templates[i]; }
                    if (/(Alpha|アルファ|RGBA)/i.test(settings.Channels || "")) { return templates[i]; }
                }
            } catch (error) {}
        }
        return pngFallback;
    }
    function temporaryThumbnail(prefix) {
        var folder = new Folder(Folder.temp.fsName + "/onmk-animation-presets");
        if (!folder.exists && !folder.create()) { throw new Error("Could not create thumbnail temp folder"); }
        return new File(folder.fsName + "/" + prefix + "_" + new Date().getTime() + ".png");
    }
    function removeOutputFamily(file) {
        var siblings = file.parent.getFiles(file.name + "*");
        for (var i = 0; i < siblings.length; i++) {
            if (siblings[i] instanceof File) { try { siblings[i].remove(); } catch (error) {} }
        }
    }
    function renderedFrame(file) {
        if (file.exists) { return file; }
        var candidates = file.parent.getFiles(file.name + "*");
        for (var i = 0; i < candidates.length; i++) {
            if (candidates[i] instanceof File && candidates[i].exists) { return candidates[i]; }
        }
        return null;
    }
    function publishThumbnail(rendered, destination) {
        if (!rendered || !rendered.exists) { throw new Error("Rendered PNG frame was not found"); }
        removeOutputFamily(destination);
        if (!rendered.copy(destination.fsName) || !destination.exists) {
            throw new Error("Rendered PNG could not be copied to " + destination.fsName);
        }
    }
    function collect(folder, root, output) {
        var entries = folder.getFiles();
        for (var i = 0; i < entries.length; i++) {
            if (entries[i] instanceof Folder) { collect(entries[i], root, output); }
            else if (entries[i] instanceof File && /\.(ffx|aep)$/i.test(entries[i].name)) {
                var kind = /\.aep$/i.test(entries[i].name) ? "aep" : "ffx";
                var relative = entries[i].fsName.substring(root.fsName.length).replace(/^[\\\/]+/, "").replace(/\.(ffx|aep)$/i, "").replace(/\\/g, "/");
                if (relative.indexOf(FOLDER_COMPS + "/") === 0) { kind = "comp"; }
                var displayName = relative.replace(new RegExp("^(" + FOLDER_FFX + "|" + FOLDER_COMPS + "|" + FOLDER_PROJECTS + ")/"), "");
                var png = new File(entries[i].parent.fsName + "/" + entries[i].name.replace(/\.(ffx|aep)$/i, ".png"));
                output.push({
                    name: displayName,
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
    api.getTheme = function() {
        try {
            if (app.settings.haveSetting(SECTION, THEME_KEY)) {
                var color = app.settings.getSetting(SECTION, THEME_KEY);
                if (/^#[0-9a-f]{6}$/i.test(color)) { return color; }
            }
        } catch (error) {}
        return "#9b63d5";
    };
    api.setTheme = function(color) {
        if (/^#[0-9a-f]{6}$/i.test(color)) {
            app.settings.saveSetting(SECTION, THEME_KEY, color);
        }
        return api.getTheme();
    };
    api.listCompBookmarks = function() {
        if (!app.project || !app.project.file) {
            return '{"error":"Save the AEP to use bookmarks","items":[]}';
        }
        var ids = readBookmarkIds();
        var validIds = [];
        var parts = [];
        for (var i = 0; i < ids.length; i++) {
            var comp = findCompById(ids[i]);
            if (!comp) { continue; }
            validIds.push(ids[i]);
            var png = bookmarkThumbnail(ids[i]);
            parts.push('{"id":' + ids[i] +
                ',"name":"' + jsonEscape(comp.name) +
                '","width":' + comp.width +
                ',"height":' + comp.height +
                ',"fps":' + comp.frameRate +
                ',"duration":' + comp.duration +
                ',"thumbnail":"' + (png && png.exists ? jsonEscape(fileUrl(png)) : "") +
                '","stamp":' + (png && png.exists ? png.modified.getTime() : 0) + '}');
        }
        if (validIds.length !== ids.length) { writeBookmarkIds(validIds); }
        return '{"error":"","items":[' + parts.join(",") + ']}';
    };
    api.addActiveCompBookmark = function() {
        if (!app.project || !app.project.file) { return "Save the AEP first"; }
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) { return "Open a composition first"; }
        var ids = readBookmarkIds();
        for (var i = 0; i < ids.length; i++) {
            if (ids[i] === comp.id) { return "Already bookmarked " + comp.name; }
        }
        ids.push(comp.id);
        writeBookmarkIds(ids);
        return "Bookmarked " + comp.name;
    };
    api.removeCompBookmark = function(idText) {
        var id = parseInt(idText, 10);
        var ids = readBookmarkIds();
        var kept = [];
        for (var i = 0; i < ids.length; i++) {
            if (ids[i] !== id) { kept.push(ids[i]); }
        }
        writeBookmarkIds(kept);
        var png = bookmarkThumbnail(id);
        if (png && png.exists) { png.remove(); }
        return "Bookmark removed";
    };
    api.openCompBookmark = function(idText) {
        var comp = findCompById(parseInt(idText, 10));
        if (!comp) { return "Composition not found"; }
        comp.openInViewer();
        return "Opened " + comp.name;
    };
    api.captureCompBookmark = function(idText) {
        var comp = findCompById(parseInt(idText, 10));
        if (!comp) { return "Composition not found"; }
        var png = bookmarkThumbnail(comp.id);
        if (!png) { return "Save the AEP first"; }
        var queue = app.project.renderQueue;
        var queueStates = [];
        var renderComp = null;
        var renderItem = null;
        var tempPng = null;

        try {
            for (var queueIndex = 1; queueIndex <= queue.numItems; queueIndex++) {
                queueStates.push(queue.item(queueIndex).render);
                queue.item(queueIndex).render = false;
            }
            renderComp = comp.duplicate();
            renderComp.name = "__onmk_comp_bookmark_thumbnail__";
            tempPng = temporaryThumbnail("bookmark_" + comp.id);
            removeOutputFamily(tempPng);
            renderItem = queue.items.add(renderComp);
            renderItem.timeSpanStart = comp.time;
            renderItem.timeSpanDuration = comp.frameDuration;
            var template = findPngTemplate(renderItem);
            if (!template) { throw new Error("PNG output module template not found. Create a PNG output module template in After Effects and try again."); }
            var outputModule = renderItem.outputModule(1);
            outputModule.applyTemplate(template);
            outputModule = renderItem.outputModule(1);
            outputModule.file = tempPng;
            queue.render();
            publishThumbnail(renderedFrame(tempPng), png);
            removeOutputFamily(tempPng);
            return "Captured " + comp.name;
        } catch (error) {
            return "Error: " + error.message;
        } finally {
            if (tempPng) { removeOutputFamily(tempPng); }
            if (renderItem) { try { renderItem.remove(); } catch (removeQueueError) {} }
            if (renderComp) { try { renderComp.remove(); } catch (removeCompError) {} }
            for (var restoreIndex = 1; restoreIndex <= queueStates.length; restoreIndex++) {
                try { queue.item(restoreIndex).render = queueStates[restoreIndex - 1]; }
                catch (restoreError) {}
            }
        }
    };
    api.chooseLibrary = function() {
        var chosen = Folder.selectDialog("FFXライブラリフォルダを選択", library());
        if (!chosen) { return api.getLibrary(); }
        app.settings.saveSetting(SECTION, KEY, chosen.fsName);
        ensureCategoryFolders();
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
        var tempPng = null;

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

            tempPng = temporaryThumbnail("preset");
            removeOutputFamily(tempPng);
            renderItem = queue.items.add(renderComp);
            renderItem.timeSpanStart = comp.time;
            renderItem.timeSpanDuration = comp.frameDuration;
            var pngTemplate = findPngTemplate(renderItem);
            if (!pngTemplate) { throw new Error("PNG output module template not found. Create a PNG output module template in After Effects and try again."); }
            var outputModule = renderItem.outputModule(1);
            outputModule.applyTemplate(pngTemplate);
            outputModule = renderItem.outputModule(1);
            outputModule.file = tempPng;
            queue.render();
            publishThumbnail(renderedFrame(tempPng), png);
            removeOutputFamily(tempPng);
            return useLayerIsolation ? "Captured selected layer" : "Captured composition";
        } catch (error) {
            return "Error: " + error.message;
        } finally {
            if (tempPng) { removeOutputFamily(tempPng); }
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
        var presetFolder = categoryFolder(FOLDER_FFX);
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
        try { Folder.current = presetFolder; app.executeCommand(commandId); return "Save dialog closed"; }
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
        var projectFolder = categoryFolder(FOLDER_PROJECTS);
        if (!app.project || !app.project.file) { return "Save the current AEP first"; }

        try {
            app.project.save();
            var source = app.project.file;
            var suggested = new File(projectFolder.fsName + "/" + source.name);
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
    api.saveActiveCompTemplate = function() {
        var folder = library();
        if (!folder) { return "Choose a library folder"; }
        var compFolder = categoryFolder(FOLDER_COMPS);
        var sourceProject = app.project;
        var sourceComp = sourceProject && sourceProject.activeItem;
        if (!sourceProject || !sourceProject.file) { return "Save the current AEP first"; }
        if (!sourceComp || !(sourceComp instanceof CompItem)) { return "Open the composition to save"; }

        var sourceFile = new File(sourceProject.file.fsName);
        var sourceComment = sourceComp.comment;
        var marker = "__ONMK_COMP_TEMPLATE_" + new Date().getTime() + "__";
        var suggested = new File(compFolder.fsName + "/" + sourceComp.name.replace(/[\\\/:*?\"<>|]/g, "_") + ".aep");
        var destination = suggested.saveDlg("Save composition template", "After Effects Project:*.aep");
        if (!destination) { return "Canceled"; }
        if (!/\.aep$/i.test(destination.name)) {
            destination = new File(destination.fsName + ".aep");
        }
        if (destination.fsName === sourceFile.fsName) { return "Choose a different file name"; }

        function findMarkedComp() {
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem && item.comment === marker) { return item; }
            }
            return null;
        }

        function restoreSourceProject() {
            var currentFile = app.project && app.project.file;
            if (!currentFile || currentFile.fsName !== sourceFile.fsName) {
                if (app.project) { app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES); }
                app.open(sourceFile);
            }
            var originalComp = findMarkedComp();
            if (originalComp) {
                originalComp.comment = sourceComment;
                app.project.save();
                originalComp.openInViewer();
            }
        }

        try {
            sourceComp.comment = marker;
            sourceProject.save();
            sourceProject.close(CloseOptions.DO_NOT_SAVE_CHANGES);
            if (!app.newProject()) { throw new Error("Could not create the template project"); }

            app.project.importFile(new ImportOptions(sourceFile));
            var templateComp = findMarkedComp();
            if (!templateComp) { throw new Error("Could not find the source composition"); }
            app.project.reduceProject([templateComp]);
            templateComp.comment = sourceComment;
            app.project.save(destination);
            restoreSourceProject();
            return "Saved comp template " + destination.displayName;
        } catch (error) {
            try { restoreSourceProject(); }
            catch (restoreError) {
                return "Error: " + error.message + " / Reopen the source AEP: " + sourceFile.fsName;
            }
            return "Error: " + error.message;
        }
    };
}());
