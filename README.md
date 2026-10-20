<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="extension/edgecase-logo-lightgray.svg" />
    <img src="extension/edgecase-logo.svg" alt="Edgecase logo" width="96" height="96" />
  </picture>
  <h1>Edgecase</h1>
  <p>An AI coding interview coach, right beside your editor.</p>
  <p><a href="#get-started">Get started</a> · <a href="#coaching-controls">Coaching controls</a> · <a href="#code-context">Code context</a> · <a href="#development">Development</a></p>
</div>

Edgecase is a Chrome Manifest V3 extension for LeetCode, NeetCode, and HackerRank. It reads the problem and your editor code, then helps you reason through the next step without leaving the page.

## Features

- **Guidance by default.** Questions and small hints help you work toward the answer. Turn on **Direct answers** to allow answers and complete solutions when requested.
- **Problem-aware conversations.** Automatically extracts the title, description, examples, and constraints where available.
- **Code attached to each request.** Requests a new editor snapshot before sending a chat message and stops if capture fails.
- **Streaming you can control.** Cancel a response, scroll up during generation, or jump back to the latest message.
- **Readable explanations.** Compact inline code, syntax highlighting for multiline snippets, and Markdown headings and lists.
- **A workspace on the page.** Draggable, resizable panel, practice timer, quick actions, and per-tab conversation history.
- **Your choice of provider.** OpenAI, Anthropic, or Google Gemini, using your own API key.

## Demo

![Edgecase coaching panel beside the problem editor](https://github.com/user-attachments/assets/5479cde8-45a0-4399-9db1-a17025982155)

## Get started

You need Git, Node.js 20 or later, npm, Chrome, and an API key for your selected provider. No separate application server is required.

### Build and load the extension

```bash
git clone https://github.com/rayanical/edgecase.git
cd edgecase/extension
npm ci
npm run check
npm run build
```

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select the repository's `extension/` directory. The manifest lives there; do not select `dist/`.
4. Open a problem on LeetCode, NeetCode, or HackerRank and click the floating Edgecase launcher.
5. Open **Settings**, choose a provider and model, enter your API key, and save.

The configured default for a new installation is OpenAI's `gpt-5.4-mini`. Existing saved model preferences are preserved. Select a model from the provider-specific list in Settings.

> [!NOTE]
> After rebuilding, reload Edgecase in `chrome://extensions` and refresh the problem page to load the updated content script and editor bridge.

### Install a packaged build

If you have an `Edgecase-extension.zip` build, extract it and load the extracted folder containing `manifest.json` using **Load unpacked**. Chrome does not load the ZIP directly.

## Coaching controls

**Direct answers** starts **Off**, and your selection is saved across reloads.

| Control | Behavior |
| --- | --- |
| Direct answers: Off | Guides with questions and nudges, even when you request an answer or full solution. |
| Direct answers: On | Allows direct answers when asked and complete solutions when clearly requested. Hint requests still receive guidance. |
| Response style | Concise, balanced, or detailed responses; does not change the direct-answer setting. |
| Custom instructions | Adjusts tone and detail within the coaching rules. |

Quick actions cover small hints, data structures, approach, edge cases, complexity, and a full solution. Enable **Direct answers** before requesting a full solution; clicking the quick action does not enable it automatically.

While a response streams, the chat follows the latest message until you scroll up. Return to the bottom or use **Jump to latest** to resume following. Use the stop control to cancel generation.

> [!NOTE]
> Coaching behavior is controlled through the model prompt. AI responses can still make mistakes, so verify suggestions against your code and test cases.

## Code context

Each chat message follows this sequence:

1. The content script requests a new snapshot from the page's editor bridge, with a matching request ID.
2. It waits up to **3 seconds** for a non-empty snapshot. If capture fails or times out, it displays an error and does not send the chat request.
3. The background worker independently rejects requests with a missing or empty snapshot. It does not fall back to previously stored tab code.
4. The provider receives the attached code, extracted problem context, and recent conversation history. The prompt identifies the attached snapshot as the authoritative code for that request.

The bridge supports Monaco, CodeMirror, and Ace. Editor APIs are preferred where accessible; DOM extraction is used as a fallback. Background scans also keep the panel's code context updated.

> [!IMPORTANT]
> A new scan does not guarantee a complete capture. DOM fallbacks may only expose rendered lines, and pages with multiple editors can expose a different editor model. The 3-second limit bounds the capture wait; it does not validate the snapshot's completeness. A code edit made after capture will be included on the next successful request.

The UI also offers manual code import, but sending a message still requires a successful new automatic capture. An imported or stored snapshot does not bypass this requirement.

## Data and privacy

- Requests go from the extension's background worker to the selected provider. They include problem context, the attached code, recent conversation history, and configured instructions.
- The API key, settings, per-tab history, and tab context are stored in `chrome.storage.local`. API keys are not encrypted by the application.
- History and tab context are removed when the tab closes. Practice timer state uses `chrome.storage.session`.
- Token usage is tracked locally using provider usage when available, with an estimate as a fallback. It is not a billing record.
- The manifest requests `storage`, `tabs`, and `activeTab` permissions, plus access to the supported coding sites and provider API hosts.

Use a provider account and code you are comfortable sending to that provider. Provider API charges apply.

## Development

The extension uses TypeScript, React, Tailwind CSS, Vite, and the Vercel AI SDK. The React panel is mounted inside a Shadow DOM root; a page-world bridge reads editor state and communicates with the content script.

Run commands from `extension/`:

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from the lockfile. |
| `npm run check` | Run TypeScript checks without emitting files. |
| `npm run build` | Build the content script, editor bridge, and background worker into `dist/`. |
| `npm run dev` | Watch and rebuild the content bundle only. Rebuild all bundles after bridge or background changes. |

### Repository layout

```text
extension/
  manifest.json           Chrome permissions, sites, and entry points
  contentScript.js        Loads the bundled content module
  src/
    background/           Provider calls, prompts, settings, history, cancellation
    content/              Page lifecycle, snapshot handshake, editor bridge
    code-context/         Snapshot adapters and DOM extraction
    detection/            Site-specific problem parsers
    widget/               React chat UI, controls, Markdown, and styles
    types/                Shared models and runtime messages
  vite.*.config.ts        Builds for the three runtime bundles
  dist/                   Generated bundles; ignored by Git
```

### Package a build

After `npm run build`, run this from `extension/` to create a ZIP containing the runtime files:

```bash
zip -r -FS Edgecase-extension.zip \
  manifest.json contentScript.js icons dist edgecase-logo-gray.svg
unzip -t Edgecase-extension.zip
```

### Manual verification

After rebuilding and reloading, check that inline identifiers render as compact code, multiline fences retain highlighting, scrolling up interrupts stream following, and the direct-answer setting persists. Edit code before sending a follow-up and verify that the response uses the new snapshot. If the editor is unavailable, sending should fail without making a provider call.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Launcher is missing | Build the extension, load `extension/`, and refresh a supported site. |
| Missing API key or provider error | Save a key for the selected provider and verify model access and account quota. |
| Could not refresh code snapshot | Ensure a supported editor contains code, then retry or refresh the page. Stored code will not be substituted. |
| Response appears to use incomplete code | DOM fallback capture may be partial. Refresh the page and check the editor context; the timeout alone cannot detect incomplete extraction. |
| Full solution produces hints | Turn **Direct answers** on before sending the request. |
| Changes do not appear | Rebuild all bundles, reload the extension, and refresh the problem page. |
