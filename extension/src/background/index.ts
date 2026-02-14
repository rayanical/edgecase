import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ChatHistoryItem, CodeSnapshot, PersonaMode, ProblemContext, Settings, TabState } from "../types/models";
import type { CancelStreamRequest, RpcRequest, StreamEvent, StreamRequest } from "../types/messages";

const SETTINGS_KEY = "edgecaseSettings";
const HISTORY_PREFIX = "edgecaseHistory:";
const TAB_STATE_PREFIX = "edgecaseTabState:";
const MAX_HISTORY_MESSAGES = 30;
const FIXED_TEMPERATURE = 0.2;
const FIXED_MAX_TOKENS = 4000;

const DEFAULT_SETTINGS: Settings = {
  provider: "openai",
  model: "gpt-4o-mini",
  apiKey: "",
  temperature: 0.2,
  maxTokens: 700,
  coachingStyle: "interviewer",
  responseStyle: "balanced",
  systemPromptOverride: "",
  tokenCounter: {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0
  },
  ui: {
    panelRectByHost: {},
    personaByHost: {}
  }
};

class StreamManager {
  private readonly sessions = new Map<string, { controller: AbortController }>();

  async start(port: chrome.runtime.Port, request: StreamRequest): Promise<void> {
    const key = this.sessionKey(request.tabId, request.requestId);
    const controller = new AbortController();
    this.sessions.set(key, { controller });

    const settings = await getSettings();
    if (!settings.apiKey) {
      this.emit(port, { type: "STREAM_ERROR", requestId: request.requestId, error: "Missing API key." });
      this.sessions.delete(key);
      return;
    }

    const tabState = await getTabState(request.tabId);
    const context = request.context || tabState.context;
    const codeSnapshot = request.codeSnapshot || tabState.codeSnapshot;
    const history = await getHistory(request.tabId);

    const systemPrompt = buildSystemPrompt(context, codeSnapshot, settings, request.personaMode);
    const messages = [
      ...history.map((item) => ({ role: item.role, content: item.content })),
      { role: "user" as const, content: request.text }
    ];

    this.emit(port, { type: "STREAM_START", requestId: request.requestId });

    try {
      const model = createModel(settings);
      const result = await streamText({
        model,
        system: systemPrompt,
        messages,
        temperature: FIXED_TEMPERATURE,
        maxTokens: FIXED_MAX_TOKENS,
        abortSignal: controller.signal
      });

      let response = "";
      for await (const delta of result.textStream) {
        response += delta;
        this.emit(port, { type: "STREAM_CHUNK", requestId: request.requestId, chunk: delta });
      }
      const usage = normalizeTokenUsage(await result.usage);
      await incrementTokenCounter(usage);

      const nextHistory = trimHistory([
        ...history,
        { role: "user", content: request.text, ts: Date.now() },
        { role: "assistant", content: response.trim(), ts: Date.now() }
      ]);
      await setHistory(request.tabId, nextHistory);

      this.emit(port, {
        type: "STREAM_DONE",
        requestId: request.requestId,
        history: nextHistory,
        response: response.trim()
      });
    } catch (error) {
      const message = controller.signal.aborted ? "Request canceled." : normalizeStreamError(error);
      this.emit(port, { type: "STREAM_ERROR", requestId: request.requestId, error: message });
    } finally {
      this.sessions.delete(key);
    }
  }

  cancel(request: CancelStreamRequest): void {
    const key = this.sessionKey(request.tabId, request.requestId);
    this.sessions.get(key)?.controller.abort();
  }

  private emit(port: chrome.runtime.Port, payload: StreamEvent): void {
    try {
      port.postMessage(payload);
    } catch {
      // Port can disconnect if the tab reloads.
    }
  }

  private sessionKey(tabId: number, requestId: string): string {
    return `${tabId}:${requestId}`;
  }
}

const streamManager = new StreamManager();

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await Promise.all([
    chrome.storage.local.remove(historyKey(tabId)),
    chrome.storage.local.remove(tabStateKey(tabId))
  ]);
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "edgecase-chat") {
    return;
  }

  port.onMessage.addListener(async (message: StreamRequest | CancelStreamRequest) => {
    if (message.type === "SEND_CHAT_STREAM") {
      await streamManager.start(port, message);
    }
    if (message.type === "CANCEL_CHAT_STREAM") {
      streamManager.cancel(message);
    }
  });
});

