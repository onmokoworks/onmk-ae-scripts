/*
    MatchNestedCompDuration.jsx
    - アクティブコンポジション内のネストコンポの尺を親コンポに合わせる
    - 選択レイヤー基準でデュレーションを合わせるモード
    - コンポ内の全レイヤーのアウトポイントも自動で引き伸ばし
*/

(function () {
    // ---- UI ----
    var win = new Window("dialog", "ネストコンポ尺合わせ", undefined, { resizeable: false });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];

    // モード選択
    var modePanel = win.add("panel", undefined, "基準の選択");
    modePanel.alignChildren = ["left", "top"];
    var rbComp = modePanel.add("radiobutton", undefined, "アクティブコンポジションの尺に合わせる");
    var rbItem = modePanel.add("radiobutton", undefined, "選択しているレイヤーの尺に合わせる");
    rbComp.value = true;

    // オプション
    var optPanel = win.add("panel", undefined, "オプション");
    optPanel.alignChildren = ["left", "top"];
    var cbRecursive = optPanel.add("checkbox", undefined, "再帰的にネストコンポも処理する");
    cbRecursive.value = false;
    var cbStretchLayers = optPanel.add("checkbox", undefined, "コンポ内の全レイヤーのアウトポイントも合わせる");
    cbStretchLayers.value = true;

    // ボタン
    var btnGroup = win.add("group");
    btnGroup.alignment = ["center", "top"];
    var btnOK = btnGroup.add("button", undefined, "実行", { name: "ok" });
    var btnCancel = btnGroup.add("button", undefined, "キャンセル", { name: "cancel" });

    if (win.show() !== 1) return;

    // ---- メイン処理 ----
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        alert("アクティブなコンポジションがありません。");
        return;
    }

    var targetDuration;

    if (rbComp.value) {
        // アクティブコンポの尺を基準にする
        targetDuration = comp.duration;
    } else {
        // 選択レイヤーの尺を基準にする
        var selLayers = comp.selectedLayers;
        if (selLayers.length === 0) {
            alert("レイヤーが選択されていません。");
            return;
        }
        // 選択レイヤーの中で最長の尺を採用
        targetDuration = 0;
        for (var i = 0; i < selLayers.length; i++) {
            var layerDur = selLayers[i].outPoint - selLayers[i].inPoint;
            if (layerDur > targetDuration) {
                targetDuration = layerDur;
            }
        }
        if (targetDuration <= 0) {
            alert("選択レイヤーの尺が取得できませんでした。");
            return;
        }
    }

    var recursive = cbRecursive.value;
    var stretchLayers = cbStretchLayers.value;
    var processed = {};
    var compCount = 0;
    var layerCount = 0;

    app.beginUndoGroup("ネストコンポ尺合わせ");

    try {
        // 選択レイヤー基準の場合、親コンポ自体の尺も変更する
        if (rbItem.value) {
            if (comp.duration !== targetDuration) {
                comp.duration = targetDuration;
                compCount++;
            }
            // 親コンポ内の全レイヤーも引き伸ばす
            if (stretchLayers) {
                stretchAllLayers(comp, targetDuration);
            }
        }

        // ネストコンポを処理
        processComp(comp, targetDuration, recursive, processed, stretchLayers);
    } catch (e) {
        alert("エラーが発生しました:\n" + e.toString());
    }

    app.endUndoGroup();

    var msg = "完了:\n";
    msg += "  コンポジション: " + compCount + " 個の尺を変更\n";
    msg += "  レイヤー: " + layerCount + " 個のアウトポイントを変更";
    alert(msg);

    // ---- 関数 ----

    // コンポ内の全レイヤーのアウトポイントをコンポの尺に合わせる
    function stretchAllLayers(targetComp, dur) {
        for (var j = 1; j <= targetComp.numLayers; j++) {
            var lyr = targetComp.layer(j);
            try {
                // アウトポイントがコンポ尺より短い場合のみ伸ばす
                if (lyr.outPoint < dur) {
                    lyr.outPoint = dur;
                    layerCount++;
                }
            } catch (e) {
                // ロックされたレイヤー等はスキップ
            }
        }
    }

    // ネストコンポを再帰的に処理
    function processComp(parentComp, dur, recurse, visited, doStretch) {
        for (var i = 1; i <= parentComp.numLayers; i++) {
            var layer = parentComp.layer(i);
            var src = layer.source;

            // コンポジションレイヤーのみ対象
            if (!(src instanceof CompItem)) continue;

            // 二重処理防止
            if (visited[src.id]) continue;
            visited[src.id] = true;

            // ネストコンポの尺を変更
            if (src.duration !== dur) {
                src.duration = dur;
                compCount++;
            }

            // ネストコンポ内の全レイヤーのアウトポイントも伸ばす
            if (doStretch) {
                stretchAllLayers(src, dur);
            }

            // 親コンポ上でのこのレイヤー自体のアウトポイントも伸ばす
            try {
                if (layer.outPoint < dur) {
                    layer.outPoint = dur;
                    layerCount++;
                }
            } catch (e) {}

            // 再帰処理
            if (recurse) {
                processComp(src, dur, recurse, visited, doStretch);
            }
        }
    }
})();
