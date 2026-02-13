const SETTINGS_KEY = "edgecaseSettings";
const HISTORY_PREFIX = "edgecaseHistory:";
const MAX_HISTORY_MESSAGES = 30;

const DEFAULT_SETTINGS = {
  provider: "openai",
  model: "gpt-4o-mini",
  apiKey: "",
  temperature: 0.2,
  maxTokens: 700,
  coachingStyle: "interviewer",
  responseStyle: "balanced",
  systemPromptOverride: ""
};

const problemContextByTab = new Map();
const chatAbortControllerBySession = new Map();

chrome.tabs.onRemoved.addListener(async (tabId) => {
  problemContextByTab.delete(tabId);
  await chrome.storage.local.remove(historyKey(tabId));
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "edgecase-chat") {
    return;
  }

  port.onMessage.addListener(async (message) => {
    if (message?.type === "SEND_CHAT_STREAM") {
      await handleStreamChatRequest(message, port);
    }
    if (message?.type === "CANCEL_CHAT_STREAM") {
      const key = sessionKey(message.tabId, message.requestId);
      chatAbortControllerBySession.get(key)?.abort();
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "CONTEXT_UPDATE":
        return handleContextUpdate(message, sender);
      case "GET_SETTINGS":
        return { settings: await getSettings() };
      case "SAVE_SETTINGS":
        return { settings: await saveSettings(message.settings || {}) };
      case "GET_CHAT_HISTORY":
        return {
          tabId: message.tabId,
          history: await getHistory(message.tabId)
        };
      case "GET_SENDER_TAB":
        return { tabId: sender?.tab?.id || null };
      case "CLEAR_CHAT_HISTORY":
        await clearHistory(message.tabId);
        return { tabId: message.tabId, history: [] };
      case "SEND_CHAT":
        return handleChatRequest(message, sender);
      default:
        throw new Error(`Unknown message type: ${message?.type || "undefined"}`);
    }
  })()
    .then((payload) => sendResponse({ ok: true, ...payload }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

  return true;
});

async function handleContextUpdate(message, sender) {
  const tabId = sender?.tab?.id;
  if (!tabId) {
    throw new Error("Context update received without a valid tab.");
  }

  if (message.context) {
    problemContextByTab.set(tabId, message.context);
  }

  return { tabId, context: problemContextByTab.get(tabId) || null };
}

async function handleChatRequest(message, sender) {
  const tabId = message?.tabId || sender?.tab?.id || (await getActiveTab())?.id;
  const userText = (message?.text || "").trim();

  if (!tabId) {
    throw new Error("No tab selected for chat.");
  }
  if (!userText) {
    throw new Error("Message is empty.");
  }

  const settings = await getSettings();
  if (!settings.apiKey) {
    throw new Error("Missing API key. Add it in Settings.");
  }

  const context = message?.context || problemContextByTab.get(tabId) || null;
  const history = await getHistory(tabId);
  const systemPrompt = buildSystemPrompt(context, settings);
  const providerMessages = buildProviderMessages(systemPrompt, history, userText);

  const assistantText = await callAiProvider(settings, providerMessages, systemPrompt);
  const nextHistory = trimHistory([
    ...history,
    { role: "user", content: userText, ts: Date.now() },
    { role: "assistant", content: assistantText, ts: Date.now() }
  ]);

  await setHistory(tabId, nextHistory);

  return {
    tabId,
    context,
    response: assistantText,
    history: nextHistory
  };
}

async function handleStreamChatRequest(message, port) {
  const tabId = message?.tabId;
  const requestId = message?.requestId;
  const userText = (message?.text || "").trim();

  if (!tabId || !requestId) {
    port.postMessage({ type: "STREAM_ERROR", requestId, error: "Invalid stream session." });
    return;
  }
  if (!userText) {
    port.postMessage({ type: "STREAM_ERROR", requestId, error: "Message is empty." });
    return;
  }

  const settings = await getSettings();
  if (!settings.apiKey) {
    port.postMessage({ type: "STREAM_ERROR", requestId, error: "Missing API key. Add it in Settings." });
    return;
  }

  const context = message?.context || problemContextByTab.get(tabId) || null;
  const history = await getHistory(tabId);
  const systemPrompt = buildSystemPrompt(context, settings);
  const providerMessages = buildProviderMessages(systemPrompt, history, userText);

  const key = sessionKey(tabId, requestId);
  const controller = new AbortController();
  chatAbortControllerBySession.set(key, controller);

  port.postMessage({ type: "STREAM_START", requestId });

  try {
    let assistantText = "";

    if (settings.provider === "openai") {
      assistantText = await callOpenAiStreaming(settings, providerMessages, controller.signal, (chunk) => {
        port.postMessage({ type: "STREAM_CHUNK", requestId, chunk });
      });
    } else {
      assistantText = await callAiProvider(settings, providerMessages, systemPrompt);
      port.postMessage({ type: "STREAM_CHUNK", requestId, chunk: assistantText });
    }

    const nextHistory = trimHistory([
      ...history,
      { role: "user", content: userText, ts: Date.now() },
      { role: "assistant", content: assistantText, ts: Date.now() }
    ]);

    await setHistory(tabId, nextHistory);

    port.postMessage({
      type: "STREAM_DONE",
      requestId,
      history: nextHistory,
      response: assistantText
    });
  } catch (error) {
    if (controller.signal.aborted) {
      port.postMessage({ type: "STREAM_ERROR", requestId, error: "Request canceled." });
    } else {
      port.postMessage({ type: "STREAM_ERROR", requestId, error: error.message || String(error) });
    }
  } finally {
    chatAbortControllerBySession.delete(key);
  }
}

function buildProviderMessages(systemPrompt, history, userText) {
  return [
    { role: "system", content: systemPrompt },
    ...history.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: "user", content: userText }
  ];
}

