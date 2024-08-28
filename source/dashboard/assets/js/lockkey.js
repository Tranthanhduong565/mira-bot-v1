(function () {
    function detectDevTools() {
        var threshold = 160;
        var devToolsOpen = false;

        function checkDevTools() {
            if (window.outerWidth - window.innerWidth > threshold ||
                window.outerHeight - window.innerHeight > threshold) {
                devToolsOpen = true;
                alert("Developer tools are open!");
            }
        }
        setInterval(checkDevTools, 1000);

        document.addEventListener("keydown", function (event) {
            if (event.key === "F12") {
                event.preventDefault();
                event.stopPropagation();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (
                (event.ctrlKey && event.shiftKey && event.key === "I") ||
                (event.ctrlKey && event.shiftKey && event.key === "C") ||
                (event.ctrlKey && event.shiftKey && event.key === "J") ||
                (event.ctrlKey && event.key === "U")
            ) {
                event.preventDefault();
                event.stopPropagation();
            }
        });

        document.addEventListener("contextmenu", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });

        document.addEventListener("copy", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });

        document.addEventListener("cut", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });
        document.body.style.userSelect = "none";
        document.body.style.webkitUserSelect = "none";
        document.body.style.mozUserSelect = "none";
        document.body.style.msUserSelect = "none";
    }

    document.addEventListener("DOMContentLoaded", detectDevTools);

    window.onload = function () {
        document.addEventListener("contextmenu", function (event) {
            event.preventDefault();
        }, false);

        document.addEventListener("keydown", function (event) {
            if (event.ctrlKey && event.shiftKey && event.keyCode === 73) { // Ctrl+Shift+I
                disabledEvent(event);
            }
            if (event.ctrlKey && event.shiftKey && event.keyCode === 74) { // Ctrl+Shift+J
                disabledEvent(event);
            }
            if (event.keyCode === 83 && (navigator.platform.match("Mac") ? event.metaKey : event.ctrlKey)) { // Ctrl+S or Cmd+S
                disabledEvent(event);
            }
            if (event.ctrlKey && event.keyCode === 85) { // Ctrl+U
                disabledEvent(event);
            }
            if (event.keyCode === 123) { // F12
                disabledEvent(event);
            }
        }, false);

        function disabledEvent(event) {
            if (event.stopPropagation) {
                event.stopPropagation();
            } else if (window.event) {
                window.event.cancelBubble = true;
            }
            event.preventDefault();
            return false;
        }
    }
})();
