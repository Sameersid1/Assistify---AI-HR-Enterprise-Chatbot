// Type-only: @google/genai is ESM and this server compiles to CommonJS, so a
// static import would fail at build. Types are erased; the class itself is
// pulled in with a dynamic import() inside getClient(), which CommonJS can do.
import type { Content, GoogleGenAI, Part } from '@google/genai' with { 'resolution-mode': 'import' };
import { env } from '../../config/env';
import { AppError } from '../../shared/errors';
import { UserModel } from '../users/user.model';
import { CompanyModel } from '../companies/company.model';
import { buildTools, isApprover, type ChatTool } from './chat.tools';
import type { AuthContext } from '../../shared/types';
import type { ChatInput } from './chat.schema';

/**
 * The assistant.
 *
 * Gemini is given a list of functions it may request; it never touches the
 * database. It asks for one, we run it as the caller, we hand back the result,
 * and it writes the answer from that. The part that matters for safety is in
 * chat.tools.ts — every tool runs as the person chatting.
 */

/** The free-tier workhorse. Swap for gemini-2.5-pro if answers need more depth. */
const MODEL = 'gemini-2.5-flash';

/**
 * How many times we will run tools and ask again within one message.
 *
 * Without a ceiling a model that keeps requesting tools loops forever, holding
 * the HTTP request open and burning quota. Four is comfortably above what these
 * questions need — the deepest real case is two (check the policy, then the
 * person's balance).
 */
const MAX_TOOL_ROUNDS = 4;

/** Built once — the client pools connections, so per-request construction reconnects each time. */
let client: GoogleGenAI | null = null;

