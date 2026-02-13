import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../widget/App";
import cssText from "../widget/theme.css?inline";
import type {
  CancelStreamRequest,
  RpcRequest,
  RpcResponse,
  StreamEvent,
  StreamRequest
} from "../types/messages";
import type { ChatHistoryItem, CodeSnapshot, ProblemContext, Settings, TabState } from "../types/models";
import { detectDomEditorSnapshot, detectTextareaSnapshot, installBridgeListener } from "../code-context/adapters";
import { extractProblemContext } from "../detection/parsers";
import { contextSignature } from "../detection/shared";

type StatusType = "ok" | "warn" | "error";

type PanelRect = { x: number; y: number; width: number; height: number };

const DEFAULT_RECT: PanelRect = {
  x: Math.max(12, window.innerWidth - 440),
  y: 48,
  width: Math.min(420, window.innerWidth - 24),
  height: Math.min(760, window.innerHeight - 28)
};

const hostKey = location.hostname;

const state = {
  tabId: 0,
  isOpen: false,
  panelRect: { ...DEFAULT_RECT },
  statusText: "Scanning page...",
  statusType: "warn" as StatusType,
  context: null as ProblemContext | null,
  codeSnapshot: null as CodeSnapshot | null,
  history: [] as ChatHistoryItem[],
  settings: null as Settings | null,
  sending: false,
  requestId: null as string | null
};

let render: (() => void) | null = null;
let port: chrome.runtime.Port | null = null;
let lastContextSignature = "";
let mutationTimer: number | null = null;
let urlSnapshot = location.href;

void bootstrap();

async function bootstrap() {
  state.tabId = (await rpc({ type: "GET_SENDER_TAB" })).tabId || 0;
  state.settings = (await rpc({ type: "GET_SETTINGS" })).settings;
  if (!state.settings) {
    throw new Error("Settings unavailable.");
  }
  applyPersistedUiPrefs(state.settings);

  const tabState = (await rpc({ type: "GET_TAB_STATE", tabId: state.tabId })).state;
  hydrateTabState(tabState);

  await loadHistory();
  mountApp();

  installPageBridge();
  installObservers();
  connectPort();

  await publishContextIfChanged(true);
  await publishCodeSnapshot(detectDomEditorSnapshot() || detectTextareaSnapshot());
}

function mountApp() {
  const host = document.createElement("div");
  host.id = "edgecase-widget-host";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const styleTag = document.createElement("style");
  styleTag.textContent = cssText;
  shadow.appendChild(styleTag);

  const mount = document.createElement("div");
  shadow.appendChild(mount);
  const root = createRoot(mount);

  render = () => {
    if (!state.settings) {
      return;
    }

    root.render(
      <App
        isOpen={state.isOpen}
        panelRect={state.panelRect}
        context={state.context}
        statusText={state.statusText}
        statusType={state.statusType}
        history={state.history}
        sending={state.sending}
        codeSnapshot={state.codeSnapshot}
        settings={state.settings}
        onToggleOpen={() => {
          state.isOpen = !state.isOpen;
          rerender();
        }}
        onClose={() => {
          state.isOpen = false;
          rerender();
        }}
        onStartDrag={startDrag}
        onStartResize={startResize}
        onRescan={() => {
          void publishContextIfChanged(true);
        }}
        onSend={(text) => {
          void sendMessage(text);
        }}
        onCancel={() => {
          cancelMessage();
        }}
        onClear={() => {
          void clearChat();
        }}
        onSaveSettings={(next) => {
          return saveSettings(next);
        }}
        onManualCodeSnapshot={(code) => {
          if (!code) return;
          void publishCodeSnapshot({
            source: "manual",
            language: null,
            code,
            selection: null,
            updatedAt: new Date().toISOString()
          });
        }}
      />
    );
  };

  render();
}

function rerender() {
  render?.();
}

