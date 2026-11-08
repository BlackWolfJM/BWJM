(function () {
  function initBwjmViewer() {
    const pre = document.querySelector("pre");
    const rawText = pre ? pre.textContent : (document.body ? document.body.innerText : "");
    if (!rawText || rawText.trim().length === 0) {
      return;
    }

    const fileName = window.location.pathname.split("/").pop() || "document.bwjm";
    document.title = "BWJM: " + decodeURIComponent(fileName);

    document.body.innerHTML = "";
    const mainRoot = document.createElement("main");
    mainRoot.id = "mathmd-root";
    mainRoot.setAttribute("aria-live", "polite");
    document.body.appendChild(mainRoot);

    function dispatchUpdate() {
      window.postMessage(
        {
          type: "update",
          source: rawText,
          documentUri: window.location.href,
        },
        "*",
      );
    }

    dispatchUpdate();
    setTimeout(dispatchUpdate, 100);
    setTimeout(dispatchUpdate, 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBwjmViewer);
  } else {
    initBwjmViewer();
  }
})();