chrome.runtime.onMessage.addListener((message: RpcRequest, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "GET_SETTINGS":
        return { settings: await getSettings() };
      case "SAVE_SETTINGS":
        return { settings: await saveSettings(message.settings) };
      case "GET_CHAT_HISTORY":
        return { tabId: message.tabId, history: await getHistory(message.tabId) };
      case "CLEAR_CHAT_HISTORY":
        await clearHistory(message.tabId);
        return { tabId: message.tabId, history: [] };
      case "GET_SENDER_TAB":
        return { tabId: sender?.tab?.id ?? null };
      case "CONTEXT_UPDATE": {
        const tabId = sender?.tab?.id;
        if (!tabId) {
          throw new Error("Context update without tab.");
        }
        const state = await mergeTabState(tabId, { context: message.context });
        return { tabId, context: state.context };
      }
      case "CODE_SNAPSHOT_UPDATE": {
        const tabId = sender?.tab?.id;
        if (!tabId) {
          throw new Error("Code snapshot update without tab.");
        }
        const state = await mergeTabState(tabId, { codeSnapshot: message.snapshot });
        return { tabId, snapshot: state.codeSnapshot };
      }
      case "GET_TAB_STATE": {
        const tabId = message.tabId ?? sender?.tab?.id ?? null;
        if (!tabId) {
          return { tabId: null, state: { context: null, codeSnapshot: null } satisfies TabState };
        }
        return { tabId, state: await getTabState(tabId) };
      }
      case "RESCAN_CONTEXT": {
        const tabId = message.tabId ?? sender?.tab?.id;
        if (!tabId) {
          throw new Error("No tab to rescan.");
        }
        const response = await chrome.tabs.sendMessage(tabId, { type: "EDGECASE_RESCAN_CONTEXT" });
        return { tabId, context: response?.context ?? null };
      }
      default:
        throw new Error("Unknown message type.");
    }
  })()
    .then((payload) => sendResponse({ ok: true, ...payload }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

  return true;
});

function buildSystemPrompt(
  context: ProblemContext | null,
  code: CodeSnapshot | null,
  settings: Settings,
  personaMode?: PersonaMode
): string {
  const coachingInstruction = resolveCoachingInstruction(settings.coachingStyle, personaMode);

  const responseInstruction =
    settings.responseStyle === "concise"
      ? "Keep responses concise and high signal."
      : settings.responseStyle === "detailed"
        ? "Use detailed step-by-step reasoning with pitfalls and tradeoffs."
        : "Balance concise guidance with enough detail to unblock quickly.";

  const contextText = context
    ? [
        `Site: ${context.site}`,
        `URL: ${context.url}`,
        `Title: ${context.title || "Unknown"}`,
        "",
        "Problem Statement:",
        context.description || "(missing)",
        "",
        "Constraints:",
        context.constraints || "(none)",
        "",
        "Examples:",
        context.examples || "(none)",
        "",
        `Extraction Confidence: ${Math.round(context.confidence * 100)}%`
      ].join("\n")
    : "No parsed problem context was found. Ask user to paste statement if needed.";

  const codeText = code?.code?.trim()
    ? [
        "Current Code Snapshot:",
        `Source: ${code.source}`,
        `Language: ${code.language || "unknown"}`,
        code.selection ? `Selection: ${code.selection.start}-${code.selection.end}` : "Selection: none",
        "```",
        code.code,
        "```"
      ].join("\n")
    : "No code snapshot available yet.";

  return [coachingInstruction, responseInstruction, settings.systemPromptOverride.trim(), contextText, codeText]
    .filter(Boolean)
    .join("\n\n");
}

function resolveCoachingInstruction(style: Settings["coachingStyle"], personaMode?: PersonaMode): string {
  if (personaMode === "collaborator") {
    return "You are a collaborative coding partner. Be direct, practical, and unblock quickly with concise snippets when useful. If user explicitly asks for full solution, provide it.";
  }
  if (personaMode === "interviewer") {
    return "You are a strict technical interviewer. Use Socratic coaching, ask clarifying questions, and avoid full code unless user explicitly asks for full solution.";
  }

  if (style === "collaborative") {
    return "You are a collaborative coding coach. Give practical guidance and direct next steps.";
  }
  if (style === "socratic") {
    return "You are a Socratic coding coach. Ask concise guiding questions before giving direct answers.";
  }
  return "You are a mock technical interviewer and reasoning coach. Use progressive hints and avoid full solutions unless explicitly requested.";
}

function createModel(settings: Settings) {
  if (settings.provider === "openai") {
    const openai = createOpenAI({ apiKey: settings.apiKey });
    return openai(settings.model);
  }
  if (settings.provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey: settings.apiKey });
    return anthropic(settings.model);
  }

  const google = createGoogleGenerativeAI({ apiKey: settings.apiKey });
  return google(settings.model);
}

function normalizeStreamError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Streaming request failed.";
}

function historyKey(tabId: number): string {
  return `${HISTORY_PREFIX}${tabId}`;
}