function connectPort() {
  port = chrome.runtime.connect({ name: "edgecase-chat" });

  port.onMessage.addListener((message: StreamEvent) => {
    if (!state.requestId || message.requestId !== state.requestId) {
      return;
    }

    if (message.type === "STREAM_START") {
      state.statusText = "Streaming...";
      state.statusType = "ok";
      rerender();
      return;
    }

    if (message.type === "STREAM_CHUNK") {
      appendStreamChunk(message.chunk);
      return;
    }

    if (message.type === "STREAM_DONE") {
      state.history = message.history;
      state.sending = false;
      state.requestId = null;
      state.statusText = "Ready";
      state.statusType = "ok";
      rerender();
      return;
    }

    if (message.type === "STREAM_ERROR") {
      state.sending = false;
      state.requestId = null;
      state.statusText = `Error: ${message.error}`;
      state.statusType = "error";
      const nextHistory = [...state.history];
      const last = nextHistory[nextHistory.length - 1];
      if (last && last.role === "assistant" && last.content === "") {
        nextHistory.pop();
      }
      state.history = nextHistory;
      rerender();
    }
  });
}

function appendStreamChunk(chunk: string) {
  const nextHistory = [...state.history];
  const last = nextHistory[nextHistory.length - 1];
  if (last && last.role === "assistant") {
    last.content += chunk;
  }
  state.history = nextHistory;
  rerender();
}

async function sendMessage(text: string) {
  if (!text.trim() || state.sending || !port || !state.tabId) {
    return;
  }

  state.sending = true;
  state.requestId = createRequestId();
  state.history = [
    ...state.history,
    { role: "user", content: text, ts: Date.now() },
    { role: "assistant", content: "", ts: Date.now() }
  ];
  state.statusText = "Sending...";
  state.statusType = "warn";
  rerender();

  const payload: StreamRequest = {
    type: "SEND_CHAT_STREAM",
    tabId: state.tabId,
    requestId: state.requestId,
    text,
    context: state.context,
    codeSnapshot: state.codeSnapshot
  };

  port.postMessage(payload);
}

function cancelMessage() {
  if (!state.requestId || !state.tabId || !port) {
    return;
  }

  const payload: CancelStreamRequest = {
    type: "CANCEL_CHAT_STREAM",
    tabId: state.tabId,
    requestId: state.requestId
  };
  port.postMessage(payload);
}

async function clearChat() {
  if (!state.tabId) {
    return;
  }
  const response = await rpc({ type: "CLEAR_CHAT_HISTORY", tabId: state.tabId });
  state.history = response.history;
  state.statusText = "Chat cleared";
  state.statusType = "ok";
  rerender();
}

async function saveSettings(next: Partial<Settings>): Promise<void> {
  const response = await rpc({ type: "SAVE_SETTINGS", settings: next });
  state.settings = response.settings;
  state.statusText = "Settings saved";
  state.statusType = "ok";
  rerender();
}

async function loadHistory() {
  if (!state.tabId) {
    state.history = [];
    return;
  }
  const response = await rpc({ type: "GET_CHAT_HISTORY", tabId: state.tabId });
  state.history = response.history;
}

function installPageBridge() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("dist/pageBridge.js");
  script.async = false;
  (document.head || document.documentElement).appendChild(script);
  script.remove();

  installBridgeListener((snapshot) => {
    void publishCodeSnapshot(snapshot);
  });

  setInterval(() => {
    window.postMessage({ source: "edgecase-widget", type: "REQUEST_CODE_SNAPSHOT" }, "*");
    void publishCodeSnapshot(detectDomEditorSnapshot() || detectTextareaSnapshot());
  }, 1600);
}

async function publishCodeSnapshot(snapshot: CodeSnapshot | null) {
  if (!snapshot || !snapshot.code.trim()) {
    return;
  }

  if (state.codeSnapshot?.code === snapshot.code && state.codeSnapshot?.source === snapshot.source) {
    return;
  }

  state.codeSnapshot = snapshot;
  await rpc({ type: "CODE_SNAPSHOT_UPDATE", snapshot });
  rerender();
}

