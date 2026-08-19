/*
    Duplicate Comp Hierarchy

    Duplicates selected project-panel compositions, or the active composition
    when no composition is selected. Descendant compositions are duplicated
    recursively and relinked so the copied hierarchy is independent.
    Footage and other non-composition sources remain shared.
*/
(function duplicateCompHierarchy() {
    var SCRIPT_NAME = "Duplicate Comp Hierarchy";
    var project = app.project;

    if (!project) {
        alert("プロジェクトを開いてください。", SCRIPT_NAME);
        return;
    }

    function getRootComps() {
        var roots = [];
        var selectedItems = project.selection;
        var i;

        if (selectedItems) {
            for (i = 0; i < selectedItems.length; i++) {
                if (selectedItems[i] instanceof CompItem) {
                    roots.push(selectedItems[i]);
                }
            }
        }

        if (roots.length === 0 && project.activeItem instanceof CompItem) {
            roots.push(project.activeItem);
        }
        return roots;
    }

    function itemNameExists(name) {
        for (var i = 1; i <= project.numItems; i++) {
            if (project.item(i).name === name) { return true; }
        }
        return false;
    }

    function uniqueItemName(baseName) {
        if (!itemNameExists(baseName)) { return baseName; }
        var number = 2;
        while (itemNameExists(baseName + " " + number)) { number++; }
        return baseName + " " + number;
    }

    function uniqueFolderName(baseName) {
        return uniqueItemName(baseName);
    }

    var roots = getRootComps();
    if (roots.length === 0) {
        alert("プロジェクトパネルでコンポを選択するか、コンポを開いてください。", SCRIPT_NAME);
        return;
    }

    app.beginUndoGroup(SCRIPT_NAME);

    try {
        var folderBase = roots.length === 1 ? roots[0].name + " Copy" : "Duplicated Comps";
        var destinationFolder = project.items.addFolder(uniqueFolderName(folderBase));
        var compMap = {};
        var rootCopies = [];

        function duplicateComp(sourceComp) {
            var key = String(sourceComp.id);
            if (compMap[key]) { return compMap[key]; }

            // Register before walking children so cyclic comp references are safe.
            var copy = sourceComp.duplicate();
            compMap[key] = copy;
            copy.name = uniqueItemName(sourceComp.name + " Copy");
            copy.parentFolder = destinationFolder;

            for (var layerIndex = 1; layerIndex <= copy.numLayers; layerIndex++) {
                var layer = copy.layer(layerIndex);
                var source = null;
                try { source = layer.source; } catch (sourceError) {}

                if (source && source instanceof CompItem) {
                    var childCopy = duplicateComp(source);
                    try {
                        layer.replaceSource(childCopy, true);
                    } catch (replaceError) {
                        layer.replaceSource(childCopy, false);
                    }
                }
            }
            return copy;
        }

        for (var rootIndex = 0; rootIndex < roots.length; rootIndex++) {
            rootCopies.push(duplicateComp(roots[rootIndex]));
        }

        // Leave the new root compositions selected for immediate use.
        for (var itemIndex = 1; itemIndex <= project.numItems; itemIndex++) {
            try { project.item(itemIndex).selected = false; } catch (deselectError) {}
        }
        for (var copyIndex = 0; copyIndex < rootCopies.length; copyIndex++) {
            rootCopies[copyIndex].selected = true;
        }
    } catch (error) {
        alert("コンポ階層を複製できませんでした。\n" + error.message, SCRIPT_NAME);
    } finally {
        app.endUndoGroup();
    }
}());
