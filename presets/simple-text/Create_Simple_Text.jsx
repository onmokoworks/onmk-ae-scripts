#target aftereffects

(function createSimpleText() {
    var scriptName = "Create Simple Text";
    var comp = app.project ? app.project.activeItem : null;
    if (!(comp instanceof CompItem)) {
        alert("コンポジションを開いてください。", scriptName);
        return;
    }

    app.beginUndoGroup(scriptName);
    try {
        var layer = comp.layers.addText("Text");
        layer.name = "Text";
        var sourceText = layer.property("ADBE Text Properties").property("ADBE Text Document");
        var document = sourceText.value;
        document.fontSize = 100;
        document.fillColor = [1, 1, 1];
        document.applyFill = true;
        document.applyStroke = false;
        document.justification = ParagraphJustification.CENTER_JUSTIFY;
        sourceText.setValue(document);
        layer.property("ADBE Transform Group").property("ADBE Position").setValue([
            comp.width / 2,
            comp.height / 2
        ]);

        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        layer.selected = true;
    } catch (error) {
        alert(error.message, scriptName);
    } finally {
        app.endUndoGroup();
    }
}());