function installObservers() {
  const observer = new MutationObserver(() => {
    if (mutationTimer) {
      window.clearTimeout(mutationTimer);
    }
    mutationTimer = window.setTimeout(() => {
      void publishContextIfChanged(false);
    }, 500);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  const originalPush = history.pushState;
  const originalReplace = history.replaceState;

  history.pushState = function patchedPushState(...args) {
    originalPush.apply(this, args);
    onUrlPotentiallyChanged();
  };

  history.replaceState = function patchedReplaceState(...args) {
    originalReplace.apply(this, args);
    onUrlPotentiallyChanged();
  };

  window.addEventListener("popstate", onUrlPotentiallyChanged);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "EDGECASE_RESCAN_CONTEXT") {
      return;
    }

    publishContextIfChanged(true)
      .then(() => sendResponse({ context: state.context }))
      .catch(() => sendResponse({ context: null }));
    return true;
  });

  setInterval(onUrlPotentiallyChanged, 900);
}

function onUrlPotentiallyChanged() {
  if (location.href !== urlSnapshot) {
    urlSnapshot = location.href;
    void publishContextIfChanged(true);
  }
}

async function publishContextIfChanged(force: boolean) {
  const context = extractProblemContext();
  if (!context) {
    state.statusText = "No problem context found";
    state.statusType = "warn";
    rerender();
    return;
  }

  const signature = contextSignature(context);
  if (!force && signature === lastContextSignature) {
    return;
  }

  lastContextSignature = signature;
  state.context = context;
  state.statusText = context.confidence >= 0.7 ? "Ready" : "Partial context detected";
  state.statusType = context.confidence >= 0.7 ? "ok" : "warn";
  await rpc({ type: "CONTEXT_UPDATE", context });
  rerender();
}

function applyPersistedUiPrefs(settings: Settings) {
  const rect = settings.ui.panelRectByHost[hostKey];
  if (rect) {
    state.panelRect = clampRect(rect);
  }
}

function persistUiPrefs() {
  if (!state.settings) {
    return;
  }

  const ui = {
    ...state.settings.ui,
    panelRectByHost: {
      ...state.settings.ui.panelRectByHost,
      [hostKey]: state.panelRect
    }
  };

  void rpc({ type: "SAVE_SETTINGS", settings: { ui } })
    .then((response) => {
      state.settings = response.settings;
    })
    .catch(() => {
      // Keep UI responsive even if preference persistence fails.
    });
}

function startDrag(event: React.MouseEvent<HTMLDivElement>) {
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  const initial = { ...state.panelRect };

  const move = (ev: MouseEvent) => {
    const next = {
      ...initial,
      x: initial.x + (ev.clientX - startX),
      y: initial.y + (ev.clientY - startY)
    };

    state.panelRect = clampRect(next);
    rerender();
  };

  const up = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
    persistUiPrefs();
  };

  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
}

function startResize(event: React.MouseEvent<HTMLDivElement>) {
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  const initial = { ...state.panelRect };

  const move = (ev: MouseEvent) => {
    const next = {
      ...initial,
      width: Math.max(320, initial.width + (ev.clientX - startX)),
      height: Math.max(340, initial.height + (ev.clientY - startY))
    };

    state.panelRect = clampRect(next);
    rerender();
  };

  const up = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
    persistUiPrefs();
  };

  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
}

function clampRect(rect: PanelRect): PanelRect {
  const maxWidth = Math.max(320, window.innerWidth - 16);
  const maxHeight = Math.max(300, window.innerHeight - 16);

  const width = Math.min(rect.width, maxWidth);
  const height = Math.min(rect.height, maxHeight);

  const x = Math.min(Math.max(8, rect.x), Math.max(8, window.innerWidth - width - 8));
  const y = Math.min(Math.max(8, rect.y), Math.max(8, window.innerHeight - height - 8));

  return { x, y, width, height };
}

function hydrateTabState(tabState: TabState) {
  state.context = tabState.context;
  state.codeSnapshot = tabState.codeSnapshot;
  if (state.context) {
    state.statusText = state.context.confidence >= 0.7 ? "Ready" : "Partial context detected";
    state.statusType = state.context.confidence >= 0.7 ? "ok" : "warn";
    lastContextSignature = contextSignature(state.context);
  }
}

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isFailure(response: RpcResponse): response is Extract<RpcResponse, { ok: false }> {
  return response.ok === false;
}

async function rpc<T extends RpcRequest>(message: T): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: RpcResponse) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response || isFailure(response)) {
        reject(new Error(response?.error || "Unknown error"));
        return;
      }
      resolve(response);
    });
  });
}
