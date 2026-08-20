/**
 * A provider-neutral shape for talking to a tool-calling LLM.
 *
 * WHY THIS EXISTS
 * The assistant ran on Gemini's free tier, which allows about twenty requests
 * per day — enough to build against, not enough for anyone to actually use.
 * Moving to a provider with room to breathe should not mean rewriting the tool
 * loop, and it definitely should not mean a second copy of it: the loop is
 * where role-scoped tools are enforced, and two copies is how a fix lands on
 * one path and not the other.
 *
 * So the loop is written once against these types, and each provider maps them
 * to its own wire format. chat.tools.ts — the security-relevant file — does not
 * know which provider is running and never changes when one is swapped.
 */

/** A function the model may ask for. Plain JSON Schema; every provider takes it. */
export interface ToolDeclaration {
  name: string;
  description: string;
  /** Omitted for tools that take no arguments. */
  parametersJsonSchema?: Record<string, unknown>;
}

/** The model asking to run one tool. */
export interface LlmToolCall {
  /**
   * Correlates the call with its result. OpenAI-style APIs require it;
   * Gemini matches on name instead, so its adapter synthesises one.
   */
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/** One turn of the conversation, in provider-neutral form. */
export type LlmMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: LlmToolCall[] }
  | { role: 'tool'; toolCallId: string; name: string; content: string };

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  tools: ToolDeclaration[];
  signal?: AbortSignal;
}

/**
 * A piece of the answer as it arrives.
 *
 * Tool calls surface once complete rather than as fragments — providers stream
 * their arguments as partial JSON, and half an argument object is no use to a
 * caller. Assembly is each adapter's job.
 */
export interface LlmChunk {
  text?: string;
  toolCalls?: LlmToolCall[];
}

export interface LlmProvider {
  /** Shown in logs and in the X-Assistant-Provider header. */
  readonly name: string;
  /** False when this provider has no API key configured. */
  isConfigured(): boolean;
  stream(req: LlmRequest): AsyncIterable<LlmChunk>;
}

/**
 * A provider failing in a way that is worth trying someone else for.
 *
 * `retryable` separates "this provider is out of quota" — where falling back to
 * the other one is exactly right — from "the caller asked for something
 * impossible", where every provider will refuse identically and failing over
 * just doubles the latency before the same error.
 */
export class LlmError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number | undefined,
    readonly retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}
