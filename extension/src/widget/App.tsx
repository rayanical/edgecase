import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CheckCircledIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  GearIcon,
  PaperPlaneIcon,
  PlusIcon,
  ReloadIcon
} from "@radix-ui/react-icons";
import type { ChatHistoryItem, CodeSnapshot, ProblemContext, Settings } from "../types/models";
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
  onToggleOpen: () => void;
  onClose: () => void;
  onStartDrag: (event: React.MouseEvent<HTMLDivElement>) => void;
  onStartResize: (event: React.MouseEvent<HTMLDivElement>) => void;
  onRescan: () => void;
  onSend: (text: string) => void;
  onCancel: () => void;
  onClear: () => void;
  onSaveSettings: (next: Partial<Settings>) => Promise<void>;
  onManualCodeSnapshot: (code: string) => void;
};

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

export function App(props: AppProps) {
  const [text, setText] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showManualCodeDialog, setShowManualCodeDialog] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

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

  const platformLabel = props.context ? formatPlatformLabel(props.context) : "No platform detected";

  return (
    <div className="edgecase-root">
      <Button
        variant="ghost"
        className="fixed bottom-5 right-5 z-[2147483646] h-12 w-12 rounded-full border text-sm font-semibold"
        onClick={props.onToggleOpen}>
        EC
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
          <Card className="relative flex h-full flex-col overflow-hidden shadow-2xl">
            <div className="flex cursor-move items-center justify-between border-b border-border px-3 py-2" onMouseDown={props.onStartDrag}>
              <p className="text-sm font-semibold tracking-tight">Edgecase</p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={props.onRescan} title="Rescan problem">
                  <ReloadIcon className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowSettingsSheet(true)} title="Settings">
                  <GearIcon className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={props.onClose} title="Close">
                  <Cross2Icon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <>
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-xs font-medium">{props.context?.title || "No problem detected"}</p>
                    <p className="line-clamp-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{platformLabel}</p>
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
                  className="edgecase-scroll flex-1 overflow-auto px-2 py-2">
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
                          <Button key={item.label} variant="ghost" size="sm" className="rounded-full" onClick={() => props.onSend(item.prompt)}>
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
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                              msg.role === "user"
                                ? "bg-foreground text-background"
                                : "bg-muted text-foreground"
                            }`}>
                            {msg.role === "assistant" ? <MessageMarkdown text={msg.content} /> : <p className="whitespace-pre-wrap">{msg.content}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {showQuickActions ? (
                  <div className="border-t border-border px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {QUICK_ACTIONS.map((item) => (
                        <Button key={item.label} variant="ghost" size="sm" className="rounded-full" onClick={() => props.onSend(item.prompt)}>
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="border-t border-border p-2">
                  <div className="rounded-md border border-input bg-card p-1.5">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 rounded-full px-2 text-[11px]"
                          onClick={() => setShowManualCodeDialog(true)}
                          title="Import code context">
                          <PlusIcon className="mr-1 h-3.5 w-3.5" />
                          Import code
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 rounded-full px-2 text-[11px]"
                          onClick={() => setShowQuickActions((value) => !value)}>
                          Actions
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 rounded-full px-2 text-[11px]" onClick={props.onClear} title="Clear chat">
                        <span className="mr-1">Clear</span>
                        <Cross2Icon className="h-3.5 w-3.5" />
                      </Button>
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
                        className="h-[76px] max-h-[220px] min-h-[76px] flex-1 resize-none rounded-md border border-input bg-card px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      {props.sending ? (
                        <Button variant="ghost" size="icon" onClick={props.onCancel} title="Stop">
                          <Cross2Icon className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      <Button size="icon" onClick={sendFromInput} disabled={props.sending} title="Send">
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

function MessageMarkdown({ text }: { text: string }) {
  const segments = splitCodeBlocks(text);
  return (
    <div className="space-y-2 whitespace-pre-wrap break-words">
      {segments.map((segment, index) =>
        segment.type === "code" ? (
          <pre key={index} className="overflow-x-auto rounded-md border border-border bg-card px-2 py-2 text-[11px] leading-relaxed">
            <code>{segment.content}</code>
          </pre>
        ) : (
          <Fragment key={index}>
            {renderInlineMarkdown(segment.content).map((line, lineIndex) => (
              <p key={`${index}-${lineIndex}`}>{line}</p>
            ))}
          </Fragment>
        )
      )}
    </div>
  );
}

function splitCodeBlocks(text: string): Array<{ type: "text" | "code"; content: string }> {
  const parts: Array<{ type: "text" | "code"; content: string }> = [];
  const regex = /```(?:[\w+-]+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(text);

  while (match) {
    const before = text.slice(lastIndex, match.index);
    if (before) {
      parts.push({ type: "text", content: before });
    }
    parts.push({ type: "code", content: match[1].trimEnd() });
    lastIndex = regex.lastIndex;
    match = regex.exec(text);
  }

  const remainder = text.slice(lastIndex);
  if (remainder) {
    parts.push({ type: "text", content: remainder });
  }

  return parts.length > 0 ? parts : [{ type: "text", content: text }];
}

