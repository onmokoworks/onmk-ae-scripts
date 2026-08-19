// AE Purge All Caches - ScriptUI Panel
(function purgeAllCachesPanel(thisObj) {
    function buildUI(host) {
        var panel = (host instanceof Panel) ?
            host : new Window("palette", "Purge All Caches", undefined, { resizeable: true });

        panel.orientation = "column";
        panel.alignChildren = ["fill", "top"];
        panel.spacing = 8;
        panel.margins = 12;

        var btnAll = panel.add("button", undefined, "ALL CACHES 全消去");
        btnAll.preferredSize = [200, 40];
        btnAll.helpTip = "RAM + Disk + Undo + Snapshot 全て消去";

        var individual = panel.add("group");
        individual.orientation = "column";
        individual.alignChildren = ["fill", "top"];
        individual.spacing = 4;

        var btnMemory = individual.add("button", undefined, "RAM Cache");
        btnMemory.helpTip = "メモリキャッシュのみ消去";
        var btnDisk = individual.add("button", undefined, "Disk Cache");
        btnDisk.helpTip = "ディスクキャッシュフォルダを消去";
        var btnUndo = individual.add("button", undefined, "Undo Cache");
        btnUndo.helpTip = "取り消し履歴を消去";
        var btnSnapshot = individual.add("button", undefined, "Snapshot Cache");
        btnSnapshot.helpTip = "スナップショットを消去";

        var statusText = panel.add("statictext", undefined, "Ready");
        statusText.alignment = ["fill", "bottom"];

        function getDiskCachePath() {
            var cachePath;
            try {
                cachePath = app.preferences.getPrefAsString(
                    "Media Cache", "Folder Path", PREFType.PREF_Type_MACHINE_INDEPENDENT
                );
                if (cachePath) { return cachePath; }
            } catch (errorA) {}
            try {
                cachePath = app.preferences.getPrefAsString(
                    "Media Cache", "Disk Cache Folder", PREFType.PREF_Type_MACHINE_INDEPENDENT
                );
                if (cachePath) { return cachePath; }
            } catch (errorB) {}
            return null;
        }

        function removeFilesInFolder(path) {
            var count = 0;
            var folder = new Folder(path);
            if (!folder.exists) { return count; }
            var files = folder.getFiles();
            for (var i = 0; i < files.length; i++) {
                if (files[i] instanceof File && files[i].remove()) { count++; }
            }
            return count;
        }

        function purgeDiskCache() {
            var count = 0;
            var cachePath = getDiskCachePath();
            if (cachePath) { count += removeFilesInFolder(cachePath); }
            var commonPaths = [
                Folder.appData.fsName + "/Adobe/Common/Media Cache Files",
                Folder.appData.fsName + "/Adobe/Common/Media Cache",
                Folder.appData.fsName + "/Adobe/Common/Peak Files"
            ];
            for (var i = 0; i < commonPaths.length; i++) {
                count += removeFilesInFolder(commonPaths[i]);
            }
            return count;
        }

        btnAll.onClick = function() {
            try {
                app.purge(PurgeTarget.ALL_CACHES);
                statusText.text = "ALL purged! (Disk: " + purgeDiskCache() + " files)";
            } catch (error) {
                statusText.text = "Error: " + error.message;
            }
        };
        btnMemory.onClick = function() {
            try {
                app.purge(PurgeTarget.IMAGE_CACHES);
                statusText.text = "RAM cache purged!";
            } catch (error) { statusText.text = "Error: " + error.message; }
        };
        btnDisk.onClick = function() {
            try {
                statusText.text = "Disk cache purged! (" + purgeDiskCache() + " files)";
            } catch (error) { statusText.text = "Error: " + error.message; }
        };
        btnUndo.onClick = function() {
            try {
                app.purge(PurgeTarget.UNDO_CACHES);
                statusText.text = "Undo cache purged!";
            } catch (error) { statusText.text = "Error: " + error.message; }
        };
        btnSnapshot.onClick = function() {
            try {
                app.purge(PurgeTarget.SNAPSHOT_CACHES);
                statusText.text = "Snapshot cache purged!";
            } catch (error) { statusText.text = "Error: " + error.message; }
        };

        panel.onResizing = panel.onResize = function() { this.layout.resize(); };
        if (panel instanceof Window) {
            panel.center();
            panel.show();
        } else {
            panel.layout.layout(true);
        }
        return panel;
    }

    buildUI(thisObj);
}(this));
