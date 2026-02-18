# Edgecase

<div align="center">

![Edgecase Logo](extension/edgecase-logo-gray.svg)

**AI-Powered Coding Interview Coach for Competitive Programming**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)](https://vitejs.dev/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*Transform your coding interview preparation with an intelligent AI coach that lives right in your browser.*

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## 📖 About

**Edgecase** is a sophisticated Chrome extension that functions as your personal AI coding interview coach for LeetCode, NeetCode, and HackerRank. Unlike generic chatbots, Edgecase is purpose-built to simulate a real interview experience with context-aware assistance, progressive hints, and intelligent code analysis.

### Why Edgecase?

- 🎯 **Interview-First Design**: Mimics real technical interviews with progressive hints and Socratic guidance
- 🧠 **Context Intelligence**: Automatically understands the problem, constraints, and your current code
- ⚡ **Real-Time Streaming**: Token-by-token AI responses with cancel capability
- 🎨 **Unobtrusive UI**: Lightweight, draggable interface that doesn't interfere with your coding flow
- 🔄 **Multi-Editor Support**: Works seamlessly with Monaco, CodeMirror, Ace, and standard textareas
- 🤖 **Multi-Provider AI**: Choose between OpenAI, Anthropic Claude, or Google Gemini

---

## ✨ Features

### 🎓 Interview Coaching Modes

**Interviewer Mode** (Default)
- Socratic questioning approach
- Progressive hints without giving away solutions
- Focuses on understanding and reasoning
- Simulates real interview dynamics

**Collaborator Mode**
- Direct, practical guidance
- Code snippets when helpful
- Faster unblocking
- Balanced assistance level

### 💬 Smart Assistance Controls

- **Small Hint**: Nudge in the right direction without spoilers
- **Right DSA**: Identify optimal data structures and algorithms
- **Right Approach**: High-level solution strategy
- **Edge Cases**: Critical test scenarios to consider
- **Complexity Analysis**: Time and space complexity breakdown
- **Full Solution**: Complete implementation (when explicitly requested)

### 🔍 Intelligent Context Awareness

- **Automatic Problem Detection**: Extracts title, description, constraints, and examples
- **Live Code Capture**: Snapshots your editor every 1.6 seconds
- **Code-Aware Prompting**: AI sees your current implementation for personalized hints
- **Confidence Scoring**: Validates extraction quality (70%+ threshold)

### ⏱️ Built-in Timer

- **Auto-Start**: Begins timing when problem is detected
- **Persistent State**: Saves timer per problem across sessions
- **Problem-Specific**: Separate timers for each unique problem
- **Pause/Resume**: Full control over timing

### 🎨 Modern UI/UX

- **Floating Launcher**: Minimal "EC" button on supported pages
- **Draggable/Resizable Panel**: Customize position and size per site
- **Shadow DOM Isolation**: No style conflicts with host pages
- **Dark/Light Themes**: Grayscale design for minimal distraction
- **Markdown Support**: Code highlighting and formatted responses

### 🤖 AI Provider Support

| Provider | Models Supported | Features |
|----------|------------------|----------|
| **OpenAI** | GPT-4, GPT-4o, GPT-4o-mini | Fast, reliable, excellent for code |
| **Anthropic** | Claude 3 (Opus, Sonnet, Haiku) | Strong reasoning, longer context |
| **Google Gemini** | Gemini 1.5 Pro, Flash | Multimodal, cost-effective |

- Unified streaming interface via Vercel AI SDK
- Real-time token-by-token responses
- Abort/cancel active generations
- Token usage tracking and analytics

---

## 🚀 Installation

### Prerequisites

- **Node.js**: 16.x or higher
- **npm**: 7.x or higher
- **Chrome Browser**: Version 88+ (Manifest V3 support)

### Step 1: Clone the Repository

```bash
git clone https://github.com/rayanical/edgecase.git
cd edgecase
```

### Step 2: Install Dependencies

```bash
cd extension
npm install
```

### Step 3: Build the Extension

```bash
npm run build
```

This creates optimized bundles in `extension/dist/`:
- `contentMain.js` - React UI and content script
- `pageBridge.js` - Editor extraction bridge
- `background.js` - Background service worker
- `assets/` - CSS and static resources

### Step 4: Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `extension` folder from this repository
5. The Edgecase extension should now appear in your extensions list

### Step 5: Configure API Key

1. Visit any supported platform (LeetCode, NeetCode, or HackerRank)
2. Click the **EC** launcher button
3. Expand the **Settings** section
4. Select your preferred AI provider
5. Enter your API key
6. Choose your model and coaching preferences

### Getting API Keys

- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Anthropic**: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- **Google AI**: [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

---

## 📱 Usage

### Supported Platforms

- ✅ **LeetCode**: leetcode.com
- ✅ **NeetCode**: neetcode.io
- ✅ **HackerRank**: hackerrank.com

### Quick Start

1. **Navigate to a problem page** on any supported platform
2. **Look for the "EC" button** in the bottom-right corner
3. **Click to open** the Edgecase panel
4. **Start solving!** The AI automatically understands the problem context

### Basic Workflow

```
1. Open a coding problem
   ↓
2. Edgecase detects problem context automatically
   ↓
3. Timer starts (optional - can pause/reset)
   ↓
4. Start coding - your code is captured automatically
   ↓
5. Need help? Click quick action buttons or ask directly
   ↓
6. Get progressive hints based on your current code
   ↓
7. Continue until solved!
```

### Tips for Best Results

- **Be Specific**: "How can I optimize my nested loop?" vs "How do I solve this?"
- **Use Progressive Hints**: Start with small hints before asking for full solutions
- **Import Code Manually**: If auto-capture fails, use the "Import code" button
- **Experiment with Personas**: Try both Interviewer and Collaborator modes
- **Adjust Response Style**: Switch between concise, balanced, or detailed responses

---

## 🏗️ Architecture

### Project Structure

```
edgecase/
├── extension/
│   ├── src/
│   │   ├── background/           # Background service worker
│   │   │   └── index.ts         # AI streaming, settings, history
│   │   ├── content/              # Content script
│   │   │   ├── index.tsx        # Bootstrap, shadow DOM, state
│   │   │   └── pageBridge.ts    # Editor extraction adapters
│   │   ├── widget/               # React UI components
│   │   │   ├── App.tsx          # Main application
│   │   │   ├── components/      # UI building blocks
│   │   │   └── theme.css        # Tailwind styles
│   │   ├── detection/            # Context extraction
│   │   │   ├── parsers.ts       # Site-specific parsers
│   │   │   └── shared.ts        # Common utilities
│   │   ├── code-context/         # Code snapshot logic
│   │   │   └── adapters.ts      # Editor adapters
│   │   ├── types/                # TypeScript definitions
│   │   │   ├── models.ts        # Data models
│   │   │   └── messages.ts      # Message types
│   │   └── lib/                  # Utilities
│   ├── manifest.json             # Extension manifest (MV3)
│   ├── package.json              # Dependencies
│   ├── tsconfig.json             # TypeScript config
│   ├── tailwind.config.ts        # Tailwind config
│   ├── vite.background.config.ts # Background build
│   ├── vite.bridge.config.ts     # Bridge build
│   └── vite.content.config.ts    # Content build
└── README.md
```

### Technical Stack

**Frontend**
- **React 18.3**: UI framework with hooks
- **TypeScript 5.6**: Type-safe development
- **Tailwind CSS 3.4**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **react-markdown**: Markdown rendering with GitHub flavored markdown
- **react-syntax-highlighter**: Code highlighting
- **Sonner**: Toast notifications

**AI Integration**
- **Vercel AI SDK Core**: Unified streaming interface
- **@ai-sdk/openai**: OpenAI provider adapter
- **@ai-sdk/anthropic**: Anthropic provider adapter
- **@ai-sdk/google**: Google Gemini adapter

**Build & Tooling**
- **Vite 5.4**: Lightning-fast build tool
- **@vitejs/plugin-react**: React Fast Refresh
- **PostCSS + Autoprefixer**: CSS processing

**Chrome APIs**
- `chrome.storage.local`: Settings and history persistence
- `chrome.storage.session`: Timer state management
- `chrome.runtime`: Messaging and port communication
- `chrome.tabs`: Tab lifecycle and state tracking

### Component Architecture

#### Background Service Worker (`background/index.ts`)
- Manages AI streaming with Vercel AI SDK
- Handles settings persistence
- Maintains per-tab chat history (max 30 messages)
- Stores problem context and code snapshots
- Tracks token usage across sessions
- Implements abort controllers for stream cancellation

#### Content Script (`content/index.tsx`)
- Bootstraps React app in Shadow DOM
- Injects Tailwind CSS into shadow root
- Manages local UI state
- Coordinates with background service
- Handles drag/resize interactions
- Implements timer logic with persistence

#### Page Bridge (`content/pageBridge.ts`)
- Runs in page context (non-isolated)
- Extracts code from Monaco, CodeMirror, Ace editors
- Posts snapshots via `window.postMessage`
- Polls editors every 1.6 seconds

#### Widget (`widget/App.tsx`)
- Main React application
- Renders chat interface, settings, quick actions
- Handles user interactions
- Manages streaming UI updates
- Implements markdown rendering with code highlighting

### Data Flow

```
┌─────────────────┐
│   Problem Page  │
│  (LeetCode, etc)│
└────────┬────────┘
         │
         ├─> DOM Parser ──> Problem Context ─┐
         │                                    │
         └─> Editor ──> Bridge ──> Code ─────┤
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │ Background       │
                                    │ Service Worker   │
                                    │                  │
                                    │ • Context Store  │
                                    │ • Code Store     │
                                    │ • Settings       │
                                    │ • History        │
                                    └────────┬─────────┘
                                             │
         ┌───────────────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Content Script        │
│   (Shadow DOM)          │
│                         │
│   ┌─────────────────┐   │
│   │   React App     │   │
│   │   • Chat UI     │   │
│   │   • Settings    │   │
│   │   • Timer       │   │
│   └─────────────────┘   │
└─────────────────────────┘
```

### State Management

**Chrome Storage Keys**
- `edgecaseSettings` - Global settings (provider, API key, preferences)
- `edgecaseHistory:{tabId}` - Per-tab chat history
- `edgecaseTabState:{tabId}` - Per-tab context and code snapshot
- `edgecaseTimer:{problemKey}` - Per-problem timer state (session storage)

**State Lifecycle**
- Settings: Global, persists across browser sessions
- History: Per-tab, max 30 messages, cleared when tab closes
- Context: Per-tab, auto-refreshed on URL/DOM changes
- Timer: Per-problem, persists in session storage

---

## 🛠️ Development

### Build Commands

```bash
# Install dependencies
npm install

# TypeScript type checking
npm run check

# Development build with watch mode
npm run dev

# Production build (all bundles)
npm run build
```

### Build Output

The build process creates three separate bundles:

1. **Content Bundle** (`dist/contentMain.js`)
   - React UI components
   - Content script logic
   - Shadow DOM mounting
   - Tailwind CSS

2. **Bridge Bundle** (`dist/pageBridge.js`)
   - Editor extraction adapters
   - Runs in page context
   - Posts to content script

3. **Background Bundle** (`dist/background.js`)
   - Service worker
   - AI streaming logic
   - State management

### Development Workflow

1. Make changes to source files in `src/`
2. Run `npm run build` (or `npm run dev` for watch mode)
3. Open `chrome://extensions/`
4. Click the reload button on the Edgecase extension
5. Navigate to a test page and verify changes

### Testing

Test on supported platforms:
- LeetCode: [leetcode.com/problems/two-sum](https://leetcode.com/problems/two-sum/)
- NeetCode: [neetcode.io](https://neetcode.io/)
- HackerRank: [hackerrank.com](https://www.hackerrank.com/)

---

## 🌐 Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| **Chrome** | ✅ Full Support | Version 88+ (Manifest V3) |
| **Edge** | ✅ Full Support | Chromium-based Edge 88+ |
| **Brave** | ✅ Full Support | Chromium-based Brave |
| **Opera** | ✅ Full Support | Chromium-based Opera |
| **Firefox** | ❌ Not Supported | Manifest V3 implementation differs |
| **Safari** | ❌ Not Supported | No Manifest V3 support |

**Note**: This extension requires Manifest V3 support and Chromium-based APIs.

---

## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new features, documentation improvements, or platform support, we'd love your help.

### How to Contribute

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/edgecase.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation if needed

4. **Test thoroughly**
   - Build the extension
   - Test on all supported platforms
   - Verify no regressions

5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Open a Pull Request**
   - Describe your changes clearly
   - Link any related issues
   - Include screenshots if UI changes

### Contribution Ideas

- 🌍 **Platform Support**: Add support for more coding platforms (Codeforces, AtCoder, etc.)
- 🎨 **UI Enhancements**: Improve accessibility, add themes, better mobile support
- 🤖 **AI Features**: New coaching modes, better prompts, local model support
- 📝 **Documentation**: Tutorials, video guides, API documentation
- 🐛 **Bug Fixes**: Squash bugs and improve stability
- ⚡ **Performance**: Optimize bundle size, reduce memory usage
- 🧪 **Testing**: Add unit tests, integration tests, E2E tests

### Code Style

- Use TypeScript with strict mode
- Follow React best practices
- Use Tailwind CSS utility classes
- Comment complex logic
- Keep functions small and focused
- Write descriptive commit messages

### Reporting Bugs

Found a bug? Please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser version and OS
- Screenshots if applicable
- Console errors (if any)

---

## 🐛 Troubleshooting

### Extension Not Appearing

**Problem**: EC button doesn't show on problem pages

**Solutions**:
1. Verify you're on a supported platform (LeetCode, NeetCode, HackerRank)
2. Reload the page (Ctrl/Cmd + R)
3. Check if extension is enabled in `chrome://extensions/`
4. Try reloading the extension
5. Check browser console for errors

### Code Not Being Captured

**Problem**: AI doesn't see your current code

**Solutions**:
1. Click the "Import code" button and paste manually
2. Wait 1-2 seconds after typing for auto-capture
3. Check if your editor is supported (Monaco, CodeMirror, Ace, textarea)
4. Try switching between editor tabs if multiple are present
5. Reload the page to reinitialize detection

### API Key Issues

**Problem**: "Missing API key" or authentication errors

**Solutions**:
1. Verify API key is entered correctly (no extra spaces)
2. Check if key is valid and has credits/quota remaining
3. Confirm you selected the correct provider
4. Try regenerating the API key from provider dashboard
5. Clear extension storage: Chrome > Settings > Privacy > Clear browsing data > Cached images and files

### Streaming Failures

**Problem**: Responses stop mid-stream or fail to start

**Solutions**:
1. Check your internet connection
2. Verify API provider status (OpenAI, Anthropic, Google status pages)
3. Try a different model (some may be temporarily unavailable)
4. Check token limits and usage quotas
5. Clear chat history and try again
6. Switch to a different AI provider

### Performance Issues

**Problem**: Extension slows down the page

**Solutions**:
1. Close the panel when not in use
2. Clear old chat history
3. Reduce response length (use "concise" style)
4. Disable auto-capture if not needed (import manually)
5. Check Chrome Task Manager for memory usage

### Settings Not Saving

**Problem**: Configuration resets after closing browser

**Solutions**:
1. Check Chrome storage permissions
2. Verify extension has storage access
3. Try exporting and reimporting settings
4. Reinstall the extension if persistent

### Platform-Specific Issues

**LeetCode**:
- Some premium problems may have different DOM structures
- Try the new or old LeetCode interface

**NeetCode**:
- Editor detection may vary by problem type
- Use manual code import if auto-capture fails

**HackerRank**:
- Multi-file problems may only capture active file
- Challenge editor vs practice editor differences

### Getting Help

If you're still experiencing issues:

1. Check [GitHub Issues](https://github.com/rayanical/edgecase/issues) for similar problems
2. Open a new issue with detailed information
3. Include browser console logs (F12 > Console)
4. Provide steps to reproduce the issue

---

## 📄 License

This project is licensed under the **MIT License** - see below for details.

```
MIT License

Copyright (c) 2026 Rayan Chahid

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

This project was built with:

- **[Vercel AI SDK](https://sdk.vercel.ai/)** - Unified AI provider interface
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful component designs
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Vite](https://vitejs.dev/)** - Next-generation build tool
- **[React](https://react.dev/)** - UI library

Special thanks to:
- The open-source community for incredible tools and libraries
- LeetCode, NeetCode, and HackerRank for excellent problem platforms
- OpenAI, Anthropic, and Google for powerful AI models

---

## 🌟 Show Your Support

If Edgecase helped you ace your coding interviews, consider:

- ⭐ **Star this repository** on GitHub
- 🐦 **Share it** with fellow developers
- 🐛 **Report bugs** or suggest features
- 🤝 **Contribute** to the project
- ☕ **Buy me a coffee** (coming soon)

---

## 📧 Contact

**Rayan Chahid**

- Website: [rayanchahid.com](https://rayanchahid.com)
- GitHub: [@rayanical](https://github.com/rayanical)
- LinkedIn: [Connect with me](https://www.linkedin.com/in/rayan-chahid)

---

<div align="center">

**Built with ❤️ for the coding interview community**

[⬆ Back to Top](#edgecase)

</div>