function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split("\n").map((line, lineIndex) => {
    const nodes: ReactNode[] = [];
    const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)/g;
    let cursor = 0;
    let match: RegExpExecArray | null = pattern.exec(line);

    while (match) {
      if (match.index > cursor) {
        nodes.push(line.slice(cursor, match.index));
      }
      const token = match[0];
      if (token.startsWith("`")) {
        nodes.push(
          <code key={`code-${lineIndex}-${match.index}`} className="rounded bg-card px-1 py-[1px] text-[11px]">
            {token.slice(1, -1)}
          </code>
        );
      } else {
        nodes.push(
          <strong key={`strong-${lineIndex}-${match.index}`} className="font-semibold">
            {token.slice(2, -2)}
          </strong>
        );
      }
      cursor = match.index + token.length;
      match = pattern.exec(line);
    }

    if (cursor < line.length) {
      nodes.push(line.slice(cursor));
    }

    return <Fragment key={`line-${lineIndex}`}>{nodes}</Fragment>;
  });
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

  return (
    <>
      <div className="absolute inset-0 z-40 bg-black/45" onClick={onClose} />
      <div className="absolute right-0 top-0 z-50 flex h-full w-[82%] max-w-[340px] flex-col border-l border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Settings</p>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Cross2Icon className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="edgecase-scroll flex-1 space-y-2 overflow-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-[11px] text-muted-foreground">
              Provider
              <Select
                value={draft.provider}
                onChange={(event) => setDraft((prev) => ({ ...prev, provider: event.target.value as Settings["provider"] }))}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Gemini</option>
              </Select>
            </label>
            <label className="space-y-1 text-[11px] text-muted-foreground">
              Model
              <Input value={draft.model} onChange={(event) => setDraft((prev) => ({ ...prev, model: event.target.value }))} />
            </label>
          </div>

          <label className="space-y-1 text-[11px] text-muted-foreground">
            API Key
            <Input
              type="password"
              value={draft.apiKey}
              onChange={(event) => setDraft((prev) => ({ ...prev, apiKey: event.target.value }))}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-[11px] text-muted-foreground">
              Temperature
              <Input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={String(draft.temperature)}
                onChange={(event) => setDraft((prev) => ({ ...prev, temperature: Number(event.target.value) }))}
              />
            </label>
            <label className="space-y-1 text-[11px] text-muted-foreground">
              Max tokens
              <Input
                type="number"
                min={100}
                max={4000}
                step={50}
                value={String(draft.maxTokens)}
                onChange={(event) => setDraft((prev) => ({ ...prev, maxTokens: Number(event.target.value) }))}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-[11px] text-muted-foreground">
              Coaching style
              <Select
                value={draft.coachingStyle}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, coachingStyle: event.target.value as Settings["coachingStyle"] }))
                }>
                <option value="interviewer">Interviewer</option>
                <option value="collaborative">Collaborative</option>
                <option value="socratic">Socratic</option>
              </Select>
            </label>
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
            System prompt override
            <Textarea
              className="min-h-12"
              value={draft.systemPromptOverride}
              onChange={(event) => setDraft((prev) => ({ ...prev, systemPromptOverride: event.target.value }))}
            />
          </label>
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
