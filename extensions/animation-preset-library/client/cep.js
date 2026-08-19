(function () {
    function escapeArg(value) {
        return '"' + String(value)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n") + '"';
    }

    function evaluate(functionName, args) {
        return new Promise(function (resolve) {
            var encoded = (args || []).map(escapeArg).join(",");
            window.__adobe_cep__.evalScript(functionName + "(" + encoded + ")", function (result) {
                resolve(result);
            });
        });
    }

    function lighter(hex) {
        var value = parseInt(hex.substring(1), 16);
        var channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
        for (var i = 0; i < channels.length; i++) {
            channels[i] = Math.round(channels[i] + (255 - channels[i]) * 0.16);
        }
        return "#" + channels.map(function (channel) {
            return ("0" + channel.toString(16)).slice(-2);
        }).join("");
    }

    function applyTheme(color) {
        if (!/^#[0-9a-f]{6}$/i.test(color || "")) { return; }
        document.documentElement.style.setProperty("--accent", color);
        document.documentElement.style.setProperty("--accent2", lighter(color));
        var swatch = document.getElementById("themeSwatch");
        var picker = document.getElementById("themeColor");
        if (swatch) { swatch.style.backgroundColor = color; }
        if (picker && picker.value.toLowerCase() !== color.toLowerCase()) { picker.value = color; }
    }

    window.cep = {
        eval: evaluate,
        parse: function (value, fallback) {
            try { return JSON.parse(value); }
            catch (error) { return fallback; }
        }
    };

    var themeButton = document.getElementById("themeButton");
    var themeColor = document.getElementById("themeColor");
    if (themeButton && themeColor) {
        themeButton.onclick = function (event) {
            event.stopPropagation();
            themeColor.click();
        };
        themeColor.oninput = function () {
            applyTheme(themeColor.value);
            evaluate("$._onmkPresets.setTheme", [themeColor.value]);
        };
        evaluate("$._onmkPresets.getTheme", []).then(applyTheme);
        window.setInterval(function () {
            evaluate("$._onmkPresets.getTheme", []).then(applyTheme);
        }, 1500);
    }
}());
