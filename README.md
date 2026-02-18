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
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/rayanical/edgecase/pulls)

*Transform your coding interview preparation with an intelligent AI coach that lives right in your browser.*

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Demo](#-demo) • [FAQ](#-faq) • [Architecture](#-architecture) • [Contributing](#-contributing)

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
- 🔒 **Privacy-First**: API keys stored locally, all processing happens on your machine

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

### Method 1: Install from Source (Recommended for Development)

#### Prerequisites

- **Node.js**: 16.x or higher
- **npm**: 7.x or higher
- **Chrome Browser**: Version 88+ (Manifest V3 support)

#### Step 1: Clone the Repository

```bash
git clone https://github.com/rayanical/edgecase.git
cd edgecase
```

#### Step 2: Install Dependencies

```bash
cd extension
npm install
```

#### Step 3: Build the Extension

```bash
npm run build
```

This creates optimized bundles in `extension/dist/`:
- `contentMain.js` - React UI and content script
- `pageBridge.js` - Editor extraction bridge
- `background.js` - Background service worker
- `assets/` - CSS and static resources

#### Step 4: Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `extension` folder from this repository
5. The Edgecase extension should now appear in your extensions list

#### Step 5: Configure API Key

1. Visit any supported platform (LeetCode, NeetCode, or HackerRank)
2. Click the **EC** launcher button
3. Expand the **Settings** section
4. Select your preferred AI provider
5. Enter your API key
6. Choose your model and coaching preferences

### Method 2: Chrome Web Store (Coming Soon)

We're working on publishing Edgecase to the Chrome Web Store for easier installation. Stay tuned!

### Getting API Keys

| Provider | Link | Notes |
|----------|------|-------|
| **OpenAI** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Requires billing setup, pay-as-you-go |
| **Anthropic** | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) | Free tier available |
| **Google AI** | [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey) | Free tier with generous limits |

#### 🔒 Security Best Practices for API Keys

- **Never share your API keys**: They provide access to your account and billing
- **Store keys securely**: Edgecase stores keys locally in Chrome's secure storage
- **Monitor usage**: Regularly check your provider's dashboard for unexpected usage
- **Rotate keys periodically**: Generate new keys every few months
- **Use separate keys**: Don't reuse API keys across multiple applications
- **Set spending limits**: Configure usage limits in your provider's dashboard to prevent unexpected charges

---

## 📱 Usage

### Supported Platforms

- ✅ **LeetCode**: leetcode.com (all problem types)
- ✅ **NeetCode**: neetcode.io (practice and roadmap)
- ✅ **HackerRank**: hackerrank.com (challenges and contests)

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

### Example Interaction Flow

```
You: *Starting to solve "Two Sum"*
Edgecase: Problem detected! Timer started. Good luck! 🚀

[You write initial brute force solution with nested loops]

You: "How can I make this faster?"
Edgecase: Great question! Instead of checking every pair, think about 
what information you need to remember as you scan through the array...

You: "Small hint"
Edgecase: Consider using a hash map to store values you've seen before.
What would you look up in that hash map for each new element?

[You implement optimized solution]

You: "Complexity analysis"
Edgecase: Excellent! Your solution has:
- Time: O(n) - single pass through array
- Space: O(n) - hash map storage
This is optimal for this problem!
```

### Tips for Best Results

- **Be Specific**: "How can I optimize my nested loop?" vs "How do I solve this?"
- **Use Progressive Hints**: Start with small hints before asking for full solutions
- **Import Code Manually**: If auto-capture fails, use the "Import code" button
- **Experiment with Personas**: Try both Interviewer and Collaborator modes
- **Adjust Response Style**: Switch between concise, balanced, or detailed responses
- **Review Before Asking**: Sometimes explaining your approach helps clarify your thinking
- **Practice Interview Skills**: Use Interviewer mode to simulate real interview pressure

---

## 🎬 Demo

### Screenshots

> **Note**: Screenshots coming soon! In the meantime, here's what you can expect:

**Main Interface**
- Minimal floating launcher button
- Draggable panel with chat interface
- Clean, distraction-free design

**Key Features in Action**
- Real-time code capture
- Progressive hint system
- Timer tracking
- Settings configuration

### Video Walkthrough

Coming soon! We're preparing a comprehensive video tutorial showing:
- Installation process
- Basic usage on LeetCode
- Interview mode vs Collaborator mode
- Advanced features and customization

---

## ❓ FAQ

### General Questions

