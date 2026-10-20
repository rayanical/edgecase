import type { ChatHistoryItem, CodeSnapshot, ProblemContext, Settings, TabState } from "./models";

export type RpcRequest =
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings: Partial<Settings> }
  | { type: "GET_CHAT_HISTORY"; tabId: number }
  | { type: "CLEAR_CHAT_HISTORY"; tabId: number }
  | { type: "GET_SENDER_TAB" }
  | { type: "CONTEXT_UPDATE"; context: ProblemContext }
  | { type: "CODE_SNAPSHOT_UPDATE"; snapshot: CodeSnapshot }
  | { type: "GET_TAB_STATE"; tabId?: number }
  | { type: "RESCAN_CONTEXT"; tabId?: number };

export type RpcSuccess =
  | { ok: true; settings: Settings }
  | { ok: true; tabId: number | null }
  | { ok: true; tabId: number; history: ChatHistoryItem[] }
  | { ok: true; tabId: number; context: ProblemContext | null }
  | { ok: true; tabId: number; snapshot: CodeSnapshot | null }
  | { ok: true; tabId: number | null; state: TabState }
  | { ok: true; received: true };

export type RpcFailure = { ok: false; error: string };

export type RpcResponse = RpcSuccess | RpcFailure;

export type StreamRequest = {
  type: "SEND_CHAT_STREAM";
  tabId: number;
  requestId: string;
  text: string;
  context: ProblemContext | null;
  codeSnapshot: CodeSnapshot | null;
};

export type CancelStreamRequest = {
  type: "CANCEL_CHAT_STREAM";
  tabId: number;
  requestId: string;
};

export type StreamEvent =
  | { type: "STREAM_START"; requestId: string }
  | { type: "STREAM_CHUNK"; requestId: string; chunk: string }
  | { type: "STREAM_DONE"; requestId: string; history: ChatHistoryItem[]; response: string }
  | { type: "STREAM_ERROR"; requestId: string; error: string };
