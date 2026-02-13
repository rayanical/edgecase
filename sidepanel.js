const el = {
  statusText: document.getElementById("statusText"),
  problemTitle: document.getElementById("problemTitle"),
  problemMeta: document.getElementById("problemMeta"),
  problemPreview: document.getElementById("problemPreview"),
  provider: document.getElementById("provider"),
  model: document.getElementById("model"),
  apiKey: document.getElementById("apiKey"),
  temperature: document.getElementById("temperature"),
  maxTokens: document.getElementById("maxTokens"),
  coachingStyle: document.getElementById("coachingStyle"),
  responseStyle: document.getElementById("responseStyle"),
  systemPromptOverride: document.getElementById("systemPromptOverride"),
  autoOpenPanel: document.getElementById("autoOpenPanel"),
  settingsForm: document.getElementById("settingsForm"),
  refreshContextButton: document.getElementById("refreshContextButton"),
  chat: document.getElementById("chat"),
  composer: document.getElementById("composer"),
  messageInput: document.getElementById("messageInput"),
  sendButton: document.getElementById("sendButton"),
  stopButton: document.getElementById("stopButton"),
  clearChatButton: document.getElementById("clearChatButton")
};

const state = {
  tabId: null,
  context: null,
  history: [],
  sending: false,
  requestId: null
};

let chatPort = null;

init();

async function init() {
  connectPort();
  bindEvents();

  await loadSettings();
  await refreshContext(false);
  await loadHistory();
  renderChat();

  setInterval(async () => {
    if (state.sending) {
      return;
    }
    await syncActiveTabContext();
  }, 1400);
}

function connectPort() {
  chatPort = chrome.runtime.connect({ name: "edgecase-chat" });

  chatPort.onMessage.addListener((message) => {
    if (!message || message.requestId !== state.requestId) {
      return;
    }

    if (message.type === "STREAM_START") {
      setStatus("Streaming response...");
      return;
    }

    if (message.type === "STREAM_CHUNK") {
      appendStreamChunk(message.chunk || "");
      return;
    }

    if (message.type === "STREAM_DONE") {
      state.history = message.history || state.history;
      finalizeStreaming(false);
      renderChat();
      setStatus("Assistant responded.");
      return;
    }

    if (message.type === "STREAM_ERROR") {
      finalizeStreaming(true);
      renderError(message.error || "Request failed.");
      setStatus("Request failed.");
    }
  });
}

function bindEvents() {
  el.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveSettings();
  });

  el.refreshContextButton.addEventListener("click", async () => {
    await refreshContext(true);
    await loadHistory();
    renderChat();
  });

  el.composer.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendUserMessage(el.messageInput.value);
  });

  el.stopButton.addEventListener("click", () => {
    if (!state.requestId || !state.tabId || !chatPort) {
      return;
    }
    chatPort.postMessage({
      type: "CANCEL_CHAT_STREAM",
      tabId: state.tabId,
      requestId: state.requestId
    });
  });

  el.clearChatButton.addEventListener("click", async () => {
    if (!state.tabId) {
      return;
    }
    await rpc({ type: "CLEAR_CHAT_HISTORY", tabId: state.tabId });
    state.history = [];
    renderChat();
    setStatus("Chat cleared for this tab.");
  });

  document.querySelectorAll(".quick-actions button").forEach((button) => {
    button.addEventListener("click", async () => {
      await sendUserMessage(button.dataset.prompt || "");
    });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "ACTIVE_CONTEXT_UPDATED") {
      return;
    }
    if (!state.tabId || message.tabId !== state.tabId) {
      return;
    }

    state.context = message.context || null;
    if (state.context) {
      renderContext(state.context);
    }
  });
}

async function syncActiveTabContext() {
  const previousTab = state.tabId;
  const response = await rpc({ type: "GET_ACTIVE_TAB_CONTEXT" });

  if (response.tabId !== previousTab) {
    state.tabId = response.tabId;
    state.context = response.context;

    if (!response.supported) {
      state.history = [];
      renderNoContext(response.reason || "Unsupported page.");
      renderChat();
      return;
    }

    if (response.context) {
      renderContext(response.context);
    }

    await loadHistory();
    renderChat();
  }
}

async function loadSettings() {
  const response = await rpc({ type: "GET_SETTINGS" });
  const settings = response.settings;

  el.provider.value = settings.provider;
  el.model.value = settings.model;
  el.apiKey.value = settings.apiKey;
  el.temperature.value = settings.temperature;
  el.maxTokens.value = settings.maxTokens;
  el.coachingStyle.value = settings.coachingStyle || "interviewer";
  el.responseStyle.value = settings.responseStyle || "balanced";
  el.systemPromptOverride.value = settings.systemPromptOverride || "";
  el.autoOpenPanel.checked = Boolean(settings.autoOpenPanel);
}

