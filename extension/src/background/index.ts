import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ChatHistoryItem, CodeSnapshot, ProblemContext, Settings, TabState } from "../types/models";
import type { CancelStreamRequest, RpcRequest, StreamEvent, StreamRequest } from "../types/messages";

const SETTINGS_KEY = "edgecaseSettings";
const HISTORY_PREFIX = "edgecaseHistory:";
const TAB_STATE_PREFIX = "edgecaseTabState:";
const MAX_HISTORY_MESSAGES = 30;
const FIXED_TEMPERATURE = 0.2;
const FIXED_MAX_TOKENS = 4000;

const DEFAULT_SETTINGS: Settings = {
  provider: "openai",
  model: "gpt-5.4-mini",
  apiKey: "",
  temperature: 0.2,
  maxTokens: 700,
  responseStyle: "balanced",
  directAnswersEnabled: false,
  systemPromptOverride: "",
  tokenCounter: {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0
  },
  ui: {
    panelRectByHost: {}
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

    const codeSnapshot = request.codeSnapshot;
    if (!codeSnapshot?.code.trim()) {
      this.emit(port, {
        type: "STREAM_ERROR",
        requestId: request.requestId,
        error: "Fresh code snapshot required. No model request was sent."
      });
      this.sessions.delete(key);
      return;
    }

    const tabState = await getTabState(request.tabId);
    const context = request.context || tabState.context;
    const history = await getHistory(request.tabId);

    const systemPrompt = buildSystemPrompt(context, codeSnapshot, settings);
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
      const rawUsage = await resolveStreamUsage(result.usage);
      const usage = normalizeTokenUsage(rawUsage, {
        promptText: serializePromptForTokenEstimate(systemPrompt, messages),
        completionText: response
      });
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

  port.onMessage.addListener(async (message: unknown) => {
    try {
      if (isStreamRequest(message)) {
        await streamManager.start(port, message);
        return;
      }
      if (isCancelStreamRequest(message)) {
        streamManager.cancel(message);
        return;
      }
      console.debug("[Edgecase][stream] Ignoring malformed port message", message);
    } catch (error) {
      if (isStreamRequest(message)) {
        const safeError = normalizeStreamError(error);
        try {
          port.postMessage({
            type: "STREAM_ERROR",
            requestId: message.requestId,
            error: safeError
          } satisfies StreamEvent);
        } catch {
          // Port can disconnect while emitting stream error.
        }
      }
      console.error("[Edgecase][stream] Port message handling failed", error);
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
  settings: Settings
): string {
  const coachingInstruction = resolveCoachingInstruction(settings.directAnswersEnabled);
  const contextDirective =
    "CRITICAL: Problem context is already integrated below. UNDER NO CIRCUMSTANCES should you ask the user to paste or restate the problem description when context is present. Read and use the context block first.";
  const codeDirective =
    "CRITICAL CODE SNAPSHOT CONTRACT: The Current Code Snapshot block below is the latest code supplied by the extension for this request and is the authoritative source of truth. Inspect it before answering. Do not assume it is stale, missing, or different from code in earlier messages when the block is present. Never ask the user to paste or restate code already included there. If no snapshot is attached, do not analyze or modify code.";

  const responseInstruction =
    settings.responseStyle === "concise"
      ? "Keep responses concise and high signal."
      : settings.responseStyle === "detailed"
        ? "Use more detail when it helps, while preserving the user's requested level of directness."
        : "Balance concise guidance with enough detail to unblock quickly.";
  const formattingInstruction =
    "Formatting: use Markdown structure when it improves readability; use ### headings for major explanation sections, bullets for grouped details, inline backticks for identifiers and expressions, and fenced code blocks only for multiline snippets.";

  const contextText = context
    ? [
        contextDirective,
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
    : "No parsed problem context was found. Ask one concise clarifying question only if needed.";

  const codeText = code?.code?.trim()
    ? [
        codeDirective,
        "Current Code Snapshot (latest available for this request):",
        `Source: ${code.source}`,
        `Language: ${code.language || "unknown"}`,
        code.selection ? `Selection: ${code.selection.start}-${code.selection.end}` : "Selection: none",
        "```",
        code.code,
        "```"
      ].join("\n")
    : "No code snapshot attached. This request must not proceed to model analysis.";

  return [settings.systemPromptOverride.trim(), coachingInstruction, responseInstruction, formattingInstruction, contextText, codeText]
    .filter(Boolean)
    .join("\n\n");
}

function resolveCoachingInstruction(directAnswersEnabled: boolean): string {
  return [
    "You are Edgecase, a senior software engineer and coding interview coach.",
    "Your job is to help the user solve coding problems while adapting to what they are actually asking for.",
    "Use the problem context and live code already provided. Never ask the user to paste or restate context or code that is already available.",
    "Infer the user's intent from the current message.",
    directAnswersEnabled
      ? "Direct answers are enabled. Answer focused technical questions directly when asked, and provide a complete solution when the user clearly asks for one."
      : "Direct answers are disabled. Do not provide direct answers, final algorithms, exact bug fixes, complete approaches, or full code, even if the user asks directly. Instead, guide the user with targeted questions and small directional nudges toward the next reasoning step.",
    "When the user expresses uncertainty, asks for a hint, asks to be nudged, or says they are stuck, use a targeted reasoning question or a small directional nudge. When direct answers are disabled, do not reveal the final algorithm, exact bug fix, complete approach, or full code.",
    "When direct answers are enabled, adapt to intent: answer focused technical questions directly, and provide the full solution only when the user clearly asks for a complete solution, implementation, or final answer.",
    "When coaching, make the next reasoning step clear without doing the reasoning for the user. Do not hide a complete answer inside a leading question.",
    "When reviewing code, identify a narrow area to inspect and ask the user to trace or test it. Do not rewrite the code unless the user asks for an implementation or complete solution.",
    "Use one canonical coaching style: collaborative, clear, patient, and technically rigorous. Choose the response structure naturally; do not force every response to contain questions, nudges, headings, or a fixed number of sections.",
    "Concise, balanced, and detailed response styles may change response length only. They must not change this intent policy.",
    "Custom instructions may adjust tone or detail, but they must not override this intent policy."
  ].join(" ");
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
    directAnswersEnabled: saved.directAnswersEnabled === true,
    tokenCounter: {
      ...DEFAULT_SETTINGS.tokenCounter,
      ...((saved as Partial<Settings>).tokenCounter || {})
    },
    ui: {
      panelRectByHost: {
        ...DEFAULT_SETTINGS.ui.panelRectByHost,
        ...((saved.ui || {}).panelRectByHost || {})
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
    directAnswersEnabled: partial.directAnswersEnabled ?? current.directAnswersEnabled,
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

function normalizeTokenUsage(
  raw: unknown,
  fallback?: { promptText: string; completionText: string }
): TokenUsage {
  const usage = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  let promptTokens = toNonNegativeInt(usage.promptTokens) || toNonNegativeInt(usage.inputTokens);
  let completionTokens = toNonNegativeInt(usage.completionTokens) || toNonNegativeInt(usage.outputTokens);
  let directTotal = toNonNegativeInt(usage.totalTokens) || toNonNegativeInt(usage.total);

  if (!hasUsageValues(promptTokens, completionTokens, directTotal) && fallback) {
    promptTokens = estimateTokens(fallback.promptText);
    completionTokens = estimateTokens(fallback.completionText);
    directTotal = promptTokens + completionTokens;
  }

  const totalTokens = Math.max(directTotal, promptTokens + completionTokens);

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
  const previous = settings.tokenCounter;
  console.debug("[Edgecase][tokens] Merge start", { previous, increment: usage });
  const next = {
    totalTokens: Math.max(0, previous.totalTokens + (usage.totalTokens || 0)),
    promptTokens: Math.max(0, previous.promptTokens + (usage.promptTokens || 0)),
    completionTokens: Math.max(0, previous.completionTokens + (usage.completionTokens || 0))
  };
  console.debug("[Edgecase][tokens] Merge result", { previous, increment: usage, next });
  await saveSettings({ tokenCounter: next });
}

async function resolveStreamUsage(
  usagePromise: Promise<unknown> | unknown,
  timeoutMs = 1200
): Promise<unknown> {
  if (!usagePromise || typeof (usagePromise as Promise<unknown>).then !== "function") {
    return usagePromise;
  }
  try {
    const usage = await Promise.race([
      usagePromise as Promise<unknown>,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
    if (usage === null) {
      console.debug("[Edgecase][tokens] Usage resolution timed out");
    }
    return usage;
  } catch (error) {
    console.debug("[Edgecase][tokens] Usage resolution failed", error);
    return undefined;
  }
}

function serializePromptForTokenEstimate(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): string {
  const serializedMessages = messages.map((message) => `${message.role}: ${message.content}`).join("\n");
  return `${systemPrompt}\n${serializedMessages}`.trim();
}

function hasUsageValues(promptTokens: number, completionTokens: number, directTotal: number): boolean {
  return promptTokens > 0 || completionTokens > 0 || directTotal > 0;
}

function estimateTokens(text: string): number {
  if (!text.trim()) {
    return 0;
  }
  return Math.max(1, Math.ceil(text.length / 4));
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStreamRequest(message: unknown): message is StreamRequest {
  return isObjectRecord(message) && message.type === "SEND_CHAT_STREAM";
}

function isCancelStreamRequest(message: unknown): message is CancelStreamRequest {
  return isObjectRecord(message) && message.type === "CANCEL_CHAT_STREAM";
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
