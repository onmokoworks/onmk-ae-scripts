/*
    Purge All Caches
    KBar-ready one-shot script. No completion alert.
*/
(function purgeAllCaches() {
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
        var folder = new Folder(path);
        if (!folder.exists) { return; }
        var files = folder.getFiles();
        for (var i = 0; i < files.length; i++) {
            if (files[i] instanceof File) { files[i].remove(); }
        }
    }

    try {
        app.purge(PurgeTarget.ALL_CACHES);
        var cachePath = getDiskCachePath();
        if (cachePath) { removeFilesInFolder(cachePath); }
        var commonPaths = [
            Folder.appData.fsName + "/Adobe/Common/Media Cache Files",
            Folder.appData.fsName + "/Adobe/Common/Media Cache",
            Folder.appData.fsName + "/Adobe/Common/Peak Files"
        ];
        for (var i = 0; i < commonPaths.length; i++) {
            removeFilesInFolder(commonPaths[i]);
        }
    } catch (error) {
        alert("キャッシュを削除できませんでした。\n" + error.message, "Purge All Caches");
    }
}());