**Q: Is Edgecase free to use?**  
A: Yes! Edgecase itself is completely free and open source. However, you'll need your own API keys from AI providers (OpenAI, Anthropic, or Google), which may have costs depending on your usage and the provider's pricing.

**Q: Which AI provider is best?**  
A: It depends on your needs:
- **OpenAI GPT-4**: Best overall for coding, fast responses
- **Anthropic Claude**: Strong reasoning, excellent for complex problems
- **Google Gemini**: Most cost-effective, free tier available

**Q: Will this work on Firefox or Safari?**  
A: Currently, Edgecase only supports Chromium-based browsers (Chrome, Edge, Brave, Opera) due to Manifest V3 requirements. Firefox and Safari support may come in future releases.

**Q: Does Edgecase collect my data?**  
A: No! All your data (API keys, chat history, problem context) is stored locally in your browser. Nothing is sent to our servers because we don't have any servers. Conversations go directly from your browser to your chosen AI provider.

### Installation & Setup

**Q: Why can't I see the EC button on problem pages?**  
A: Make sure you:
1. Built the extension (`npm run build`)
2. Loaded it in Chrome extensions page
3. Are on a supported platform (LeetCode, NeetCode, or HackerRank)
4. Refreshed the page after installing the extension

**Q: What do I do if the extension doesn't update after rebuilding?**  
A: Go to `chrome://extensions/`, find Edgecase, and click the reload icon. Then refresh any open problem pages.

**Q: Can I use the extension on multiple computers?**  
A: Yes! Just install and build on each computer. Note that settings don't sync across devices automatically.

### Usage & Features

**Q: Why isn't my code being captured automatically?**  
A: Automatic code capture works with Monaco, CodeMirror, Ace editors, and textareas. If it's not working:
- Wait 1-2 seconds after typing (capture polls every 1.6s)
- Try clicking the "Import code" button to paste manually
- Check the browser console for errors

**Q: Can I use this during real coding interviews?**  
A: **No!** Edgecase is designed for practice and preparation only. Using AI assistance during actual interviews is unethical and often against the rules. Use Edgecase to learn and improve your skills before the interview.

**Q: How much does it cost to use?**  
A: Cost depends on your AI provider and usage:
- **OpenAI**: ~$0.01-0.05 per problem with GPT-4 (varies by conversation length)
- **Anthropic**: Similar pricing to OpenAI
- **Google Gemini**: Free tier covers significant usage, then very cheap

**Q: Can I switch between AI providers?**  
A: Yes! Just change the provider in Settings. Each provider has its own API key, so you can try different ones without reconfiguring.

**Q: Does the timer affect my solution submission?**  
A: No, the timer is purely for your own tracking. It doesn't interact with the problem platform or affect submissions.

### Troubleshooting

**Q: The AI responses are too verbose/too short. How do I change this?**  
A: In Settings, adjust the "Response Style" to Concise, Balanced, or Detailed based on your preference.

**Q: My API key isn't working. What's wrong?**  
A: Check that:
- You copied the entire key without extra spaces
- The key hasn't expired or been revoked
- You have available credits/quota with the provider
- You selected the correct provider in Settings

**Q: Can I export my chat history?**  
A: Currently, chat history is stored per-tab and cleared when you close the tab. Export functionality is planned for a future release.

**Q: Is there a limit to how many hints I can get?**  
A: No limits from Edgecase! However, be mindful of your AI provider's rate limits and costs.

### Contributing

