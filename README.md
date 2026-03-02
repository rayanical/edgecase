<div align="center">
  <h1>Edgecase</h1>
  <p><strong>An AI-powered browser extension for technical interview prep and algorithm coaching.</strong></p>

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](#)
  [![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](#)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](#)
  [![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-000000?style=flat-square&logo=vercel&logoColor=white)](#)
</div>

## 📌 Overview
Edgecase is a Chrome Extension designed to act as a real-time Senior Staff Engineer during your algorithmic practice. Instead of just handing out solutions, it automatically bridges into your live coding environment (LeetCode, NeetCode, HackerRank) and uses Socratic coaching to guide you through optimal time/space complexities, edge cases, and architectural tradeoffs.

## ✨ Key Features & Engineering
* **Live DOM Editor Syncing:** Implements deep DOM scanning and a `window.postMessage` bridge to extract live code state and cursor selections across various editor instances (Monaco, CodeMirror, Ace) without requiring manual copy-pasting.
* **Agentic Context Extraction:** Automatically parses problem constraints, examples, and descriptions directly from the active webpage, injecting them securely into the LLM's system prompt.
* **Streaming AI Architecture:** Utilizes the Vercel AI SDK inside a Chrome Background Service Worker to stream tokens in real-time, ensuring a low-latency chat experience that feels like a live interview.
* **Multi-Provider Support:** Architected to seamlessly switch between OpenAI, Anthropic, and Gemini models with an integrated local token-burn calculator.
* **Stateful Floating UI:** Features a draggable, resizable React overlay built with Tailwind CSS and Radix UI primitives that persists state across tab reloads using `chrome.storage`.

## 📸 Demo
![edgecase](https://github.com/user-attachments/assets/5479cde8-45a0-4399-9db1-a17025982155)


## 🧠 The Architecture
Building AI into a browser extension requires navigating the strict execution environments of Chrome Manifest V3. 
1. **The Page Bridge (`pageBridge.ts`):** Injected directly into the host page to bypass isolation limits, allowing it to hook into global editor instances (like `window.monaco`).
2. **The Content Script (`index.tsx`):** Renders the isolated Shadow DOM React application to prevent CSS bleeding from the host site (e.g., LeetCode's stylesheets overriding the widget).
3. **The Background Worker (`background/index.ts`):** Acts as the central nervous system. It manages the `AbortController` for streaming, holds the API keys securely, and orchestrates the RPC messaging between the UI and the AI providers.

## 🚀 Local Development Setup

### Prerequisites
* Node.js (v18+)
* npm or pnpm
* A Chromium-based browser (Chrome, Edge, Arc)

### Installation
1. Clone the repository:
   ```bash
   git clone [https://github.com/rayanical/edgecase.git](https://github.com/rayanical/edgecase.git)
   cd edgecase/extension
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension for development (watching for changes):
   ```bash
   npm run dev
   ```

### Loading into Chrome
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the `dist` folder generated inside the `extension` directory.
4. Pin the extension, click the icon, add your preferred API key in the settings, and navigate to a LeetCode problem!

## 🛡️ Privacy & Security
Edgecase is strictly client-side. Your API keys are stored locally on your machine using `chrome.storage.local`. Code snapshots and problem context are only sent to the AI provider you explicitly configure when you initiate a chat.
