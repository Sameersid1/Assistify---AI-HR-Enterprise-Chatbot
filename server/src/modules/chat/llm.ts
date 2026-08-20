import { AppError } from '../../shared/errors';
import { groqProvider } from './llm.groq';
import { geminiProvider } from './llm.gemini';
import { LlmError } from './llm.types';
import type { LlmChunk, LlmProvider, LlmRequest } from './llm.types';

export * from './llm.types';

/**
 * Which provider answers, and who covers for it.
 *
 * Groq leads on quota: its free tier allows thousands of requests a day against
 * Gemini's twenty, which is the difference between a demo anyone can use and
 * one that dies halfway through an afternoon. Gemini stays as the fallback
 * because its key is configured anyway — retrieval embeds through it — so the
 * second provider costs nothing to keep.
 *
 * Order is deliberate, not alphabetical. Change it here and both the streaming
 * and buffered paths follow, because there is only one loop.
 */
const PROVIDERS: readonly LlmProvider[] = [groqProvider, geminiProvider];

/** Names of every provider that could serve a request right now. */
export function configuredProviders(): string[] {
  return PROVIDERS.filter((p) => p.isConfigured()).map((p) => p.name);
}

/**
 * Stream an answer, moving to the next provider if the first cannot serve it.
 *
 * FAILOVER ONLY HOLDS UNTIL THE FIRST TOKEN. Once text has been sent to the
 * browser it is already on the reader's screen; starting again with another
 * provider would splice two different answers together mid-sentence. After
 * that point a failure is reported rather than papered over — a truncated
 * answer the user can see is honest, a Frankenstein one is not.
 *
 * The tools and the system prompt come from the caller, so every provider is
 * given exactly the same role-scoped tool list. Failover cannot widen access.
 */
export async function* streamWithFallback(
  req: LlmRequest,
  /** Overridden only by the verification script, so the rule above can be tested
   *  against stub providers instead of two live APIs and a spent quota. */
  providers: readonly LlmProvider[] = PROVIDERS,
): AsyncIterable<LlmChunk & { provider: string }> {
  const available = providers.filter((p) => p.isConfigured());

  if (available.length === 0) {
    // 503 rather than 500: the server is fine, this one feature is unconfigured.
    throw new AppError(
      503,
      'AI_NOT_CONFIGURED',
      'The assistant is not configured on this server (set GROQ_API_KEY or GEMINI_API_KEY).',
    );
  }

  let lastError: LlmError | null = null;

  for (const [index, provider] of available.entries()) {
    let produced = false;
    try {
      for await (const chunk of provider.stream(req)) {
        produced = true;
        yield { ...chunk, provider: provider.name };
      }
      return;
    } catch (err) {
      if (req.signal?.aborted) return;

      const llmErr =
        err instanceof LlmError
          ? err
          : new LlmError(provider.name, undefined, false, (err as Error).message);
      lastError = llmErr;

      const nextExists = index < available.length - 1;
      if (produced || !llmErr.retryable || !nextExists) throw llmErr;

      // eslint-disable-next-line no-console
      console.warn(
        `🤖 ${provider.name} failed (${llmErr.status ?? 'no status'}): ${llmErr.message} — falling back to ${available[index + 1].name}`,
      );
    }
  }

  /* c8 ignore next */
  throw lastError ?? new AppError(502, 'AI_REQUEST_FAILED', 'No provider answered.');
}
