/*
    MarkerEditor.jsx - ScriptUI Panel
    選択レイヤーのマーカーの色とコメントを簡単に変更する
*/

(function (thisObj) {
    var panel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "マーカー編集", undefined, { resizeable: true });
    panel.orientation = "column";
    panel.alignChildren = ["fill", "top"];
    panel.spacing = 6;
    panel.margins = 8;

    // ---- マーカー選択 ----
    var selGroup = panel.add("panel", undefined, "マーカー選択");
    selGroup.alignChildren = ["fill", "fill"];
    selGroup.alignment = ["fill", "fill"];

    var markerList = selGroup.add("listbox", undefined, [], {
        multiselect: true,
        numberOfColumns: 4,
        showHeaders: true,
        columnTitles: ["#", "時間", "コメント", "色"],
        columnWidths: [30, 60, 120, 60]
    });
    markerList.alignment = ["fill", "fill"];
    markerList.preferredSize = [280, 150];

    var refreshBtn = selGroup.add("button", undefined, "マーカー読み込み");

    // ---- コメント編集 ----
    var commentPanel = panel.add("panel", undefined, "コメント");
    commentPanel.alignChildren = ["fill", "top"];
    var commentInput = commentPanel.add("edittext", undefined, "", { multiline: true });
    commentInput.alignment = ["fill", "fill"];
    commentInput.preferredSize = [280, 50];
    var applyCommentBtn = commentPanel.add("button", undefined, "コメントを適用");

    // ---- 色選択 ----
    var colorPanel = panel.add("panel", undefined, "マーカー色");
    colorPanel.alignChildren = ["fill", "top"];

    // AEマーカー色定義 (ラベルカラーに準拠)
    var colorDefs = [
        { name: "なし",     label: 0,  rgb: [0.69, 0.69, 0.69] },
        { name: "赤",       label: 1,  rgb: [0.85, 0.20, 0.20] },
        { name: "黄",       label: 2,  rgb: [0.90, 0.80, 0.15] },
        { name: "水色",     label: 3,  rgb: [0.60, 0.82, 0.85] },
        { name: "ピンク",   label: 4,  rgb: [0.85, 0.55, 0.70] },
        { name: "紫",       label: 5,  rgb: [0.60, 0.45, 0.75] },
        { name: "オレンジ", label: 6,  rgb: [0.90, 0.55, 0.20] },
        { name: "茶",       label: 7,  rgb: [0.55, 0.35, 0.25] },
        { name: "緑",       label: 8,  rgb: [0.45, 0.68, 0.35] }
    ];

    // 色ボタンを3列で配置
    var colorBtnRows = [];
    var colsPerRow = 3;
    for (var c = 0; c < colorDefs.length; c++) {
        if (c % colsPerRow === 0) {
            colorBtnRows.push(colorPanel.add("group"));
            colorBtnRows[colorBtnRows.length - 1].alignment = ["fill", "top"];
            colorBtnRows[colorBtnRows.length - 1].alignChildren = ["fill", "center"];
            colorBtnRows[colorBtnRows.length - 1].spacing = 4;
        }
        var cBtn = colorBtnRows[colorBtnRows.length - 1].add("button", undefined, colorDefs[c].name);
        cBtn.alignment = ["fill", "center"];
        cBtn.preferredSize = [88, 26];
        cBtn.colorIndex = c;
        cBtn.onClick = (function (idx) {
            return function () { applyColor(idx); };
        })(c);
    }

    // ---- 一括操作 ----
    var batchPanel = panel.add("panel", undefined, "一括操作");
    batchPanel.alignChildren = ["fill", "top"];
    var selectAllBtn = batchPanel.add("button", undefined, "全マーカーを選択");
    var deleteBtn = batchPanel.add("button", undefined, "選択マーカーを削除");

    // ---- ロジック ----
    var currentMarkers = []; // { layerIndex, markerIndex, time, comment, label }

    // 時間をタイムコード風に表示
    function timeToStr(t) {
        var m = Math.floor(t / 60);
        var s = t - m * 60;
        return m + ":" + (s < 10 ? "0" : "") + s.toFixed(2);
    }

    // 色ラベル名を返す
    function labelName(labelIdx) {
        for (var i = 0; i < colorDefs.length; i++) {
            if (colorDefs[i].label === labelIdx) return colorDefs[i].name;
        }
        return "?";
    }

    // マーカーをリストに読み込み
    function loadMarkers() {
        markerList.removeAll();
        currentMarkers = [];
        commentInput.text = "";

        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            alert("アクティブなコンポジションがありません。");
            return;
        }

        var selLayers = comp.selectedLayers;
        if (selLayers.length === 0) {
            alert("レイヤーを選択してください。");
            return;
        }

        for (var li = 0; li < selLayers.length; li++) {
            var layer = selLayers[li];
            var markers = layer.property("ADBE Marker");
            if (!markers) continue;
            for (var mi = 1; mi <= markers.numKeys; mi++) {
                var mv = markers.keyValue(mi);
                var t = markers.keyTime(mi);
                var entry = {
                    layerIndex: layer.index,
                    layerName: layer.name,
                    markerIndex: mi,
                    time: t,
                    comment: mv.comment,
                    label: mv.label
                };
                currentMarkers.push(entry);

                var item = markerList.add("item", String(currentMarkers.length));
                item.subItems[0].text = timeToStr(t);
                item.subItems[1].text = mv.comment || "(なし)";
                item.subItems[2].text = labelName(mv.label);
            }
        }

        if (currentMarkers.length === 0) {
            alert("選択レイヤーにマーカーがありません。");
        }
    }

    // リスト選択が変わったらコメント欄を更新
    markerList.onChange = function () {
        var sel = markerList.selection;
        if (sel && sel.length === 1) {
            var idx = Number(sel[0].text) - 1;
            commentInput.text = currentMarkers[idx].comment || "";
        }
    };

    // コメント適用
    function applyComment() {
        var sel = markerList.selection;
        if (!sel || sel.length === 0) {
            alert("リストからマーカーを選択してください。");
            return;
        }
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return;

        app.beginUndoGroup("マーカーコメント変更");
        var newComment = commentInput.text;
        for (var s = 0; s < sel.length; s++) {
            var idx = Number(sel[s].text) - 1;
            var entry = currentMarkers[idx];
            var layer = comp.layer(entry.layerIndex);
            var markers = layer.property("ADBE Marker");
            var mv = markers.keyValue(entry.markerIndex);
            mv.comment = newComment;
            markers.setValueAtKey(entry.markerIndex, mv);
            entry.comment = newComment;
            sel[s].subItems[1].text = newComment || "(なし)";
        }
        app.endUndoGroup();
    }

    // 色適用
    function applyColor(colorIdx) {
        var sel = markerList.selection;
        if (!sel || sel.length === 0) {
            alert("リストからマーカーを選択してください。");
            return;
        }
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return;

        var labelVal = colorDefs[colorIdx].label;
        var labelStr = colorDefs[colorIdx].name;

        app.beginUndoGroup("マーカー色変更");
        for (var s = 0; s < sel.length; s++) {
            var idx = Number(sel[s].text) - 1;
            var entry = currentMarkers[idx];
            var layer = comp.layer(entry.layerIndex);
            var markers = layer.property("ADBE Marker");
            var mv = markers.keyValue(entry.markerIndex);
            mv.label = labelVal;
            markers.setValueAtKey(entry.markerIndex, mv);
            entry.label = labelVal;
            sel[s].subItems[2].text = labelStr;
        }
        app.endUndoGroup();
    }

    // 全選択
    function selectAll() {
        if (markerList.items.length === 0) return;
        markerList.selection = null;
        for (var i = 0; i < markerList.items.length; i++) {
            markerList.selection = markerList.items[i];
        }
    }

    // 選択マーカー削除
    function deleteMarkers() {
        var sel = markerList.selection;
        if (!sel || sel.length === 0) {
            alert("削除するマーカーを選択してください。");
            return;
        }
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return;

        app.beginUndoGroup("マーカー削除");

        // インデックスがずれないよう後ろから削除
        var toDelete = [];
        for (var s = 0; s < sel.length; s++) {
            var idx = Number(sel[s].text) - 1;
            toDelete.push(currentMarkers[idx]);
        }

        // レイヤーごとにグループ化し、マーカーインデックス降順で削除
        var grouped = {};
        for (var d = 0; d < toDelete.length; d++) {
            var key = toDelete[d].layerIndex;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(toDelete[d].markerIndex);
        }
        for (var layerIdx in grouped) {
            if (!grouped.hasOwnProperty(layerIdx)) continue;
            var indices = grouped[layerIdx].sort(function (a, b) { return b - a; });
            var layer = comp.layer(Number(layerIdx));
            var markers = layer.property("ADBE Marker");
            for (var r = 0; r < indices.length; r++) {
                markers.removeKey(indices[r]);
            }
        }

        app.endUndoGroup();

        // リスト再読み込み
        loadMarkers();
    }

    // ---- イベント ----
    refreshBtn.onClick = loadMarkers;
    applyCommentBtn.onClick = applyComment;
    selectAllBtn.onClick = selectAll;
    deleteBtn.onClick = deleteMarkers;

    // ---- レイアウト ----
    panel.layout.layout(true);
    panel.layout.resize();
    panel.onResizing = panel.onResize = function () {
        this.layout.resize();
    };
    if (panel instanceof Window) {
        panel.onResizing = function () {
            this.layout.resize();
        };
        panel.show();
    }

})(this);
