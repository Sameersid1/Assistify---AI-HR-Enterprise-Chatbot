import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors';
import { UserModel } from '../users/user.model';
import { CompanyModel } from '../companies/company.model';
import { buildTools } from './chat.tools';
import type { AuthContext } from '../../shared/types';
import type { ChatInput } from './chat.schema';

/**
 * The assistant.
 *
 * Claude decides which tools to call; the SDK's tool runner executes them and
 * feeds the results back until there is nothing left to call. The loop is not
 * hand-written here — see chat.tools.ts for the part that matters, which is
 * that every tool runs as the person chatting.
 */

/**
 * Built once. The client holds a connection pool, so constructing one per
 * request would open a new TLS connection each time.
 */
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    // 503 rather than 500: the server is fine, this one feature is unconfigured.
    // Said plainly so a teammate with no key knows why chat alone is failing.
    throw new AppError(
      503,
      'AI_NOT_CONFIGURED',
      'The assistant is not configured on this server (ANTHROPIC_API_KEY is not set).',
    );
  }
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

export interface ChatResult {
  reply: string;
  /** Names of tools Claude called, in order — surfaced so the UI can show its work. */
  toolsUsed: string[];
}

/**
 * Who is asking, in a form the model can use.
 *
 * Identity is read from the database using the id in the verified token, never
 * from anything the client sent. A caller who edits their own message to claim
 * "I am an admin" changes nothing: the tools they get are chosen from
 * `auth.role`, and every query is scoped to `auth.companyId`.
 */
async function describeCaller(auth: AuthContext): Promise<string> {
  const [user, company] = await Promise.all([
    UserModel.findById(auth.userId).select('fullName role department designation'),
    CompanyModel.findById(auth.companyId).select('name'),
  ]);

  return [
    `Name: ${user?.fullName ?? 'Unknown'}`,
    `Role: ${auth.role}`,
    `Company: ${company?.name ?? 'Unknown'}`,
    user?.department ? `Department: ${user.department}` : null,
    user?.designation ? `Job title: ${user.designation}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildSystemPrompt(callerDescription: string): string {
  // Today's date is included because leave questions are relative ("do I have
  // enough left this year", "am I off next Friday") and the model has no clock.
  const today = new Date().toISOString().slice(0, 10);

  return `You are Assistify, the HR assistant for an employee self-service portal.

You are talking to:
${callerDescription}

Today's date is ${today} (UTC).

How to answer:
- Get facts from your tools. Never estimate, guess, or reuse a number from
  earlier in the conversation if it may have changed — call the tool again.
- If no tool can answer the question, say so plainly and suggest they contact HR.
  Do not invent policy. You only know what your tools return.
- Answer in two or three sentences unless asked for detail. This is a chat
  window, not a report.
- Leave is counted in working days; weekends do not consume balance.
- Speak to them directly and use their name occasionally. Plain language, no
  corporate padding.

What you cannot do yet: you can read information but not change anything. You
cannot apply for leave, approve or reject a request, or edit anyone's details.
If asked, say the person should use the relevant page in the app.`;
}

export async function chat(auth: AuthContext, input: ChatInput): Promise<ChatResult> {
  const anthropic = getClient();
  const system = buildSystemPrompt(await describeCaller(auth));

  const runner = anthropic.beta.messages.toolRunner({
    model: 'claude-opus-5',
    // A ceiling, not a target — unused headroom costs nothing, and thinking
    // shares this budget, so a tight value truncates answers mid-sentence.
    // Reply length is controlled by the system prompt instead.
    max_tokens: 16000,
    // Chat is latency-sensitive and these are lookups, not hard reasoning.
    // Raise to 'medium' or 'high' if the assistant starts choosing tools badly.
    output_config: { effort: 'low' },
    system,
    tools: buildTools(auth),
    messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
  });

  // Iterating (rather than just awaiting the runner) lets us see each turn as it
  // completes, so we can record which tools were called. The last message the
  // runner yields is the final answer — iteration ends when Claude stops calling
  // tools.
  const toolsUsed: string[] = [];
  let finalMessage: Awaited<ReturnType<typeof runner.done>> | undefined;

  for await (const message of runner) {
    finalMessage = message;
    for (const block of message.content) {
      if (block.type === 'tool_use') toolsUsed.push(block.name);
    }
  }

  const reply = (finalMessage?.content ?? [])
    .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return {
    reply: reply || "Sorry — I couldn't put together an answer for that. Try rephrasing?",
    toolsUsed,
  };
}
