export type Provider = "openai" | "anthropic" | "gemini";
export type CoachingStyle = "interviewer" | "collaborative" | "socratic";
export type ResponseStyle = "concise" | "balanced" | "detailed";

export type ProblemContext = {
  site: "leetcode" | "neetcode" | "hackerrank" | "generic";
  url: string;
  title: string;
  description: string;
  constraints: string;
  examples: string;
  confidence: number;
  extractedAt: string;
};

export type CodeSnapshot = {
  source: "monaco" | "codemirror" | "ace" | "textarea" | "manual";
  language: string | null;
  code: string;
  selection: { start: number; end: number } | null;
  updatedAt: string;
};

export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
  ts: number;
};

export type UiPreferences = {
  panelRectByHost: Record<string, { x: number; y: number; width: number; height: number }>;
};

export type Settings = {
  provider: Provider;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  coachingStyle: CoachingStyle;
  responseStyle: ResponseStyle;
  systemPromptOverride: string;
  ui: UiPreferences;
};

export type TabState = {
  context: ProblemContext | null;
  codeSnapshot: CodeSnapshot | null;
};
