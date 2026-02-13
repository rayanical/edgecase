import type { CodeSnapshot } from "../types/models";

type BridgeMessage =
  | {
      source: "edgecase-page-bridge";
      type: "CODE_SNAPSHOT";
      payload: {
        source: CodeSnapshot["source"];
        language: string | null;
        code: string;
        selection: { start: number; end: number } | null;
      };
    }
  | {
      source: "edgecase-page-bridge";
      type: "CODE_SNAPSHOT_UNAVAILABLE";
    };

export function installBridgeListener(onSnapshot: (snapshot: CodeSnapshot) => void): () => void {
  const handler = (event: MessageEvent<BridgeMessage>) => {
    const data = event.data;
    if (!data || data.source !== "edgecase-page-bridge") {
      return;
    }
    if (data.type !== "CODE_SNAPSHOT") {
      return;
    }

    if (!data.payload.code.trim()) {
      return;
    }

    onSnapshot({
      source: data.payload.source,
      language: data.payload.language,
      code: data.payload.code,
      selection: data.payload.selection,
      updatedAt: new Date().toISOString()
    });
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

export function detectTextareaSnapshot(): CodeSnapshot | null {
  const candidates = Array.from(document.querySelectorAll("textarea"));
  const best = candidates
    .map((el) => ({
      element: el,
      length: (el as HTMLTextAreaElement).value.trim().length
    }))
    .sort((a, b) => b.length - a.length)[0];

  if (!best || best.length < 8) {
    return null;
  }

  const area = best.element as HTMLTextAreaElement;
  return {
    source: "textarea",
    language: null,
    code: area.value,
    selection: {
      start: area.selectionStart ?? 0,
      end: area.selectionEnd ?? area.value.length
    },
    updatedAt: new Date().toISOString()
  };
}

export function detectDomEditorSnapshot(): CodeSnapshot | null {
  const monaco = detectMonacoFromDom();
  if (monaco) {
    return monaco;
  }

  const codemirror = detectCodeMirrorFromDom();
  if (codemirror) {
    return codemirror;
  }

  const ace = detectAceFromDom();
  if (ace) {
    return ace;
  }

  return null;
}

function detectMonacoFromDom(): CodeSnapshot | null {
  const lineNodes = Array.from(
    document.querySelectorAll(".monaco-editor .view-lines .view-line, .monaco-editor .view-line")
  );
  if (lineNodes.length === 0) {
    return null;
  }

  const code = lineNodes
    .map((node) => (node.textContent || "").replace(/\u00a0/g, " "))
    .join("\n")
    .trim();

  if (!code) {
    return null;
  }

  return {
    source: "monaco",
    language: null,
    code,
    selection: null,
    updatedAt: new Date().toISOString()
  };
}

function detectCodeMirrorFromDom(): CodeSnapshot | null {
  const editors = Array.from(document.querySelectorAll(".cm-content"));
  if (editors.length === 0) {
    return null;
  }

  let best = "";
  for (const editor of editors) {
    const text = Array.from(editor.querySelectorAll(".cm-line"))
      .map((line) => line.textContent || "")
      .join("\n")
      .trim();
    if (text.length > best.length) {
      best = text;
    }
  }

  if (!best) {
    return null;
  }

  return {
    source: "codemirror",
    language: null,
    code: best,
    selection: null,
    updatedAt: new Date().toISOString()
  };
}

function detectAceFromDom(): CodeSnapshot | null {
  const lines = Array.from(document.querySelectorAll(".ace_editor .ace_line"))
    .map((line) => line.textContent || "")
    .join("\n")
    .trim();

  if (!lines) {
    return null;
  }

  return {
    source: "ace",
    language: null,
    code: lines,
    selection: null,
    updatedAt: new Date().toISOString()
  };
}