async function getClient(): Promise<GoogleGenAI> {
  if (!env.GEMINI_API_KEY) {
    // 503 rather than 500: the server is fine, this one feature is unconfigured.
    // Said plainly so a teammate with no key knows why chat alone is failing.
    throw new AppError(
      503,
      'AI_NOT_CONFIGURED',
      'The assistant is not configured on this server (GEMINI_API_KEY is not set).',
    );
  }
  if (!client) {
    const genai = await import('@google/genai');
    client = new genai.GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

export interface ChatResult {
  reply: string;
  /** Names of tools actually called, in order — surfaced so the UI can show its work. */
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

function buildSystemPrompt(callerDescription: string, approver: boolean): string {
  // Today's date is included because leave questions are relative ("how many do
  // I have left this year", "am I off next Friday") and the model has no clock.
  const today = new Date().toISOString().slice(0, 10);

  // Stated outright rather than left to inference. A model can see the tools it
  // holds but has no way to notice the ones withheld from it, so "if your tools
  // only cover this person" is a test it cannot actually run — it just answers
  // from what it has and never mentions the edge. Naming the boundary is what
  // makes it repeatable to the user.
  const scope = approver
    ? `You can see leave records for everyone in this company and the full
employee directory, as well as this person's own records.`
    : `You can ONLY see this person's own records. You cannot see anyone else's
leave, the company-wide approval queue, or the employee directory — those tools
are not available to you. When they ask about other people or about everyone,
answer for them and say plainly that your view stops at their own records and
that HR can see the rest. Do not present it as a complete answer.`;

  return `You are Assistify, the HR assistant for an employee self-service portal.

You are talking to:
${callerDescription}

Today's date is ${today} (UTC).

What you can see:
${scope}

How to answer:
- Get facts from your tools. Never estimate, guess, or reuse a number from
  earlier in the conversation if it may have changed — call the tool again.
- Answer the question that was actually asked. If you have no tool for the
  subject, say so plainly and suggest they contact HR — do NOT answer a
  neighbouring question instead. Asked about support tickets or payroll, the
  honest answer is that you cannot see those; reaching for a leave tool because
  leave is the nearest thing you do have is worse than admitting the gap,
  because it looks like an answer.
- Never let a narrower answer pass as if it were the question they asked. If
  what you can see is smaller than what they asked about, say so in the same
  breath as the answer.
- Do not invent policy. For any question about rules or entitlements, search the
  policy documents first; if the search returns nothing, say the company has not
  published a policy covering it rather than answering from general knowledge.
- When an answer comes from a policy document, name the document it came from.
- Answer in two or three sentences unless asked for detail. This is a chat
  window, not a report.
- Leave is counted in working days; weekends do not consume balance.
- Speak to them directly and use their name occasionally. Plain language, no
  corporate padding.

Applying for or cancelling leave:
- Work relative dates ("next Monday", "the 3rd") into real calendar dates from
  today's date above, then say the dates back before you submit: "That's Mon 25
  to Tue 26 August, 2 working days — shall I apply?" Wait for a yes.
- Skip the confirmation only when they already gave exact dates themselves.
- Check their balance first if it might not cover the request.
- After submitting, tell them it is pending HR approval — submitting is not
  approval.
- To cancel, look the request up first so you use its real id. Never guess one.

What you cannot do: approve or reject anyone's leave, edit people's details, or
invite staff. Approving is a decision about another person that changes their
balance, so it belongs on the approvals page where the request is on screen —
say so if asked.`;
}

/**
 * Turn a failure from the Gemini API into something the person can act on.
 *
 * Without this every upstream problem — rate limit, rejected key, Google having
 * a bad afternoon — arrives as an unhandled throw and the UI shows "Something
 * went wrong", which is indistinguishable from a bug in our own code. The
 * status is the useful part: it separates "wait a minute" from "the key is
 * wrong" from "not your fault at all", and those need different reactions.
 *
 * The upstream text is passed through deliberately. Google's messages name the
 * problem ("API key not valid", "quota exceeded") and contain no secret; hiding
 * them is what made the SMTP failure take a day to diagnose.
 */
function describeAiError(err: unknown): AppError {
  // Duck-typed rather than instanceof: the SDK's ApiError class lives in an ESM
  // module this CommonJS file only imports types from.
  const status = typeof (err as { status?: unknown })?.status === 'number'
    ? (err as { status: number }).status
    : undefined;
  const detail = err instanceof Error ? err.message : String(err);

  // eslint-disable-next-line no-console
  console.error(`🤖 Gemini request failed (status ${status ?? 'unknown'}): ${detail}`);

  if (status === 429) {
    // Per-minute and per-day quotas both return 429, and the difference matters
    // enormously — one clears in under a minute, the other not until the quota
    // resets. Only Google's text distinguishes them, so it goes to the user.
    return new AppError(
      429,
      'AI_RATE_LIMITED',
      `The assistant has hit its free-tier limit. If this is the per-minute limit it clears in about a minute. (${detail})`,
    );
  }
  if (status === 401 || status === 403) {
    return new AppError(
      503,
      'AI_KEY_REJECTED',
      `The assistant's API key was rejected by Google. Check GEMINI_API_KEY. (${detail})`,
    );
  }
  if (status === 400) {
    return new AppError(400, 'AI_BAD_REQUEST', `The assistant rejected that request. (${detail})`);
  }
  if (status !== undefined && status >= 500) {
    return new AppError(
      503,
      'AI_UNAVAILABLE',
      'Google’s AI service is temporarily unavailable. Try again shortly.',
    );
  }
  return new AppError(502, 'AI_REQUEST_FAILED', `The assistant could not be reached. (${detail})`);
}

/**
 * Run one tool and shape its result for the model.
 *
 * A thrown tool never fails the whole message. The model is told what went
 * wrong and can say so or try a different approach, which is far better than
 * the person seeing a blank error where an answer should be.
 */
async function runTool(tool: ChatTool, args: Record<string, unknown>): Promise<Part> {
  const name = tool.declaration.name as string;
  try {
    return { functionResponse: { name, response: { output: await tool.run(args) } } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(`🤖 Tool ${name} failed: ${message}`);
    return { functionResponse: { name, response: { error: message } } };
  }
}

export async function chat(auth: AuthContext, input: ChatInput): Promise<ChatResult> {
  const ai = await getClient();
  const tools = buildTools(auth);
  const byName = new Map(tools.map((t) => [t.declaration.name as string, t]));

  const systemInstruction = buildSystemPrompt(await describeCaller(auth), isApprover(auth.role));

  // Gemini names the assistant's side of a transcript "model", not "assistant".
  const contents: Content[] = input.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const toolsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    let response: Awaited<ReturnType<typeof ai.models.generateContent>>;
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: tools.map((t) => t.declaration) }],
        },
      });
    } catch (err) {
      throw describeAiError(err);
    }

    const calls = response.functionCalls ?? [];

    // No tool requested — this is the answer.
    if (calls.length === 0) {
      const reply = response.text?.trim();
      return {
        reply: reply || "Sorry — I couldn't put together an answer for that. Try rephrasing?",
        toolsUsed,
      };
    }

    // Echo the model's request back into the transcript before answering it;
    // dropping this turn breaks the pairing between call and response.
    contents.push({ role: 'model', parts: calls.map((functionCall) => ({ functionCall })) });

    const results = await Promise.all(
      calls.map(async (call): Promise<Part> => {
        const tool = byName.get(call.name ?? '');
        if (!tool) {
          // Only reachable if the model invents a name. Told, not thrown, so it
          // can correct itself rather than the message dying.
          return {
            functionResponse: {
              name: call.name ?? 'unknown',
              response: { error: `No such tool: ${call.name}` },
            },
          };
        }
        toolsUsed.push(tool.declaration.name as string);
        return runTool(tool, call.args ?? {});
      }),
    );

    contents.push({ role: 'user', parts: results });
  }

  // Still asking for tools after MAX_TOOL_ROUNDS — stop rather than loop.
  return {
    reply:
      "Sorry — I couldn't finish looking that up. Try asking about one thing at a time.",
    toolsUsed,
  };
}