**Q: Can I contribute to Edgecase?**  
A: Absolutely! We welcome contributions of all kinds. Check out our [Contributing](#-contributing) section for guidelines.

**Q: I found a bug. Where should I report it?**  
A: Please open an issue on [GitHub Issues](https://github.com/rayanical/edgecase/issues) with details about the bug and steps to reproduce it.

**Q: Can you add support for [platform X]?**  
A: We're open to adding more platforms! Check if there's already an issue for it, or open a feature request explaining why the platform would be valuable.

---

## 🗺️ Roadmap

### Near-Term (Next 2-3 months)

- [ ] **Chrome Web Store Publishing**: One-click installation for users
- [ ] **Export Chat History**: Save conversations for later review
- [ ] **Custom Prompt Templates**: Create reusable prompts for common scenarios
- [ ] **Theme Customization**: Light/dark themes and color schemes
- [ ] **Keyboard Shortcuts**: Quick access to common actions

### Medium-Term (3-6 months)

- [ ] **More Platform Support**:
  - Codeforces
  - AtCoder
  - CodeChef
  - TopCoder
- [ ] **Solution Comparison**: Compare your solution with optimal approaches
- [ ] **Progress Tracking**: Track problems solved, time spent, topics covered
- [ ] **Offline Mode**: Basic functionality without internet (cached hints)
- [ ] **Mobile Support**: Adapt UI for mobile browsers

### Long-Term (6+ months)

- [ ] **Local AI Models**: Support for local LLMs (Ollama, LM Studio)
- [ ] **Team/Educational Features**:
  - Share problem sessions
  - Instructor/student mode
  - Learning path recommendations
- [ ] **Firefox Extension**: Port to Firefox when MV3 support improves
- [ ] **VS Code Extension**: Bring Edgecase to your local IDE
- [ ] **Interview Recording**: Practice mode with video/audio recording

### Community Requests

Have a feature idea? [Open an issue](https://github.com/rayanical/edgecase/issues/new) with the "feature request" label!

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

### Performance Optimization Tips

- **Lazy load components**: Only render what's visible
- **Debounce code capture**: Avoid excessive polling
- **Optimize bundle size**: Use dynamic imports for large dependencies
- **Profile with Chrome DevTools**: Identify bottlenecks
- **Minimize re-renders**: Use React.memo and useMemo wisely

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

#### High Priority
- 🌍 **Platform Support**: Add support for Codeforces, AtCoder, CodeChef
- 🐛 **Bug Fixes**: Squash bugs and improve stability
- 📝 **Documentation**: Tutorials, video guides, API documentation

#### Medium Priority
- 🎨 **UI Enhancements**: Improve accessibility, add themes
- 🤖 **AI Features**: New coaching modes, better prompts
- ⚡ **Performance**: Optimize bundle size, reduce memory usage

#### Nice to Have
- 🧪 **Testing**: Add unit tests, integration tests, E2E tests
- 🌐 **Internationalization**: Add support for multiple languages
- 📊 **Analytics**: Add anonymous usage analytics (opt-in)

### Code Style

- Use TypeScript with strict mode
- Follow React best practices
- Use Tailwind CSS utility classes
- Comment complex logic
- Keep functions small and focused
- Write descriptive commit messages following [Conventional Commits](https://www.conventionalcommits.org/)

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**:
- `feat(ui): add dark mode toggle`
- `fix(detection): improve CodeMirror extraction`
- `docs(readme): update installation instructions`

### Pull Request Guidelines

- **Keep PRs focused**: One feature or fix per PR
- **Write clear descriptions**: Explain what and why, not just how
- **Link related issues**: Use "Closes #123" or "Fixes #456"
- **Add screenshots**: For UI changes, show before/after
- **Request review**: Tag relevant maintainers or contributors
- **Be responsive**: Address review feedback promptly

### Reporting Bugs

Found a bug? Please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser version and OS
- Screenshots if applicable
- Console errors (if any)

**Use this template**:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment**
- Browser: [e.g., Chrome 120]
- OS: [e.g., macOS 14]
- Extension version: [e.g., 1.0.0]

**Additional context**
Any other context about the problem.
```

---

## 🐛 Troubleshooting

### Extension Not Appearing

**Problem**: EC button doesn't show on problem pages

**Solutions**:
1. Verify you're on a supported platform (LeetCode, NeetCode, HackerRank)
2. Reload the page (Ctrl/Cmd + R)
3. Check if extension is enabled in `chrome://extensions/`
4. Try reloading the extension
5. Check browser console for errors (F12 > Console)
6. Verify the page URL matches supported patterns

### Code Not Being Captured

**Problem**: AI doesn't see your current code

**Solutions**:
1. Click the "Import code" button and paste manually
2. Wait 1-2 seconds after typing for auto-capture
3. Check if your editor is supported (Monaco, CodeMirror, Ace, textarea)
4. Try switching between editor tabs if multiple are present
5. Reload the page to reinitialize detection
6. Check browser console for bridge injection errors

### API Key Issues

**Problem**: "Missing API key" or authentication errors

**Solutions**:
1. Verify API key is entered correctly (no extra spaces)
2. Check if key is valid and has credits/quota remaining
3. Confirm you selected the correct provider
4. Try regenerating the API key from provider dashboard
5. Clear extension storage: Chrome > Settings > Privacy > Clear browsing data > Cached images and files
6. Check provider status page for outages

### Streaming Failures

**Problem**: Responses stop mid-stream or fail to start

**Solutions**:
1. Check your internet connection
2. Verify API provider status (OpenAI, Anthropic, Google status pages)
3. Try a different model (some may be temporarily unavailable)
4. Check token limits and usage quotas
5. Clear chat history and try again
6. Switch to a different AI provider
7. Check for browser extensions blocking requests (ad blockers)
8. Verify your API key has the necessary permissions

### Performance Issues

**Problem**: Extension slows down the page

**Solutions**:
1. Close the panel when not in use
2. Clear old chat history
3. Reduce response length (use "concise" style)
4. Disable auto-capture if not needed (import manually)
5. Check Chrome Task Manager for memory usage
6. Reduce the number of open tabs
7. Disable other extensions to identify conflicts

### Settings Not Saving

**Problem**: Configuration resets after closing browser

**Solutions**:
1. Check Chrome storage permissions
2. Verify extension has storage access
3. Try exporting and reimporting settings (if feature available)
4. Reinstall the extension if persistent
5. Check for browser sync conflicts
6. Disable incognito mode (settings don't persist in incognito)

### Platform-Specific Issues

**LeetCode**:
- Some premium problems may have different DOM structures
- Try the new or old LeetCode interface
- Chinese version (leetcode.cn) not yet supported

**NeetCode**:
- Editor detection may vary by problem type
- Use manual code import if auto-capture fails
- Some embedded problems may have different layouts

**HackerRank**:
- Multi-file problems may only capture active file
- Challenge editor vs practice editor differences
- Contest pages may have restricted access

### Common Error Messages

**"Failed to detect problem context"**
- Page hasn't fully loaded yet, wait and refresh
- Problem page structure changed, may need extension update
- Check if you're on a specific problem page (not list/category)

**"Stream aborted"**
- You or the system cancelled the request
- Network connection interrupted
- API provider timeout

**"Rate limit exceeded"**
- You've hit your API provider's rate limit
- Wait a few minutes and try again
- Consider upgrading your provider plan

### Getting Help

If you're still experiencing issues:

1. **Search Existing Issues**: Check [GitHub Issues](https://github.com/rayanical/edgecase/issues) for similar problems
2. **Check Console Logs**: Open DevTools (F12) and look for errors
3. **Open a New Issue**: Provide detailed information:
   - Browser and version
   - Operating system
   - Extension version
   - Steps to reproduce
   - Console errors/logs
   - Screenshots

4. **Community Support**: Coming soon - Discord/Slack community

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
- Early adopters and contributors who provided valuable feedback

---

## 🌟 Show Your Support

If Edgecase helped you ace your coding interviews, consider:

- ⭐ **Star this repository** on GitHub
- 🐦 **Share it** with fellow developers on social media
- 🐛 **Report bugs** or suggest features via issues
- 🤝 **Contribute** to the project with code or documentation
- 💬 **Write a review** (once on Chrome Web Store)
- 📝 **Write a blog post** about your experience

Every bit of support helps make Edgecase better for everyone!

---

## 📧 Contact & Community

### Maintainer

**Rayan Chahid**

- 🌐 Website: [rayanchahid.com](https://rayanchahid.com)
- 🐙 GitHub: [@rayanical](https://github.com/rayanical)
- 💼 LinkedIn: [Connect with me](https://www.linkedin.com/in/rayan-chahid)
- 📧 Email: [Contact via website](https://rayanchahid.com)

### Community (Coming Soon)

- 💬 **Discord Server**: Join discussions, get help, share tips
- 🐦 **Twitter**: Follow for updates and announcements
- 📺 **YouTube**: Video tutorials and feature demos

### Stay Updated

- Watch this repo on GitHub for release notifications
- Star the repo to show support and stay in your feed
- Check the [Roadmap](#-roadmap) for upcoming features

---

## 📊 Stats & Analytics

![GitHub stars](https://img.shields.io/github/stars/rayanical/edgecase?style=social)
![GitHub forks](https://img.shields.io/github/forks/rayanical/edgecase?style=social)
![GitHub issues](https://img.shields.io/github/issues/rayanical/edgecase)
![GitHub pull requests](https://img.shields.io/github/issues-pr/rayanical/edgecase)
![GitHub last commit](https://img.shields.io/github/last-commit/rayanical/edgecase)
![GitHub contributors](https://img.shields.io/github/contributors/rayanical/edgecase)

---

<div align="center">

**Built with ❤️ for the coding interview community**

*Empowering developers to ace their technical interviews through intelligent AI coaching*

[⬆ Back to Top](#edgecase)

</div>
