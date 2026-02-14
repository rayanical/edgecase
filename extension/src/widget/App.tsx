import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircledIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  GearIcon,
  PaperPlaneIcon,
  PlusIcon,
  ReloadIcon
} from "@radix-ui/react-icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";
import { Toaster, toast } from "sonner";
import type { ChatHistoryItem, CodeSnapshot, PersonaMode, ProblemContext, Settings } from "../types/models";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Select } from "./components/ui/select";
import { Textarea } from "./components/ui/textarea";

type PanelRect = { x: number; y: number; width: number; height: number };

type AppProps = {
  isOpen: boolean;
  panelRect: PanelRect;
  context: ProblemContext | null;
  statusText: string;
  statusType: "ok" | "warn" | "error";
  history: ChatHistoryItem[];
  sending: boolean;
  codeSnapshot: CodeSnapshot | null;
  settings: Settings;
  personaMode: PersonaMode;
  timerSeconds: number;
  timerRunning: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  onStartDrag: (event: React.MouseEvent<HTMLDivElement>) => void;
  onStartResize: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTogglePersona: (mode: PersonaMode) => void;
  onTimerToggle: () => void;
  onTimerReset: () => void;
  onRescan: () => void;
  onSend: (text: string) => void;
  onCancel: () => void;
  onClear: () => void;
  onSaveSettings: (next: Partial<Settings>) => Promise<void>;
  onManualCodeSnapshot: (code: string) => void;
};

const MODELS_BY_PROVIDER = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-5-mini", "gpt-5-nano", "gpt-4.1-mini"],
  anthropic: ["claude-haiku-4-5-20251001", "claude-sonnet-4-5-20250929"],
  gemini: ["gemini-2.5-flash", "gemini-3-flash-preview"]
} as const;

const QUICK_ACTIONS = [
  { label: "Small hint", prompt: "Give me one small hint only. Do not reveal the full approach." },
  { label: "Right DSA", prompt: "What data structure should I use and why? Keep it short." },
  { label: "Right approach", prompt: "What is the best high-level approach pattern?" },
  { label: "Edge cases", prompt: "Give the key edge cases I should test." },
  { label: "Complexity", prompt: "How should I reason about time and space complexity?" },
  {
    label: "Full solution",
    prompt: "I explicitly want the complete solution now, including algorithm explanation and code."
  }
];

const markdownComponents: Components = {
  pre({ children }) {
    return <>{children}</>;
  },
  code({ inline, className, children, ...props }: any) {
    const raw = String(children).replace(/\n$/, "");
    const match = /language-([\w-]+)/.exec(className || "");
    const language = match ? match[1] : "text";

    if (inline) {
      return (
        <code className="rounded border border-border bg-card px-1 py-[1px] text-[11px]" {...props}>
          {children}
        </code>
      );
    }

    return (
      <SyntaxHighlighter
        {...props}
        language={language}
        style={vscDarkPlus || oneDark}
        customStyle={{
          margin: 0,
          borderRadius: "0.5rem",
          border: "1px solid hsl(var(--border))",
          background: "hsl(var(--card))",
          padding: "0.65rem 0.75rem",
          fontSize: "11px",
          lineHeight: "1.5",
          overflowX: "auto"
        }}
        wrapLongLines={false}>
        {raw}
      </SyntaxHighlighter>
    );
  }
};

