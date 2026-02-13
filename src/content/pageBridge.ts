(function initEdgecasePageBridge() {
  const SOURCE = "edgecase-page-bridge";

  function postSnapshot(payload: {
    source: "monaco" | "codemirror" | "ace";
    language: string | null;
    code: string;
    selection: { start: number; end: number } | null;
  }) {
    window.postMessage({ source: SOURCE, type: "CODE_SNAPSHOT", payload }, "*");
  }

  function tryMonaco(): boolean {
    const monacoGlobal = (window as unknown as { monaco?: any }).monaco;
    const editorApi = monacoGlobal?.editor;

    // Preferred path when Monaco exposes editor instances.
    const editors = editorApi?.getEditors?.();
    if (editors && editors.length > 0) {
      const editor = pickLongestMonacoEditor(editors);
      const model = editor.getModel?.();
      const code = model?.getValue?.() || "";
      if (code.trim()) {
        const lang = model?.getLanguageId?.() || null;
        const selection = editor.getSelection?.();
        const start = model.getOffsetAt?.(selection?.getStartPosition?.()) ?? 0;
        const end = model.getOffsetAt?.(selection?.getEndPosition?.()) ?? code.length;
        postSnapshot({ source: "monaco", language: lang, code, selection: { start, end } });
        return true;
      }
    }

    // Some Monaco builds expose models but not getEditors().
    const models = editorApi?.getModels?.();
    if (models && models.length > 0) {
      const model = models[0];
      const code = model?.getValue?.() || "";
      if (code.trim()) {
        const lang = model?.getLanguageId?.() || null;
        postSnapshot({ source: "monaco", language: lang, code, selection: null });
        return true;
      }
    }

    // Last-resort fallback: scrape rendered Monaco lines from DOM.
    const monacoText = readMonacoVisibleText();
    if (monacoText) {
      postSnapshot({
        source: "monaco",
        language: null,
        code: monacoText,
        selection: null
      });
      return true;
    }

    return false;
  }

  function pickLongestMonacoEditor(editors: any[]): any {
    let best = editors[0];
    let bestLength = 0;

    for (const editor of editors) {
      const model = editor?.getModel?.();
      const code = model?.getValue?.() || "";
      if (code.length > bestLength) {
        bestLength = code.length;
        best = editor;
      }
    }

    return best;
  }

  function readMonacoVisibleText(): string | null {
    const lineNodes = Array.from(
      document.querySelectorAll(".monaco-editor .view-lines .view-line, .monaco-editor .view-line")
    );
    if (lineNodes.length === 0) {
      return null;
    }

    const lines = lineNodes
      .map((node) => (node.textContent || "").replace(/\u00a0/g, " "))
      .join("\n")
      .trim();

    return lines || null;
  }

  function readMonacoInputAreaText(): string | null {
    const areas = Array.from(document.querySelectorAll(".monaco-editor textarea.inputarea")) as HTMLTextAreaElement[];
    if (areas.length === 0) {
      return null;
    }

    const best = areas
      .map((area) => area.value || area.getAttribute("value") || "")
      .sort((a, b) => b.length - a.length)[0];

    return best?.trim() ? best : null;
  }

  function tryCodeMirror(): boolean {
    const view = findCodeMirrorView();
    if (view?.state?.doc) {
      const code = String(view.state.doc);
      if (code.trim()) {
        const main = view.state.selection?.main;
        postSnapshot({
          source: "codemirror",
          language: null,
          code,
          selection: main ? { start: main.from, end: main.to } : null
        });
        return true;
      }
    }

    // Last-resort fallback for CM6 pages where the view reference is not reachable.
    const content = document.querySelector(".cm-content");
    if (!content) {
      return false;
    }

    const lines = Array.from(content.querySelectorAll(".cm-line"))
      .map((line) => line.textContent || "")
      .join("\n")
      .trim();

    if (!lines) {
      const areaValue = (content.querySelector("textarea") as HTMLTextAreaElement | null)?.value || "";
      if (!areaValue.trim()) {
        return false;
      }

      postSnapshot({
        source: "codemirror",
        language: null,
        code: areaValue,
        selection: null
      });
      return true;
    }

    postSnapshot({
      source: "codemirror",
      language: null,
      code: lines,
      selection: null
    });
    return true;
  }

  function findCodeMirrorView():
    | {
        state?: { doc?: { toString: () => string }; selection?: { main?: { from: number; to: number } } };
      }
    | null {
    const candidates = Array.from(
      document.querySelectorAll(".cm-editor, .cm-content, [class*='cm-editor'], [class*='cm-content']")
    ) as Array<Element & { cmView?: { view?: any } }>;

    for (const node of candidates) {
      const directView = node.cmView?.view;
      if (directView?.state?.doc) {
        return directView;
      }

      const parentView = (node.parentElement as (Element & { cmView?: { view?: any } }) | null)?.cmView?.view;
      if (parentView?.state?.doc) {
        return parentView;
      }
    }

    // Fallback: deep scan for any element that carries cmView.
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_ELEMENT);
    let current = walker.currentNode as Element | null;
    while (current) {
      const possibleNode = current as Element & { cmView?: { view?: any } };
      const currentView = possibleNode.cmView?.view;
      if (currentView?.state?.doc) {
        return currentView;
      }
      current = walker.nextNode() as Element | null;
    }

    return null;
  }

  function tryAce(): boolean {
    const ace = (window as unknown as { ace?: any }).ace;
    const editor = ace?.edit?.(document.querySelector(".ace_editor"));
    if (!editor) {
      return false;
    }

    const code = editor.getValue?.() || "";
    if (!code.trim()) {
      return false;
    }

    const selection = editor.getSelectionRange?.();
    const doc = editor.session?.doc;
    const start = doc?.positionToIndex?.(selection?.start, 0) ?? 0;
    const end = doc?.positionToIndex?.(selection?.end, 0) ?? code.length;

    postSnapshot({ source: "ace", language: null, code, selection: { start, end } });
    return true;
  }

  function scan() {
    const monacoInputText = readMonacoInputAreaText();
    const hasMonacoInputText = Boolean(monacoInputText?.trim());
    if (hasMonacoInputText && monacoInputText) {
      postSnapshot({ source: "monaco", language: null, code: monacoInputText, selection: null });
    }

    const captured =
      tryMonaco() ||
      hasMonacoInputText ||
      tryCodeMirror() ||
      tryAce();
    if (!captured) {
      window.postMessage({ source: SOURCE, type: "CODE_SNAPSHOT_UNAVAILABLE" }, "*");
    }
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || message.source !== "edgecase-widget") {
      return;
    }
    if (message.type === "REQUEST_CODE_SNAPSHOT") {
      scan();
    }
  });

  setInterval(scan, 1400);
})();