function tabStateKey(tabId: number): string {
  return `${TAB_STATE_PREFIX}${tabId}`;
}

async function getSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  const saved = data[SETTINGS_KEY] || {};
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    tokenCounter: {
      ...DEFAULT_SETTINGS.tokenCounter,
      ...((saved as Partial<Settings>).tokenCounter || {})
    },
    ui: {
      ...DEFAULT_SETTINGS.ui,
      ...(saved.ui || {}),
      panelRectByHost: {
        ...DEFAULT_SETTINGS.ui.panelRectByHost,
        ...((saved.ui || {}).panelRectByHost || {})
      },
      personaByHost: {
        ...DEFAULT_SETTINGS.ui.personaByHost,
        ...((saved.ui || {}).personaByHost || {})
      }
    }
  };
}

async function saveSettings(partial: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = {
    ...current,
    ...partial,
    provider: normalizeProvider(partial.provider ?? current.provider),
    model: (partial.model ?? current.model).trim(),
    apiKey: (partial.apiKey ?? current.apiKey).trim(),
    temperature: FIXED_TEMPERATURE,
    maxTokens: FIXED_MAX_TOKENS,
    coachingStyle: normalizeCoachingStyle(partial.coachingStyle ?? current.coachingStyle),
    responseStyle: normalizeResponseStyle(partial.responseStyle ?? current.responseStyle),
    systemPromptOverride: (partial.systemPromptOverride ?? current.systemPromptOverride).trim(),
    tokenCounter: {
      ...current.tokenCounter,
      ...(partial.tokenCounter || {})
    },
    ui: {
      ...current.ui,
      ...(partial.ui || {})
    }
  };

  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

function normalizeTokenUsage(raw: unknown): TokenUsage {
  const usage = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const promptTokens = toNonNegativeInt(usage.promptTokens) || toNonNegativeInt(usage.inputTokens);
  const completionTokens = toNonNegativeInt(usage.completionTokens) || toNonNegativeInt(usage.outputTokens);
  const directTotal = toNonNegativeInt(usage.totalTokens) || toNonNegativeInt(usage.total);
  const totalTokens = directTotal || promptTokens + completionTokens;

  return {
    promptTokens,
    completionTokens,
    totalTokens
  };
}

function toNonNegativeInt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

async function incrementTokenCounter(usage: TokenUsage): Promise<void> {
  const settings = await getSettings();
  const next = {
    totalTokens: Math.max(0, settings.tokenCounter.totalTokens + (usage.totalTokens || 0)),
    promptTokens: Math.max(0, settings.tokenCounter.promptTokens + (usage.promptTokens || 0)),
    completionTokens: Math.max(0, settings.tokenCounter.completionTokens + (usage.completionTokens || 0))
  };
  await saveSettings({ tokenCounter: next });
}

async function getHistory(tabId: number): Promise<ChatHistoryItem[]> {
  const data = await chrome.storage.local.get(historyKey(tabId));
  return (data[historyKey(tabId)] as ChatHistoryItem[]) || [];
}

async function setHistory(tabId: number, history: ChatHistoryItem[]): Promise<void> {
  await chrome.storage.local.set({ [historyKey(tabId)]: history });
}

async function clearHistory(tabId: number): Promise<void> {
  await chrome.storage.local.remove(historyKey(tabId));
}

function trimHistory(history: ChatHistoryItem[]): ChatHistoryItem[] {
  if (history.length <= MAX_HISTORY_MESSAGES) {
    return history;
  }
  return history.slice(history.length - MAX_HISTORY_MESSAGES);
}

async function getTabState(tabId: number): Promise<TabState> {
  const data = await chrome.storage.local.get(tabStateKey(tabId));
  return (data[tabStateKey(tabId)] as TabState) || { context: null, codeSnapshot: null };
}

async function mergeTabState(tabId: number, patch: Partial<TabState>): Promise<TabState> {
  const next: TabState = {
    ...(await getTabState(tabId)),
    ...patch
  };
  await chrome.storage.local.set({ [tabStateKey(tabId)]: next });
  return next;
}

function normalizeProvider(provider: Settings["provider"]): Settings["provider"] {
  if (provider === "openai" || provider === "anthropic" || provider === "gemini") {
    return provider;
  }
  return "openai";
}

function normalizeCoachingStyle(style: Settings["coachingStyle"]): Settings["coachingStyle"] {
  if (style === "interviewer" || style === "collaborative" || style === "socratic") {
    return style;
  }
  return "interviewer";
}

function normalizeResponseStyle(style: Settings["responseStyle"]): Settings["responseStyle"] {
  if (style === "concise" || style === "balanced" || style === "detailed") {
    return style;
  }
  return "balanced";
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}
