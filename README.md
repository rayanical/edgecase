# Edgecase

Edgecase is a Chrome extension that adds an in-page AI interview coach to LeetCode, NeetCode, and HackerRank.

It is designed to feel like a real interview partner:
- Streams responses token-by-token
- Understands the current problem context automatically
- Captures your current editor code and uses it in follow-up hints
- Stays lightweight with a draggable grayscale popup UI

## Why It Stands Out

Edgecase is not a generic chatbot wrapper. It combines:
- Site-aware parsing for problem title/description/constraints/examples
- Code-aware prompting from live editor snapshots (Monaco, CodeMirror, Ace, textarea fallback)
- Multi-provider LLM streaming in MV3 background service worker using Vercel AI SDK Core
- In-page UX designed for solving problems without leaving the coding surface

## Feature Highlights

- `Chat-first popup UI`:
  - Floating launcher (`EC`) on supported pages
  - Draggable/resizable panel with viewport clamping
  - Collapsible quick actions and settings sheet

- `Interview coaching controls`:
  - Small hint
  - Right DSA
  - Right approach
  - Edge cases
  - Complexity
  - Full solution

- `Streaming + control`:
  - Real-time response streaming
  - Stop/cancel active generation
  - Auto-scroll while streaming

- `Code context`:
  - Auto-capture from page editors
  - Manual “Import code” fallback
  - Code snapshot included in prompt context for better follow-ups

- `Provider support`:
  - OpenAI
  - Anthropic
  - Gemini

## Architecture

- `/Users/rayan/Documents/Edgecase/src/background/index.ts`
  - Settings/history persistence
  - Tab state (problem + code snapshot)
  - Unified stream manager via `ai` SDK

- `/Users/rayan/Documents/Edgecase/src/content/index.tsx`
  - Content bootstrap
  - Shadow DOM mount
  - Tailwind CSS injection into shadow root
  - Context and code snapshot sync

- `/Users/rayan/Documents/Edgecase/src/content/pageBridge.ts`
  - Page-world editor extraction adapters

- `/Users/rayan/Documents/Edgecase/src/widget/App.tsx`
  - React + shadcn-style UI composition

## Run Locally

1. Install dependencies:
```bash
npm install
```

2. Build extension bundles:
```bash
npm run build
```

3. Open Chrome extensions page:
- `chrome://extensions`
- Enable `Developer mode`
- Click `Load unpacked`
- Select `/Users/rayan/Documents/Edgecase`

4. Visit:
- `https://leetcode.com/problems/two-sum/`
- `https://neetcode.io/`
- `https://www.hackerrank.com/`

You should see the `EC` launcher on supported pages.

## Development Commands

```bash
npm run check   # TypeScript typecheck
npm run build   # Build content, bridge, and background bundles
```

## Notes

- This project uses Manifest V3.
- `dist/` is required for runtime and is produced by `npm run build`.
- If you change source files, reload the extension after rebuilding.

## Product Positioning (Hiring Manager Friendly)

This project demonstrates:
- Browser extension engineering (MV3 service workers, content scripts, runtime messaging)
- Real-time AI streaming UX and cancellation
- Robust prompt orchestration with cross-provider model adapters
- DOM extraction strategies across heterogeneous editors
- Pragmatic frontend architecture under sandboxed browser constraints
