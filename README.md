# Edgecase

<div align="center">

![Edgecase Logo](extension/edgecase-logo-gray.svg)

**AI-Powered Coding Interview Coach for LeetCode, NeetCode & HackerRank**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://reactjs.org/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome)](https://developer.chrome.com/docs/extensions/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*Your personal AI coach that understands problem context and provides progressive hints - right in your browser.*

</div>

---

## What is Edgecase?

A Chrome extension that acts as your AI coding interview coach. Get context-aware hints, progressive guidance, and interview practice without leaving your problem page.

**Key Features:**
- 🧠 Automatically understands the problem you're working on
- 💡 Progressive hints that don't spoil solutions
- ⏱️ Built-in timer per problem
- 🤖 Works with OpenAI, Anthropic, or Google Gemini
- 🔒 Privacy-first: API keys stored locally

---

## Quick Start

### Installation

```bash
git clone https://github.com/rayanical/edgecase.git
cd edgecase/extension
npm install
npm run build
```

**Load in Chrome:**
1. Navigate to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → Select the `extension` folder

### Setup

1. Visit a problem on LeetCode, NeetCode, or HackerRank
2. Click the **EC** button that appears
3. Enter your API key in Settings
4. Start solving with AI assistance!

**Get API Keys:**
- [OpenAI](https://platform.openai.com/api-keys)
- [Anthropic](https://console.anthropic.com/settings/keys)
- [Google AI](https://makersuite.google.com/app/apikey)

---

## How It Works

### Coaching Modes
- **Interviewer Mode**: Socratic questions, progressive hints
- **Collaborator Mode**: Direct guidance with code snippets

### Quick Actions
- **Small Hint** - Nudge without spoilers
- **Right DSA** - Identify data structures/algorithms
- **Edge Cases** - Test scenarios to consider
- **Complexity Analysis** - Time/space breakdown

### Smart Features
- Detects problem automatically
- Captures your code every 1.6s
- AI sees your implementation for personalized hints
- Timer auto-starts per problem

---

## Architecture

```
extension/
├── src/
│   ├── background/    # AI streaming, settings
│   ├── content/       # React UI, timer logic
│   ├── widget/        # UI components
│   ├── detection/     # Problem extraction
│   └── types/         # TypeScript definitions
├── manifest.json      # Extension manifest
└── vite.*.config.ts   # Build configs
```

**Tech Stack:** React 18 • TypeScript • Tailwind CSS • Vercel AI SDK • Vite

---

## Development

```bash
npm run dev      # Watch mode
npm run build    # Production build
npm run check    # Type checking
```

After building, reload extension in `chrome://extensions/` and refresh problem pages.

---

## Troubleshooting

**Extension not appearing?**
- Verify you're on LeetCode/NeetCode/HackerRank
- Reload extension in `chrome://extensions/`
- Check console (F12) for errors

**Code not captured?**
- Wait 2 seconds after typing
- Use "Import code" button to paste manually
- Supported: Monaco, CodeMirror, Ace, textarea

**API errors?**
- Verify key has no extra spaces
- Check credits/quota with provider
- Try regenerating the key

---

## Contributing

Contributions welcome! Focus areas:
- Platform support (Codeforces, AtCoder, etc.)
- UI improvements
- Bug fixes
- Documentation

**Process:**
1. Fork and create feature branch
2. Make changes following existing code style
3. Test on all platforms
4. Open PR with clear description

---

## License

MIT License - Copyright (c) 2026 Rayan Chahid

---

## Contact

**Rayan Chahid**
- Website: [rayanchahid.com](https://rayanchahid.com)
- GitHub: [@rayanical](https://github.com/rayanical)
- LinkedIn: [rayan-chahid](https://www.linkedin.com/in/rayan-chahid)

---

<div align="center">

**Built with ❤️ for the coding interview community**

[⬆ Back to Top](#edgecase)

</div>