async function saveSettings() {
  const payload = {
    provider: el.provider.value,
    model: el.model.value,
    apiKey: el.apiKey.value,
    temperature: Number(el.temperature.value),
    maxTokens: Number(el.maxTokens.value),
    coachingStyle: el.coachingStyle.value,
    responseStyle: el.responseStyle.value,
    systemPromptOverride: el.systemPromptOverride.value,
    autoOpenPanel: el.autoOpenPanel.checked
  };

  await rpc({ type: "SAVE_SETTINGS", settings: payload });
  setStatus("Settings saved.");
}

async function refreshContext(forceExtract) {
  setStatus("Checking active page...");

  if (forceExtract) {
    await rpc({ type: "EXTRACT_NOW" });
  }

  const response = await rpc({ type: "GET_ACTIVE_TAB_CONTEXT" });
  state.tabId = response.tabId;
  state.context = response.context;

  if (!response.supported) {
    renderNoContext(response.reason || "Unsupported page.");
    return;
  }

  if (!response.context) {
    renderNoContext("Problem page detected, waiting for extraction...");
    return;
  }

  renderContext(response.context);
}

async function loadHistory() {
  if (!state.tabId) {
    state.history = [];
    return;
  }

  const response = await rpc({ type: "GET_CHAT_HISTORY", tabId: state.tabId });
  state.history = response.history || [];
}

function renderNoContext(reason) {
  el.problemTitle.textContent = "No problem detected";
  el.problemMeta.textContent = "";
  el.problemPreview.textContent = reason;
  setStatus(reason);
}

function renderContext(context) {
  el.problemTitle.textContent = context.title || "Untitled problem";
  el.problemMeta.textContent = [context.site, context.url].filter(Boolean).join(" • ");

  const previewSource = context.description || context.constraints || context.examples || "";
  el.problemPreview.textContent = previewSource.slice(0, 300) || "Problem found.";

  setStatus("Problem context loaded.");
}

function renderChat() {
  el.chat.innerHTML = "";

  if (state.history.length === 0) {
    const intro = document.createElement("div");
    intro.className = "message assistant";
    intro.textContent = "Use quick actions for hints, DSA direction, approach checks, or full solution.";
    el.chat.appendChild(intro);
    return;
  }

  for (const msg of state.history) {
    const node = document.createElement("div");
    const roleClass = msg.role === "assistant" ? "assistant" : "user";
    const streamClass = msg.streaming ? " streaming" : "";
    node.className = `message ${roleClass}${streamClass}`;
    node.textContent = msg.content;
    el.chat.appendChild(node);
  }

  el.chat.scrollTop = el.chat.scrollHeight;
}

function renderError(text) {
  const node = document.createElement("div");
  node.className = "message error";
  node.textContent = text;
  el.chat.appendChild(node);
  el.chat.scrollTop = el.chat.scrollHeight;
}

async function sendUserMessage(rawText) {
  const text = (rawText || "").trim();
  if (!text || state.sending || !state.tabId) {
    return;
  }

  state.sending = true;
  state.requestId = createRequestId();
  setComposerDisabled(true);

  state.history = [
    ...state.history,
    { role: "user", content: text, ts: Date.now() },
    { role: "assistant", content: "", ts: Date.now(), streaming: true, requestId: state.requestId }
  ];

  renderChat();
  el.messageInput.value = "";

  chatPort.postMessage({
    type: "SEND_CHAT_STREAM",
    tabId: state.tabId,
    requestId: state.requestId,
    text
  });
}

function appendStreamChunk(chunk) {
  if (!chunk) {
    return;
  }

  const last = state.history[state.history.length - 1];
  if (!last || !last.streaming || last.requestId !== state.requestId) {
    return;
  }

  last.content += chunk;
  renderChat();
}

function finalizeStreaming(isError) {
  state.sending = false;
  setComposerDisabled(false);

  if (isError) {
    const last = state.history[state.history.length - 1];
    if (last?.streaming && last.requestId === state.requestId) {
      state.history.pop();
    }
  }

  state.requestId = null;
}

function setComposerDisabled(disabled) {
  el.sendButton.disabled = disabled;
  el.messageInput.disabled = disabled;
  el.stopButton.hidden = !disabled;
  el.stopButton.disabled = !disabled;
}

function setStatus(text) {
  el.statusText.textContent = text;
}

function createRequestId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function rpc(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "Unknown error"));
        return;
      }
      resolve(response);
    });
  });
}
