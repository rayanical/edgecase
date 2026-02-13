(() => {
  const moduleUrl = chrome.runtime.getURL("dist/contentMain.js");
  import(moduleUrl).catch((error) => {
    console.error("Edgecase failed to load content module:", error);
  });
})();
