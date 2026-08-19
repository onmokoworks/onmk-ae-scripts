/*
  ChangeMaskMode.jsx
  選択したレイヤーのマスクパスモードを一括変更するスクリプト
*/

(function () {
    if (!(app.project && app.project.activeItem && app.project.activeItem instanceof CompItem)) {
        alert("コンポジションを開いてください。");
        return;
    }

    var comp = app.project.activeItem;
    var layers = comp.selectedLayers;

    if (layers.length === 0) {
        alert("レイヤーを1つ以上選択してください。");
        return;
    }

    // モード一覧
    var modeNames = ["None", "Add", "Subtract", "Intersect", "Lighten", "Darken", "Difference"];
    var modeValues = [
        MaskMode.NONE,
        MaskMode.ADD,
        MaskMode.SUBTRACT,
        MaskMode.INTERSECT,
        MaskMode.LIGHTEN,
        MaskMode.DARKEN,
        MaskMode.DIFFERENCE
    ];

    // UI
    var win = new Window("dialog", "マスクモード一括変更", undefined, { resizeable: false });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];

    win.add("statictext", undefined, "選択レイヤー数: " + layers.length);

    // マスク数カウント
    var totalMasks = 0;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].mask) {
            totalMasks += layers[i].mask.numProperties;
        }
    }
    win.add("statictext", undefined, "対象マスク数: " + totalMasks);

    win.add("panel", undefined, "").preferredSize.height = 2;

    // 対象選択
    var targetGroup = win.add("group");
    targetGroup.orientation = "column";
    targetGroup.alignChildren = ["left", "center"];
    targetGroup.add("statictext", undefined, "対象:");
    var rbAll = targetGroup.add("radiobutton", undefined, "すべてのマスク");
    var rbSelected = targetGroup.add("radiobutton", undefined, "選択中のマスクのみ");
    rbAll.value = true;

    win.add("panel", undefined, "").preferredSize.height = 2;

    // モード選択
    var modeGroup = win.add("group");
    modeGroup.add("statictext", undefined, "変更先モード:");
    var modeDropdown = modeGroup.add("dropdownlist", undefined, modeNames);
    modeDropdown.selection = 1; // デフォルト: Add

    // ボタン
    var btnGroup = win.add("group");
    btnGroup.alignment = ["center", "bottom"];
    var btnOK = btnGroup.add("button", undefined, "実行", { name: "ok" });
    var btnCancel = btnGroup.add("button", undefined, "キャンセル", { name: "cancel" });

    if (win.show() !== 1) return;

    var selectedMode = modeValues[modeDropdown.selection.index];
    var onlySelected = rbSelected.value;
    var changed = 0;

    app.beginUndoGroup("マスクモード一括変更");

    try {
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            if (!layer.mask || layer.mask.numProperties === 0) continue;

            for (var m = 1; m <= layer.mask.numProperties; m++) {
                var mask = layer.mask(m);

                if (onlySelected && !mask.selected) continue;

                mask.maskMode = selectedMode;
                changed++;
            }
        }
    } catch (e) {
        alert("エラー: " + e.toString());
    }

    app.endUndoGroup();

    alert("完了: " + changed + " 個のマスクモードを変更しました。");
})();
