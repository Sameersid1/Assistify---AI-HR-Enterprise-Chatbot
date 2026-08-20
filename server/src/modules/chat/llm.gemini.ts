// Type-only: @google/genai is ESM and this server compiles to CommonJS, so a
// static import would fail at build. Types are erased; the class itself is
// pulled in with a dynamic import() inside getClient(), which CommonJS can do.
import type { Content, GoogleGenAI, Part } from '@google/genai' with { 'resolution-mode': 'import' };
import { env } from '../../config/env';
import { LlmError } from './llm.types';
import type { LlmChunk, LlmMessage, LlmProvider, LlmRequest } from './llm.types';

/**
 * Gemini, behind the neutral interface.
 *
 * Kept as the fallback rather than dropped: its free tier is small but it is a
 * different company's outage, and the embedding model this project's retrieval
 * depends on lives here anyway (see documents/document.service.ts), so the key
 * is configured regardless.
 */

const MODEL = 'gemini-2.5-flash';

/** Built once — the client pools connections, so per-request construction reconnects each time. */
let client: GoogleGenAI | null = null;

async function getClient(): Promise<GoogleGenAI> {
  if (!client) {
    const genai = await import('@google/genai');
    client = new genai.GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

/**
 * Our neutral transcript, in Gemini's shape.
 *
 * Two differences do the work here: Gemini calls the assistant's side "model",
 * and it pairs tool results with their call by *name* rather than by id — which
 * is why the ids we synthesise below are never sent back.
 */
function toContents(messages: LlmMessage[]): Content[] {
  return messages.map((m): Content => {
    if (m.role === 'tool') {
      return {
        role: 'user',
        parts: [{ functionResponse: { name: m.name, response: { output: m.content } } }],
      };
    }
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'model',
        parts: m.toolCalls.map(
          (c): Part => ({ functionCall: { name: c.name, args: c.args } }),
        ),
      };
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
  });
}

const isRetryable = (status: number | undefined): boolean =>
  status === 429 || (status !== undefined && status >= 500);

export const geminiProvider: LlmProvider = {
  name: 'gemini',

  isConfigured: () => Boolean(env.GEMINI_API_KEY),

  async *stream(req: LlmRequest): AsyncIterable<LlmChunk> {
    const ai = await getClient();

    let stream: Awaited<ReturnType<typeof ai.models.generateContentStream>>;
    try {
      stream = await ai.models.generateContentStream({
        model: MODEL,
        contents: toContents(req.messages),
        config: {
          systemInstruction: req.system,
          ...(req.tools.length
            ? {
                tools: [
                  {
                    functionDeclarations: req.tools.map((t) => ({
                      name: t.name,
                      description: t.description,
                      ...(t.parametersJsonSchema
                        ? { parametersJsonSchema: t.parametersJsonSchema }
                        : {}),
                    })),
                  },
                ],
              }
            : {}),
          ...(req.signal ? { abortSignal: req.signal } : {}),
        },
      });
    } catch (err) {
      if (req.signal?.aborted) return;
      // Duck-typed rather than instanceof: the SDK's ApiError class lives in an
      // ESM module this CommonJS file only imports types from.
      const status = typeof (err as { status?: unknown })?.status === 'number'
        ? (err as { status: number }).status
        : undefined;
      throw new LlmError('gemini', status, isRetryable(status), (err as Error).message);
    }

    try {
      for await (const chunk of stream) {
        if (req.signal?.aborted) return;

        const calls = chunk.functionCalls ?? [];
        if (calls.length) {
          yield {
            toolCalls: calls.map((c, i) => ({
              // Gemini matches results to calls by name, so this id exists only
              // to satisfy the neutral shape. It is never sent back to Gemini.
              id: `gemini_${i}`,
              name: c.name ?? '',
              args: (c.args ?? {}) as Record<string, unknown>,
            })).filter((c) => c.name),
          };
        }

        if (chunk.text) yield { text: chunk.text };
      }
    } catch (err) {
      if (req.signal?.aborted) return;
      const status = typeof (err as { status?: unknown })?.status === 'number'
        ? (err as { status: number }).status
        : undefined;
      throw new LlmError('gemini', status, isRetryable(status), (err as Error).message);
    }
  },
};
