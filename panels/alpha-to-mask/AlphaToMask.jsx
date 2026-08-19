/*
    Luminance To Layers for Adobe After Effects
    選択したレイヤーを、AE標準の「オートトレース」でマスク化し、
    作成されたマスクごとに別レイヤーへ自動分割します。

    使い方:
    1. コンポジション上で画像レイヤーを選択
    2. 「ルミナンスで分割」をクリック
    3. オートトレース画面で「チャンネル: ルミナンス」を選び、OK

    複数レイヤーを選択した場合は、レイヤーごとにオートトレース画面が開きます。
*/

(function luminanceToLayers(thisObj) {
    function findAutoTraceCommand() {
        var labels = [
            "Auto-trace...",
            "Auto-trace…",
            "Auto-trace",
            "オートトレース...",
            "オートトレース…",
            "オートトレース"
        ];

        for (var i = 0; i < labels.length; i++) {
            var commandId = app.findMenuCommandId(labels[i]);
            if (commandId) {
                return commandId;
            }
        }
        return 0;
    }

    function isTraceableLayer(layer) {
        return layer &&
            layer instanceof AVLayer &&
            layer.hasVideo &&
            layer.enabled &&
            !layer.locked;
    }

    function removeAllMasksExcept(layer, keepIndex) {
        var masks = layer.property("ADBE Mask Parade");
        for (var i = masks.numProperties; i >= 1; i--) {
            if (i !== keepIndex) {
                masks.property(i).remove();
            }
        }
    }

    function removeMasksFrom(layer, firstIndex) {
        var masks = layer.property("ADBE Mask Parade");
        for (var i = masks.numProperties; i >= firstIndex; i--) {
            masks.property(i).remove();
        }
    }

    function splitNewMasksToLayers(layer, firstNewMaskIndex) {
        var masks = layer.property("ADBE Mask Parade");
        var lastNewMaskIndex = masks.numProperties;
        var results = [];
        var baseName = layer.name;

        for (var maskIndex = firstNewMaskIndex; maskIndex <= lastNewMaskIndex; maskIndex++) {
            var separatedLayer = layer.duplicate();
            removeAllMasksExcept(separatedLayer, maskIndex);
            separatedLayer.name = baseName + " - Luma " +
                ("0" + (maskIndex - firstNewMaskIndex + 1)).slice(-2);
            separatedLayer.enabled = true;
            results.push(separatedLayer);
        }

        removeMasksFrom(layer, firstNewMaskIndex);
        layer.enabled = false;
        layer.name = baseName + " [SOURCE]";

        return results;
    }

    function traceSelectedLayers() {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            alert("コンポジションを開き、画像レイヤーを選択してください。");
            return;
        }

        var selected = comp.selectedLayers;
        if (!selected || selected.length === 0) {
            alert("アルファ付き画像レイヤーを1つ以上選択してください。");
            return;
        }

        var targets = [];
        var skipped = [];
        var i;

        for (i = 0; i < selected.length; i++) {
            if (isTraceableLayer(selected[i])) {
                targets.push(selected[i]);
            } else {
                skipped.push(selected[i].name);
            }
        }

        if (targets.length === 0) {
            alert(
                "処理できるレイヤーがありません。\n" +
                "ロックされていない画像・映像レイヤーを選択してください。"
            );
            return;
        }

        var autoTraceCommand = findAutoTraceCommand();
        if (!autoTraceCommand) {
            alert(
                "AEの「オートトレース」コマンドを見つけられませんでした。\n" +
                "レイヤーメニューに「オートトレース」があるか確認してください。"
            );
            return;
        }

        app.beginUndoGroup("Luminance To Layers");

        var resultLayers = [];
        try {
            for (i = 0; i < comp.numLayers; i++) {
                comp.layer(i + 1).selected = false;
            }

            for (i = 0; i < targets.length; i++) {
                var masksBefore = targets[i].property("ADBE Mask Parade").numProperties;
                targets[i].selected = true;
                app.executeCommand(autoTraceCommand);
                targets[i].selected = false;

                var masksAfter = targets[i].property("ADBE Mask Parade").numProperties;
                if (masksAfter > masksBefore) {
                    var splitLayers = splitNewMasksToLayers(targets[i], masksBefore + 1);
                    for (var s = 0; s < splitLayers.length; s++) {
                        resultLayers.push(splitLayers[s]);
                    }
                }
            }
        } catch (err) {
            alert("ルミナンス分割中にエラーが発生しました。\n" + err.toString());
        } finally {
            for (i = 0; i < resultLayers.length; i++) {
                resultLayers[i].selected = true;
            }
            if (resultLayers.length === 0) {
                for (i = 0; i < targets.length; i++) {
                    targets[i].selected = true;
                }
            }
            app.endUndoGroup();
        }

        if (skipped.length > 0) {
            alert(
                "次のレイヤーはロック中、非表示、または対象外のためスキップしました。\n\n" +
                skipped.join("\n")
            );
        }
    }

    function buildUI() {
        var panel = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "Luminance To Layers", undefined, { resizeable: true });

        panel.orientation = "column";
        panel.alignChildren = ["fill", "top"];
        panel.spacing = 8;
        panel.margins = 12;

        var description = panel.add(
            "statictext",
            undefined,
            "画像の明るさを輪郭化し、マスクごとに別レイヤーへ分割します。",
            { multiline: true }
        );
        description.alignment = ["fill", "top"];

        var runButton = panel.add("button", undefined, "ルミナンスで分割");
        runButton.preferredSize.height = 34;
        runButton.onClick = traceSelectedLayers;

        var note = panel.add(
            "statictext",
            undefined,
            "オートトレース画面では「チャンネル: ルミナンス」を選択してください。\n" +
            "元レイヤーは [SOURCE] として非表示で残ります。",
            { multiline: true }
        );
        note.alignment = ["fill", "top"];

        panel.onResizing = panel.onResize = function () {
            this.layout.resize();
        };

        return panel;
    }

    var ui = buildUI();
    if (ui instanceof Window) {
        ui.center();
        ui.show();
    } else {
        ui.layout.layout(true);
    }
})(this);
