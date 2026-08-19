/*
    Open Project Parent Folder

    Opens the parent of the directory containing the current After Effects
    project file. Uses Finder on macOS and Explorer on Windows.
*/
(function openProjectParentFolder() {
    var SCRIPT_NAME = "Open Project Parent Folder";

    if (!app.project || !app.project.file) {
        alert("プロジェクトがまだ保存されていません。", SCRIPT_NAME);
        return;
    }

    var projectDirectory = app.project.file.parent;
    var parentDirectory = projectDirectory ? projectDirectory.parent : null;

    if (!parentDirectory || !parentDirectory.exists) {
        alert("プロジェクトフォルダの一つ上を開けませんでした。", SCRIPT_NAME);
        return;
    }

    if (!parentDirectory.execute()) {
        alert("Finder／Explorerでフォルダを開けませんでした。", SCRIPT_NAME);
    }
}());
