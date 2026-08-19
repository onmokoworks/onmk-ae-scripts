/*
  フレームレート変更ツール
  ---------------------------
  このスクリプトは、After Effects のプロジェクトパネル内にあるすべての
  フッテージアイテムとコンポジションアイテムのフレームレートを、選択した値に変更します。
  対象のフレームレートは「30 fps」「29.97 fps」「24 fps」「12 fps」です。
*/

{
    // プロジェクトが開かれているか確認
    if (app.project === null) {
        alert("ご主人、プロジェクトが開かれていません！\nまずはプロジェクトを開いてくださいね～");
    } else {
        // UI ウィンドウの作成（palette: モードレスウィンドウ）
        var win = new Window("palette", "フレームレート変更ツール", undefined);
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        
        // フレームレート選択用のグループ作成
        var fpsGroup = win.add("group");
        fpsGroup.add("statictext", undefined, "新しいフレームレート:");
        var fpsDropdown = fpsGroup.add("dropdownlist", undefined, ["30 fps", "29.97 fps", "24 fps", "12 fps"]);
        fpsDropdown.selection = 0;  // 初期選択は 30 fps

        // 実行ボタンの追加
        var runButton = win.add("button", undefined, "フレームレート変更");
        runButton.onClick = function() {
            var selectedText = fpsDropdown.selection.text;
            // dropdown のテキストから数値部分を抽出（parseFloat で文字列から数値へ変換）
            var newFPS = parseFloat(selectedText);
            
            // ユーザー確認（ご主人の大事なプロジェクトですからね～）
            if (confirm("ご主人、プロジェクト内の全てのフッテージとコンポジションの\nフレームレートを " + newFPS + " fps に変更してもよろしいですか？")) {
                app.beginUndoGroup("フレームレート変更");
                
                // プロジェクト内のすべてのアイテムをループ処理
                for (var i = 1; i <= app.project.numItems; i++) {
                    var item = app.project.item(i);
                    // フッテージアイテムまたはコンポジションアイテムのみ対象
                    if (item instanceof CompItem || item instanceof FootageItem) {
                        // ※一部のフッテージは読み込み専用の場合がございますので、try-catch で保護します
                        try {
                            item.frameRate = newFPS;
                        } catch (e) {
                            alert("ご主人、アイテム「" + item.name + "」のフレームレート変更に失敗しました:\n" + e.toString());
                        }
                    }
                }
                
                app.endUndoGroup();
                alert("ご主人、すべての対象アイテムのフレームレートを " + newFPS + " fps に変更いたしました～！");
            }
        };

        win.center();
        win.show();
    }
}