export function App(props: AppProps) {
  const [text, setText] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showManualCodeDialog, setShowManualCodeDialog] = useState(false);
  const [timerHover, setTimerHover] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const lastErrorToastRef = useRef("");

  const statusIcon = useMemo(() => {
    if (props.statusType === "error") {
      return <Cross2Icon className="h-3.5 w-3.5" />;
    }
    if (props.statusType === "warn") {
      return <ExclamationTriangleIcon className="h-3.5 w-3.5" />;
    }
    return <CheckCircledIcon className="h-3.5 w-3.5" />;
  }, [props.statusType]);

  const contextConnected = Boolean(props.codeSnapshot && props.codeSnapshot.code.trim());

  const sendFromInput = () => {
    const next = text.trim();
    if (!next) {
      return;
    }
    props.onSend(next);
    setText("");
    if (inputRef.current) {
      inputRef.current.style.height = "76px";
    }
  };

  const onTextChange = (value: string) => {
    setText(value);
    const node = inputRef.current;
    if (!node) {
      return;
    }
    node.style.height = "76px";
    node.style.height = `${Math.min(node.scrollHeight, 220)}px`;
  };

  useEffect(() => {
    const node = chatScrollRef.current;
    if (!node) {
      return;
    }

    if (props.sending || stickToBottomRef.current) {
      node.scrollTop = node.scrollHeight;
    }
  }, [props.history, props.sending]);

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }
    const node = chatScrollRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [props.isOpen]);

  useEffect(() => {
    if (props.statusType !== "error" || !props.statusText || props.statusText === lastErrorToastRef.current) {
      return;
    }
    lastErrorToastRef.current = props.statusText;
    const message = props.statusText.replace(/^Error:\s*/i, "");
    if (/missing api key/i.test(message)) {
      toast.error("Missing API Key", {
        description: "Click to open settings and add a key.",
        action: {
          label: "Open Settings",
          onClick: () => setShowSettingsSheet(true)
        }
      });
      return;
    }
    toast.error(message);
  }, [props.statusText, props.statusType]);

  const platformLabel = props.context ? formatPlatformLabel(props.context) : "No platform detected";
  const timerText = formatTimer(props.timerSeconds);
  const launcherLogoSrc = chrome.runtime.getURL("edgecase-logo-gray.svg");
  const sendQuickAction = (prompt: string) => {
    props.onSend(prompt);
    setShowQuickActions(false);
  };

  return (
    <div className="edgecase-root">
      <Toaster theme="dark" position="bottom-center" richColors />
      <Button
        variant="ghost"
        className="fixed bottom-5 right-5 z-[2147483646] h-[58px] w-[58px] rounded-full border border-border/80 bg-card/85 text-[11px] font-semibold shadow-lg backdrop-blur"
        onClick={props.onToggleOpen}>
        <img
          src={launcherLogoSrc}
          alt="Edgecase"
          className="h-[90px] w-[90px] object-contain opacity-100"
          style={{ transform: "scale(1.8)", transformOrigin: "center" }}
        />
      </Button>

      {props.isOpen ? (
        <div
          className="edgecase-panel"
          style={
            {
              "--panel-x": `${props.panelRect.x}px`,
              "--panel-y": `${props.panelRect.y}px`,
              "--panel-width": `${props.panelRect.width}px`,
              "--panel-height": `${props.panelRect.height}px`,
              "--panel-right": "auto",
              "--panel-bottom": "auto"
            } as React.CSSProperties
          }>
          <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur">
            <div className="flex cursor-move items-center justify-between px-3 py-3" onMouseDown={props.onStartDrag}>
              <p className="text-sm font-semibold tracking-tight text-foreground/95">Edgecase</p>
              <div className="flex items-center gap-2">
                <div
                  className="relative flex items-center gap-1 rounded-full border border-border bg-muted/70 px-2 py-1"
                  onMouseEnter={() => setTimerHover(true)}
                  onMouseLeave={() => setTimerHover(false)}>
                  <button
                    type="button"
                    className={`font-mono text-[11px] ${props.timerRunning ? "text-foreground" : "text-yellow-300"}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onTimerToggle();
                    }}>
                    {timerText}
                  </button>
                  {timerHover ? (
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onTimerReset();
                      }}
                      title="Reset timer">
                      <ReloadIcon className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
                <div className="flex rounded-full border border-border bg-muted/70 p-0.5 shadow-inner">
                  <button
                    type="button"
                    className={`rounded-full px-2 py-1 text-[10px] ${props.personaMode === "interviewer" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onTogglePersona("interviewer");
                    }}>
                    Interviewer
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-2 py-1 text-[10px] ${props.personaMode === "collaborator" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onTogglePersona("collaborator");
                    }}>
                    Collaborator
                  </button>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowSettingsSheet(true)} title="Settings">
                  <GearIcon className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={props.onClose} title="Close">
                  <Cross2Icon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <>
                <div className="flex items-center justify-between px-3 pb-2">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-xs font-medium text-foreground/95">{props.context?.title || "No problem detected"}</p>
                    <p className="line-clamp-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{platformLabel}</p>
                  </div>
                  <div className="ml-2 flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${contextConnected ? "bg-green-500" : "bg-muted-foreground"}`} />
                    <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      {contextConnected ? "Code Connected" : "Code Missing"}
                    </span>
                  </div>
                </div>

                <div
                  ref={chatScrollRef}
                  onScroll={(event) => {
                    const node = event.currentTarget;
                    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
                    stickToBottomRef.current = distanceFromBottom < 56;
                  }}
                  className="edgecase-scroll flex-1 overflow-auto px-3 py-2">
                  {props.history.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3">
                      <div
                        className={`edgecase-status-${props.statusType} inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground`}>
                        {statusIcon}
                        <span>{props.statusText}</span>
                      </div>
                      <p className="text-center text-xs text-muted-foreground">Start by asking for a hint or approach check.</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {QUICK_ACTIONS.map((item) => (
                          <Button key={item.label} variant="ghost" size="sm" className="rounded-full" onClick={() => sendQuickAction(item.prompt)}>
                            {item.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-1">
                      {props.history.map((msg, index) => (
                        <div key={`${msg.ts}-${index}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] text-xs leading-relaxed ${
                              msg.role === "user"
                                ? "rounded-2xl border border-border/70 bg-muted px-3 py-2 text-foreground"
                                : "px-0 py-1 text-foreground"
                            }`}>
                            {msg.role === "assistant" ? <MessageMarkdown text={msg.content} /> : <p className="whitespace-pre-wrap">{msg.content}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="edgecase-footer px-3 pb-5 pt-2">
                  <div className="rounded-2xl border border-input/85 bg-card/95 p-2 shadow-[0_18px_36px_rgba(0,0,0,0.5)] backdrop-blur">
                    <div className="relative mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 rounded-full border border-border/70 bg-muted/60 px-2 text-[11px]"
                          onClick={() => setShowManualCodeDialog(true)}
                          title="Import code context">
                          <PlusIcon className="mr-1 h-3.5 w-3.5" />
                          Import code
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 rounded-full border border-border/70 bg-muted/60 px-2 text-[11px]"
                          onClick={() => setShowQuickActions((value) => !value)}>
                          Actions
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 rounded-full border border-border/70 bg-muted/60 px-2 text-[11px]" onClick={props.onClear} title="Clear chat">
                        <span className="mr-1">Clear</span>
                        <Cross2Icon className="h-3.5 w-3.5" />
                      </Button>
                      {showQuickActions ? (
                        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border border-border/85 bg-card/95 p-2 shadow-[0_16px_30px_rgba(0,0,0,0.45)] backdrop-blur">
                          <div className="grid grid-cols-2 gap-1.5">
                            {QUICK_ACTIONS.map((item) => (
                              <Button
                                key={item.label}
                                variant="ghost"
                                size="sm"
                                className="h-7 justify-start rounded-xl border border-border/60 bg-muted/50 px-2 text-[11px] whitespace-nowrap"
                                onClick={() => sendQuickAction(item.prompt)}>
                                {item.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-end gap-2">
                      <textarea
                        ref={inputRef}
                        rows={3}
                        value={text}
                        onChange={(event) => onTextChange(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            sendFromInput();
                          }
                        }}
                        placeholder="Ask for the next step, hint, or solution..."
                        className="h-[76px] max-h-[220px] min-h-[76px] flex-1 resize-none rounded-2xl border border-input/80 bg-muted/25 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                      />
                      {props.sending ? (
                        <Button variant="ghost" size="icon" onClick={props.onCancel} title="Stop" className="rounded-full border border-border/70 bg-muted/60">
                          <Cross2Icon className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      <Button size="icon" onClick={sendFromInput} disabled={props.sending} title="Send" className="rounded-full border border-border/70 bg-muted/60 text-foreground hover:bg-muted">
                        <PaperPlaneIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
            </>

            <div className="edgecase-resizer" onMouseDown={props.onStartResize} />
          </Card>

          {showSettingsSheet ? (
            <SettingsSheet
              settings={props.settings}
              onClose={() => setShowSettingsSheet(false)}
              onSave={async (next) => {
                await props.onSaveSettings(next);
                setShowSettingsSheet(false);
              }}
            />
          ) : null}

          {showManualCodeDialog ? (
            <ManualCodeDialog
              code={manualCode}
              onCodeChange={setManualCode}
              onClose={() => setShowManualCodeDialog(false)}
              onUseCode={(nextCode) => {
                if (nextCode.trim()) {
                  props.onManualCodeSnapshot(nextCode.trim());
                }
                setShowManualCodeDialog(false);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatPlatformLabel(context: ProblemContext): string {
  if (context.site && context.site !== "generic") {
    return context.site;
  }
  try {
    const host = new URL(context.url).hostname.toLowerCase();
    if (host.includes("leetcode")) return "leetcode";
    if (host.includes("neetcode")) return "neetcode";
    if (host.includes("hackerrank")) return "hackerrank";
    return host.replace(/^www\./, "");
  } catch {
    return "generic";
  }
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(Math.max(0, Math.floor(value || 0)));
}

function MessageMarkdown({ text }: { text: string }) {
  return (
    <div className="edgecase-markdown break-words text-xs leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

type SettingsSheetProps = {
  settings: Settings;
  onClose: () => void;
  onSave: (next: Partial<Settings>) => Promise<void>;
};

function SettingsSheet({ settings, onClose, onSave }: SettingsSheetProps) {
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const saveChanges = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await onSave(draft);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const modelOptions = MODELS_BY_PROVIDER[draft.provider];

  return (
    <>
      <div className="absolute inset-0 z-40 bg-black/45" onClick={onClose} />
      <div className="absolute right-0 top-0 z-50 flex h-full w-[86%] max-w-[360px] flex-col border-l border-border/80 bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-3 py-3">
          <p className="text-sm font-semibold">Settings</p>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Cross2Icon className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="edgecase-scroll flex-1 space-y-4 overflow-auto p-3">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Connection</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-[11px] text-muted-foreground">
                Provider
                <Select
                  value={draft.provider}
                  onChange={(event) =>
                    setDraft((prev) => {
                      const provider = event.target.value as Settings["provider"];
                      const nextModels = MODELS_BY_PROVIDER[provider];
                      const hasCurrent = nextModels.some((model) => model === prev.model);
                      return {
                        ...prev,
                        provider,
                        model: hasCurrent ? prev.model : nextModels[0]
                      };
                    })
                  }>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="gemini">Gemini</option>
                </Select>
              </label>
              <label className="space-y-1 text-[11px] text-muted-foreground">
                Model
                <Select
                  value={draft.model}
                  onChange={(event) => setDraft((prev) => ({ ...prev, model: event.target.value }))}>
                  {modelOptions.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          </div>

          <label className="space-y-1 text-[11px] text-muted-foreground">
            API Key
            <Input
              type="password"
              value={draft.apiKey}
              onChange={(event) => setDraft((prev) => ({ ...prev, apiKey: event.target.value }))}
            />
          </label>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Preferences</p>
            <label className="space-y-1 text-[11px] text-muted-foreground">
              Response style
              <Select
                value={draft.responseStyle}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, responseStyle: event.target.value as Settings["responseStyle"] }))
                }>
                <option value="concise">Concise</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Detailed</option>
              </Select>
            </label>
          </div>

          <label className="space-y-1 text-[11px] text-muted-foreground">
            Custom Instructions
            <Textarea
              className="min-h-14 rounded-xl border border-input/80 bg-muted/25"
              value={draft.systemPromptOverride}
              onChange={(event) => setDraft((prev) => ({ ...prev, systemPromptOverride: event.target.value }))}
            />
          </label>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
            <div className="text-[10px] text-muted-foreground">
              <p className="uppercase tracking-[0.12em]">Tokens burned</p>
              <p className="mt-0.5">
                Total {formatNumber(draft.tokenCounter.totalTokens)} | In {formatNumber(draft.tokenCounter.promptTokens)} | Out{" "}
                {formatNumber(draft.tokenCounter.completionTokens)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 rounded-full px-2 text-[10px]"
              onClick={async () => {
                const zeroCounter = { totalTokens: 0, promptTokens: 0, completionTokens: 0 };
                setDraft((prev) => ({ ...prev, tokenCounter: zeroCounter }));
                await onSave({ tokenCounter: zeroCounter });
              }}>
              Reset
            </Button>
          </div>
        </div>

        <div className="border-t border-border p-3">
          {saveError ? <p className="mb-2 text-[11px] text-muted-foreground">{saveError}</p> : null}
          <Button className="w-full" onClick={saveChanges} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </>
  );
}

type ManualCodeDialogProps = {
  code: string;
  onCodeChange: (value: string) => void;
  onClose: () => void;
  onUseCode: (value: string) => void;
};

function ManualCodeDialog({ code, onCodeChange, onClose, onUseCode }: ManualCodeDialogProps) {
  return (
    <>
      <div className="absolute inset-0 z-40 bg-black/45" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 z-50 w-[92%] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-3 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Manual Code Context</p>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Cross2Icon className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Use this only if auto-capture misses your editor content.
        </p>
        <Textarea
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          className="min-h-28"
          placeholder="Paste code here..."
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onUseCode(code)}>Use code</Button>
        </div>
      </div>
    </>
  );
}
