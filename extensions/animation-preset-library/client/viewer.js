(function () {
    var files = [];
    var selectedPath = "";
    var lastPayload = "";
    var grid = document.getElementById("grid");
    var status = document.getElementById("status");
    var folderName = document.getElementById("folderName");
    var search = document.getElementById("search");
    var menu = document.getElementById("settingsMenu");

    function call(name, args) {
        return cep.eval("$._onmkPresets." + name, args);
    }

    function updateSelectedCard() {
        var cards = grid.querySelectorAll(".preset-card");
        for (var i = 0; i < cards.length; i++) {
            if (cards[i].getAttribute("data-path") === selectedPath) {
                cards[i].classList.add("selected");
            } else {
                cards[i].classList.remove("selected");
            }
        }
    }

    function applyPreset() {
        if (!selectedPath) {
            status.textContent = "Select a preset";
            return;
        }
        call("applyPreset", [selectedPath]).then(function (result) {
            status.textContent = result || "Applied";
        });
    }

    function render() {
        var query = search.value.trim().toLowerCase();
        grid.innerHTML = "";
        files.filter(function (item) {
            return !query || item.name.toLowerCase().indexOf(query) !== -1;
        }).forEach(function (item) {
            var card = document.createElement("button");
            card.className = "preset-card";
            card.setAttribute("data-path", item.path);
            card.title = item.name;

            var thumb = document.createElement("div");
            thumb.className = "thumb";
            if (item.thumbnail) {
                var image = document.createElement("img");
                image.src = item.thumbnail + "?t=" + item.stamp;
                image.onerror = function () {
                    this.parentNode.textContent = "PNG?";
                };
                thumb.appendChild(image);
            } else {
                thumb.textContent = (item.kind || "ffx").toUpperCase();
            }

            var label = document.createElement("div");
            label.className = "preset-name";
            label.textContent = item.name;
            card.appendChild(thumb);
            card.appendChild(label);

            card.onclick = function () {
                selectedPath = item.path;
                updateSelectedCard();
            };
            card.ondblclick = function () {
                selectedPath = item.path;
                updateSelectedCard();
                applyPreset();
            };
            grid.appendChild(card);
        });
        updateSelectedCard();
    }

    function refresh(silent, keepStatus) {
        call("getLibrary", []).then(function (path) {
            folderName.textContent = path || "No folder selected";
            return call("listPresets", []);
        }).then(function (result) {
            if (silent && result === lastPayload) { return; }
            lastPayload = result;
            files = cep.parse(result, []);
            if (!keepStatus) { status.textContent = files.length + " library items"; }
            render();
        });
    }

    document.getElementById("menuButton").onclick = function (event) {
        event.stopPropagation();
        menu.classList.toggle("open");
    };
    document.addEventListener("click", function (event) {
        if (!menu.contains(event.target)) { menu.classList.remove("open"); }
    });
    document.getElementById("chooseFolder").onclick = function () {
        call("chooseLibrary", []).then(function () {
            menu.classList.remove("open");
            refresh(false);
        });
    };
    document.getElementById("revealFolder").onclick = function () {
        call("revealLibrary", []);
        menu.classList.remove("open");
    };
    document.getElementById("refresh").onclick = function () { refresh(false); };
    document.getElementById("apply").onclick = applyPreset;
    document.getElementById("deletePreset").onclick = function () {
        if (!selectedPath) {
            status.textContent = "Select a preset";
            return;
        }
        var selectedItem = null;
        for (var i = 0; i < files.length; i++) {
            if (files[i].path === selectedPath) { selectedItem = files[i]; break; }
        }
        var label = selectedItem ? selectedItem.name : "this preset";
        if (!window.confirm("Delete " + label + "?\n\nThe library item and its PNG thumbnail will be removed.")) { return; }
        call("deletePreset", [selectedPath]).then(function (result) {
            selectedPath = "";
            status.textContent = result || "Deleted";
            refresh(false, true);
        });
    };
    document.getElementById("capture").onclick = function () {
        if (!selectedPath) {
            status.textContent = "Select a preset";
            return;
        }
        call("captureThumbnail", [selectedPath]).then(function (result) {
            status.textContent = result || "Captured";
            refresh(false, true);
        });
    };
    search.oninput = render;
    refresh(false);
    window.setInterval(function () { refresh(true); }, 2000);
}());