function buildSystemPrompt(context, settings) {
  const style = (settings.coachingStyle || "interviewer").toLowerCase();
  const responseStyle = (settings.responseStyle || "balanced").toLowerCase();

  const coachingInstruction =
    style === "collaborative"
      ? [
          "You are a collaborative coding coach.",
          "Prioritize clear guidance and practical next steps.",
          "Only reveal full solutions when the user asks for one."
        ].join(" ")
      : style === "socratic"
        ? [
            "You are a Socratic coding coach.",
            "Lead with concise questions and nudges before direct answers.",
            "Give direct answers only if the user asks explicitly."
          ].join(" ")
        : [
            "You are a mock technical interviewer and reasoning coach.",
            "Do not reveal full solutions unless the user explicitly asks for full code/solution.",
            "Start with clarifying questions or small hints when possible.",
            "Push for edge cases, complexity, and tradeoffs.",
            "If the user is stuck, provide progressively stronger hints."
          ].join(" ");

  const responseInstruction =
    responseStyle === "concise"
      ? "Keep answers concise and high signal."
      : responseStyle === "detailed"
        ? "Use step-by-step detail with tradeoffs and common pitfalls."
        : "Balance brevity with enough detail to unblock the user quickly.";

  const customPrompt = (settings.systemPromptOverride || "").trim();

  if (!context) {
    return [
      coachingInstruction,
      responseInstruction,
      customPrompt,
      "No parsed problem context is available. Ask the user to paste the statement if needed."
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const serializedContext = [
    `Site: ${context.site || "unknown"}`,
    `URL: ${context.url || "unknown"}`,
    `Title: ${context.title || "Unknown title"}`,
    "",
    "Problem Statement:",
    context.description || "(missing)",
    "",
    "Constraints:",
    context.constraints || "(none detected)",
    "",
    "Examples:",
    context.examples || "(none detected)"
  ].join("\n");

  return [coachingInstruction, responseInstruction, customPrompt, "Use this parsed problem context:", serializedContext]
    .filter(Boolean)
    .join("\n\n");
}

async function callAiProvider(settings, messages, systemPrompt) {
  if (settings.provider === "openai") {
    return callOpenAi(settings, messages);
  }
  if (settings.provider === "anthropic") {
    return callAnthropic(settings, messages, systemPrompt);
  }
  if (settings.provider === "gemini") {
    return callGemini(settings, messages, systemPrompt);
  }

  throw new Error(`Unsupported provider: ${settings.provider}`);
}

async function callOpenAi(settings, messages) {
  const payload = {
    model: settings.model,
    messages,
    temperature: settings.temperature,
    max_tokens: settings.maxTokens
  };

  const data = await fetchJson("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response did not include message content.");
  }
  return typeof content === "string" ? content.trim() : JSON.stringify(content);
}

async function callOpenAiStreaming(settings, messages, signal, onChunk) {
  const payload = {
    model: settings.model,
    messages,
    temperature: settings.temperature,
    max_tokens: settings.maxTokens,
    stream: true
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText.slice(0, 500)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    pending += decoder.decode(value, { stream: true });
    const segments = pending.split("\n\n");
    pending = segments.pop() || "";

    for (const segment of segments) {
      const lines = segment
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());

      for (const line of lines) {
        if (!line || line === "[DONE]") {
          continue;
        }

        let payloadLine;
        try {
          payloadLine = JSON.parse(line);
        } catch (_error) {
          continue;
        }

        const delta = payloadLine?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          result += delta;
          onChunk(delta);
        }
      }
    }
  }

  if (!result.trim()) {
    throw new Error("OpenAI streaming response did not include message content.");
  }

  return result.trim();
}

