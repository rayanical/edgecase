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
  const handler = (event: MessageEvent<unknown>) => {
    try {
      const data = event.data;
      if (!isObjectRecord(data) || data.source !== "edgecase-page-bridge") {
        return;
      }
      if (data.type !== "CODE_SNAPSHOT") {
        return;
      }
      if (!isBridgeSnapshotMessage(data) || !data.payload.code.trim()) {
        return;
      }

      onSnapshot({
        source: data.payload.source,
        language: data.payload.language,
        code: data.payload.code,
        selection: data.payload.selection,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.debug("[Edgecase][bridge] adapter bridge listener failed", error);
    }
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
  const editors = queryAllDeep(".monaco-editor");
  if (editors.length === 0) {
    return null;
  }

  let code = "";
  for (const editor of editors) {
    const lines = Array.from(editor.querySelectorAll(".view-lines .view-line, .view-line"))
      .map((node) => (node.textContent || "").replace(/\u00a0/g, " "))
      .join("\n")
      .trim();
    if (lines.length > code.length) {
      code = lines;
    }
  }

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

function queryAllDeep(selector: string): Element[] {
  const results: Element[] = [];
  for (const root of collectQueryRoots()) {
    results.push(...Array.from(root.querySelectorAll(selector)));
  }
  return results;
}

function collectQueryRoots(): ParentNode[] {
  const roots: ParentNode[] = [];
  const queue: ParentNode[] = [document];
  const seen = new Set<ParentNode>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    roots.push(current);

    const elements = Array.from(current.querySelectorAll("*"));
    for (const element of elements) {
      const shadow = (element as HTMLElement).shadowRoot;
      if (shadow && !seen.has(shadow)) {
        queue.push(shadow);
      }
    }
  }

  return roots;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBridgeSnapshotMessage(value: Record<string, unknown>): value is Extract<BridgeMessage, { type: "CODE_SNAPSHOT" }> {
  if (!isObjectRecord(value.payload)) {
    return false;
  }
  return (
    typeof value.payload.code === "string" &&
    (value.payload.language === null || typeof value.payload.language === "string") &&
    (value.payload.selection === null || isSelectionRange(value.payload.selection))
  );
}

function isSelectionRange(value: unknown): value is { start: number; end: number } {
  return (
    isObjectRecord(value) &&
    typeof value.start === "number" &&
    Number.isFinite(value.start) &&
    typeof value.end === "number" &&
    Number.isFinite(value.end)
  );
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
