import { env } from '../../config/env';
import { LlmError } from './llm.types';
import type { LlmChunk, LlmMessage, LlmProvider, LlmRequest } from './llm.types';

/**
 * Groq, over its OpenAI-compatible endpoint.
 *
 * Deliberately plain `fetch` rather than a client library. There is no SDK to
 * install, nothing to keep in step with a major version, and — the reason it
 * matters here — no repeat of the ESM/CommonJS dance that @google/genai forced
 * (see the dynamic import in llm.gemini.ts). The wire format is small enough to
 * read in one sitting, and it is the same format most providers now speak.
 */

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Chosen for tool use, not for benchmark scores. This assistant's job is to
 * pick the right function and pass it clean arguments; a bigger model writes
 * prettier prose but does not read a leave balance any more correctly.
 */
const MODEL = 'llama-3.3-70b-versatile';

interface GroqDelta {
  content?: string | null;
  tool_calls?: {
    index: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }[];
}

/** Our neutral transcript, in the shape the OpenAI wire format expects. */
function toWireMessages(system: string, messages: LlmMessage[]): unknown[] {
  return [
    { role: 'system', content: system },
    ...messages.map((m) => {
      if (m.role === 'tool') {
        return { role: 'tool', tool_call_id: m.toolCallId, name: m.name, content: m.content };
      }
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'assistant',
          // The API rejects a null content alongside tool calls on some models.
          content: m.content || '',
          tool_calls: m.toolCalls.map((c) => ({
            id: c.id,
            type: 'function',
            function: { name: c.name, arguments: JSON.stringify(c.args) },
          })),
        };
      }
      return { role: m.role, content: m.content };
    }),
  ];
}

/**
 * Whether it is worth asking the other provider instead.
 *
 * 429 and 5xx are the whole point of having a fallback. A 400 is our own
 * malformed request and 401 is a bad key — both fail identically everywhere, so
 * failing over just spends another round trip to reach the same error.
 */
const isRetryable = (status: number): boolean => status === 429 || status >= 500;

async function readError(res: Response, status: number): Promise<never> {
  let detail = `Groq returned ${status}`;
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    if (body?.error?.message) detail = body.error.message;
  } catch {
    // Non-JSON error body — the status alone is the diagnostic.
  }
  throw new LlmError('groq', status, isRetryable(status), detail);
}

export const groqProvider: LlmProvider = {
  name: 'groq',

  isConfigured: () => Boolean(env.GROQ_API_KEY),

  async *stream(req: LlmRequest): AsyncIterable<LlmChunk> {
    let res: Response;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: req.signal,
        body: JSON.stringify({
          model: MODEL,
          stream: true,
          messages: toWireMessages(req.system, req.messages),
          ...(req.tools.length
            ? {
                tools: req.tools.map((t) => ({
                  type: 'function',
                  function: {
                    name: t.name,
                    description: t.description,
                    // A tool with no arguments still needs a schema here, unlike
                    // Gemini where the field is simply left off.
                    parameters: t.parametersJsonSchema ?? { type: 'object', properties: {} },
                  },
                })),
                tool_choice: 'auto',
              }
            : {}),
        }),
      });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      throw new LlmError('groq', undefined, true, (err as Error).message);
    }

    if (!res.ok) await readError(res, res.status);
    if (!res.body) throw new LlmError('groq', res.status, true, 'Groq sent an empty stream.');

    // Tool call arguments arrive as partial JSON spread over many chunks, keyed
    // by index. They are accumulated here and only emitted once the stream ends,
    // because half an argument object cannot be parsed or run.
    const pending = new Map<number, { id: string; name: string; args: string }>();

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const line = frame.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;

          let parsed: { choices?: { delta?: GroqDelta }[] };
          try {
            parsed = JSON.parse(data);
          } catch {
            continue; // A frame we cannot read is not worth killing the answer over.
          }

          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.content) yield { text: delta.content };

          for (const call of delta.tool_calls ?? []) {
            const existing = pending.get(call.index) ?? { id: '', name: '', args: '' };
            pending.set(call.index, {
              id: call.id ?? existing.id,
              name: call.function?.name ?? existing.name,
              args: existing.args + (call.function?.arguments ?? ''),
            });
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      throw new LlmError('groq', undefined, true, (err as Error).message);
    }

    if (pending.size === 0) return;

    yield {
      toolCalls: [...pending.entries()]
        .sort(([a], [b]) => a - b)
        .map(([index, call]) => {
          let args: Record<string, unknown> = {};
          try {
            // Empty string is the normal case for a no-argument tool.
            if (call.args.trim()) args = JSON.parse(call.args) as Record<string, unknown>;
          } catch {
            // Malformed arguments are left empty rather than throwing: the tool's
            // own Zod schema will reject them and tell the model what was wrong,
            // which it can act on. A throw here would just end the message.
          }
          return { id: call.id || `call_${index}`, name: call.name, args };
        })
        .filter((c) => c.name),
    };
  },
};