async function callAnthropic(settings, messages, systemPrompt) {
  const anthropicMessages = messages
    .filter((msg) => msg.role !== "system")
    .map((msg) => ({ role: msg.role, content: msg.content }));

  const payload = {
    model: settings.model,
    max_tokens: settings.maxTokens,
    temperature: settings.temperature,
    system: systemPrompt,
    messages: anthropicMessages
  };

  const data = await fetchJson("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(payload)
  });

  const output = (data?.content || [])
    .filter((chunk) => chunk.type === "text")
    .map((chunk) => chunk.text)
    .join("\n")
    .trim();

  if (!output) {
    throw new Error("Anthropic response did not include text output.");
  }
  return output;
}

async function callGemini(settings, messages, systemPrompt) {
  const contents = messages
    .filter((msg) => msg.role !== "system")
    .map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

  const payload = {
    systemInstruction: {
      role: "system",
      parts: [{ text: systemPrompt }]
    },
    contents,
    generationConfig: {
      temperature: settings.temperature,
      maxOutputTokens: settings.maxTokens
    }
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    settings.model
  )}:generateContent?key=${encodeURIComponent(settings.apiKey)}`;

  const data = await fetchJson(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const candidate = data?.candidates?.[0];
  const output = (candidate?.content?.parts || [])
    .map((part) => part.text || "")
    .join("\n")
    .trim();

  if (!output) {
    throw new Error("Gemini response did not include text output.");
  }
  return output;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText.slice(0, 500)}`);
  }
  return response.json();
}

function trimHistory(history) {
  if (history.length <= MAX_HISTORY_MESSAGES) {
    return history;
  }
  return history.slice(history.length - MAX_HISTORY_MESSAGES);
}

function historyKey(tabId) {
  return `${HISTORY_PREFIX}${tabId}`;
}

async function getHistory(tabId) {
  if (!tabId) {
    return [];
  }
  const key = historyKey(tabId);
  const data = await chrome.storage.local.get(key);
  return data[key] || [];
}

async function setHistory(tabId, history) {
  if (!tabId) {
    return;
  }
  const key = historyKey(tabId);
  await chrome.storage.local.set({ [key]: history });
}

async function clearHistory(tabId) {
  if (!tabId) {
    return;
  }
  await chrome.storage.local.remove(historyKey(tabId));
}

async function getSettings() {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  const saved = data[SETTINGS_KEY] || {};

  const legacy = {
    coachingStyle: saved.coachingStyle || (saved.strictInterviewer === false ? "collaborative" : "interviewer")
  };

  return { ...DEFAULT_SETTINGS, ...saved, ...legacy };
}

async function saveSettings(settings) {
  const next = {
    provider: normalizeProvider(settings.provider || DEFAULT_SETTINGS.provider),
    model: (settings.model || DEFAULT_SETTINGS.model).trim(),
    apiKey: (settings.apiKey || "").trim(),
    temperature: clampNumber(settings.temperature, 0, 1, DEFAULT_SETTINGS.temperature),
    maxTokens: clampNumber(settings.maxTokens, 100, 4000, DEFAULT_SETTINGS.maxTokens),
    coachingStyle: normalizeCoachingStyle(settings.coachingStyle),
    responseStyle: normalizeResponseStyle(settings.responseStyle),
    systemPromptOverride: (settings.systemPromptOverride || "").trim()
  };

  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

function normalizeProvider(provider) {
  if (provider === "openai" || provider === "anthropic" || provider === "gemini") {
    return provider;
  }
  return DEFAULT_SETTINGS.provider;
}

function normalizeCoachingStyle(style) {
  if (style === "interviewer" || style === "collaborative" || style === "socratic") {
    return style;
  }
  return DEFAULT_SETTINGS.coachingStyle;
}

function normalizeResponseStyle(style) {
  if (style === "concise" || style === "balanced" || style === "detailed") {
    return style;
  }
  return DEFAULT_SETTINGS.responseStyle;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tabs[0] || null;
}

function sessionKey(tabId, requestId) {
  return `${tabId}:${requestId}`;
}
