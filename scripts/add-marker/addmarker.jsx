// マーカーを追加する関数
function addMarkerToSelectedLayers() {
    // 1. プロジェクト内に開いているコンポジション（アクティブコンポジション）を取得
    var activeComp = app.project.activeItem;

    // アクティブなアイテムが存在しない、またはそれがコンポジションでない場合は処理を中止
    if (!activeComp || !(activeComp instanceof CompItem)) {
        alert("コンポジションを選択してください。", "スクリプトエラー");
        return;
    }

    // 2. アクティブなコンポジション内で選択されているレイヤーを取得
    var selectedLayers = activeComp.selectedLayers;

    // 選択されたレイヤーがない場合は処理を中止
    if (selectedLayers.length === 0) {
        alert("マーカーを追加したいレイヤーを選択してください。", "スクリプト注意");
        return;
    }

    // 処理の開始（Undo用にグループ化）
    app.beginUndoGroup("選択レイヤーにマーカーを追加");

    // 3. 選択されたレイヤーをループ処理
    for (var i = 0; i < selectedLayers.length; i++) {
        var currentLayer = selectedLayers[i];

        // 4. 新しいマーカーオブジェクトを作成
        // マーカーの作成には MarkerValue オブジェクトを使うよ。
        // ここではコメントは空、デュレーションも 0 （単なるポイントマーカー）としてる。
        var myMarker = new MarkerValue("");

        // 現在のレイヤーのマーカープロパティを取得
        var markerProp = currentLayer.property("Marker");

        // 現在のコンポジションの時間（currentTime）にマーカーを追加
        // currentLayer.property("Marker").setValueAtTime(時間, マーカーオブジェクト);
        markerProp.setValueAtTime(activeComp.time, myMarker);
    }

    // 処理の終了
    app.endUndoGroup();

    // 完了メッセージ（任意）
    // alert(selectedLayers.length + " 個のレイヤーにマーカーを追加しました！");
}

// メイン関数の実行
addMarkerToSelectedLayers();