(function () {
    if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
        alert("アクティブなコンポジションがありません。");
        return;
    }

    var comp = app.project.activeItem;

    var win = new Window("dialog", "マーカー書き出し", undefined, { resizeable: false });

    win.add("statictext", undefined, "ソース:");
    var srcGroup = win.add("group");
    var rbComp = srcGroup.add("radiobutton", undefined, "コンポジション");
    var rbLayer = srcGroup.add("radiobutton", undefined, "選択レイヤー");
    rbComp.value = true;

    win.add("statictext", undefined, "フォーマット:");
    var fmtGroup = win.add("group");
    var rbCSV = fmtGroup.add("radiobutton", undefined, "CSV");
    var rbJSON = fmtGroup.add("radiobutton", undefined, "JSON");
    rbCSV.value = true;

    var btnGroup = win.add("group");
    btnGroup.add("button", undefined, "書き出し", { name: "ok" });
    btnGroup.add("button", undefined, "キャンセル", { name: "cancel" });

    if (win.show() !== 1) return;

    var markers;
    var sourceName;
    if (rbLayer.value) {
        if (comp.selectedLayers.length === 0) {
            alert("レイヤーが選択されていません。");
            return;
        }
        var layer = comp.selectedLayers[0];
        markers = layer.property("Marker");
        sourceName = layer.name;
    } else {
        markers = comp.markerProperty;
        sourceName = comp.name;
    }

    if (!markers || markers.numKeys === 0) {
        alert("マーカーが見つかりません。");
        return;
    }

    var data = [];
    for (var i = 1; i <= markers.numKeys; i++) {
        var t = markers.keyTime(i);
        var m = markers.keyValue(i);
        var h = Math.floor(t / 3600);
        var min = Math.floor((t % 3600) / 60);
        var sec = t % 60;
        var tc = pad(h) + ":" + pad(min) + ":" + pad2(sec);

        data.push({
            index: i,
            time: Math.round(t * 1000) / 1000,
            timecode: tc,
            comment: m.comment || "",
            duration: Math.round(m.duration * 1000) / 1000,
            chapter: m.chapter || "",
            label: m.label
        });
    }

    var ext = rbCSV.value ? ".csv" : ".json";
    var file = File.saveDialog("保存先を選択", "*" + ext);
    if (!file) return;

    file.encoding = "UTF-8";
    file.open("w");

    if (rbCSV.value) {
        file.writeln("index,time,timecode,comment,duration,chapter,label");
        for (var j = 0; j < data.length; j++) {
            var d = data[j];
            file.writeln(
                d.index + "," +
                d.time + "," +
                d.timecode + "," +
                csvEscape(d.comment) + "," +
                d.duration + "," +
                csvEscape(d.chapter) + "," +
                d.label
            );
        }
    } else {
        var json = "[\n";
        for (var k = 0; k < data.length; k++) {
            var o = data[k];
            json += "  {\n";
            json += '    "index": ' + o.index + ",\n";
            json += '    "time": ' + o.time + ",\n";
            json += '    "timecode": "' + o.timecode + '",\n';
            json += '    "comment": "' + jsonEscape(o.comment) + '",\n';
            json += '    "duration": ' + o.duration + ",\n";
            json += '    "chapter": "' + jsonEscape(o.chapter) + '",\n';
            json += '    "label": ' + o.label + "\n";
            json += "  }" + (k < data.length - 1 ? "," : "") + "\n";
        }
        json += "]";
        file.write(json);
    }

    file.close();
    alert(data.length + " 件のマーカーを書き出しました。\n" + File.decode(file.fsName));

    function pad(n) {
        return (n < 10 ? "0" : "") + Math.floor(n);
    }

    function pad2(s) {
        var whole = Math.floor(s);
        var frac = Math.round((s - whole) * 1000);
        return (whole < 10 ? "0" : "") + whole + "." + ("000" + frac).slice(-3);
    }

    function csvEscape(str) {
        str = String(str);
        if (str.indexOf(",") !== -1 || str.indexOf('"') !== -1 || str.indexOf("\n") !== -1) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    function jsonEscape(str) {
        return String(str)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t");
    }
})();
