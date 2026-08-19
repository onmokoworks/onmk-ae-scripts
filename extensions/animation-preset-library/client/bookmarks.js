(function () {
    var items = [];
    var selectedId = "";
    var lastPayload = "";
    var grid = document.getElementById("grid");
    var status = document.getElementById("status");
    var search = document.getElementById("search");
    var menu = document.getElementById("settingsMenu");

    function call(name, args) {
        return cep.eval("$._onmkPresets." + name, args);
    }

    function selectedItem() {
        for (var i = 0; i < items.length; i++) {
            if (String(items[i].id) === selectedId) { return items[i]; }
        }
        return null;
    }

    function updateSelection() {
        var cards = grid.querySelectorAll(".preset-card");
        for (var i = 0; i < cards.length; i++) {
            cards[i].classList.toggle("selected", cards[i].getAttribute("data-id") === selectedId);
        }
    }

    function openSelected() {
        if (!selectedId) { status.textContent = "Select a bookmark"; return; }
        call("openCompBookmark", [selectedId]).then(function (result) {
            status.textContent = result || "Opened";
        });
    }

    function render() {
        var query = search.value.trim().toLowerCase();
        var visible = items.filter(function (item) {
            return !query || item.name.toLowerCase().indexOf(query) !== -1;
        });
        grid.innerHTML = "";
        if (visible.length === 0) {
            var empty = document.createElement("div");
            empty.className = "empty-state";
            empty.textContent = items.length ? "No matching compositions" : "Open a comp and press ＋ to bookmark it";
            grid.appendChild(empty);
            return;
        }
        visible.forEach(function (item) {
            var card = document.createElement("button");
            card.className = "preset-card";
            card.setAttribute("data-id", String(item.id));
            card.title = item.name;

            var thumb = document.createElement("div");
            thumb.className = "thumb";
            if (item.thumbnail) {
                var image = document.createElement("img");
                image.src = item.thumbnail + "?t=" + item.stamp;
                thumb.appendChild(image);
            } else {
                thumb.textContent = "COMP";
            }
            var badge = document.createElement("span");
            badge.className = "type-badge";
            badge.textContent = "COMP";
            var name = document.createElement("div");
            name.className = "preset-name";
            name.textContent = item.name;
            var meta = document.createElement("div");
            meta.className = "comp-meta";
            meta.textContent = item.width + "×" + item.height + "  ·  " + Number(item.fps).toFixed(2) + " fps";
            card.appendChild(thumb);
            card.appendChild(badge);
            card.appendChild(name);
            card.appendChild(meta);
            card.onclick = function () { selectedId = String(item.id); updateSelection(); };
            card.ondblclick = function () { selectedId = String(item.id); updateSelection(); openSelected(); };
            grid.appendChild(card);
        });
        updateSelection();
    }

    function refresh(silent, keepStatus) {
        call("listCompBookmarks", []).then(function (result) {
            if (silent && result === lastPayload) { return; }
            lastPayload = result;
            var payload = cep.parse(result, { error: "Could not read bookmarks", items: [] });
            items = payload.items || [];
            if (selectedId && !selectedItem()) { selectedId = ""; }
            if (!keepStatus) { status.textContent = payload.error || (items.length + " bookmarks"); }
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
    document.getElementById("addBookmark").onclick = function () {
        call("addActiveCompBookmark", []).then(function (result) {
            status.textContent = result || "Bookmarked";
            refresh(false, true);
        });
    };
    document.getElementById("removeBookmark").onclick = function () {
        var item = selectedItem();
        if (!item) { status.textContent = "Select a bookmark"; return; }
        if (!window.confirm("Remove bookmark for " + item.name + "?")) { return; }
        call("removeCompBookmark", [selectedId]).then(function (result) {
            selectedId = "";
            status.textContent = result || "Removed";
            refresh(false, true);
        });
    };
    document.getElementById("capture").onclick = function () {
        if (!selectedId) { status.textContent = "Select a bookmark"; return; }
        status.textContent = "Rendering thumbnail…";
        call("captureCompBookmark", [selectedId]).then(function (result) {
            status.textContent = result || "Captured";
            refresh(false, true);
        });
    };
    document.getElementById("openComp").onclick = openSelected;
    document.getElementById("refresh").onclick = function () { refresh(false); };
    search.oninput = render;
    refresh(false);
    window.setInterval(function () { refresh(true); }, 2000);
}());
