// Type-only: @google/genai is ESM and this server compiles to CommonJS, so a
// static import would fail at build. Types are erased; the class itself is
// pulled in with a dynamic import() inside getClient(), which CommonJS can do.
import type { Content, GoogleGenAI, Part } from '@google/genai' with { 'resolution-mode': 'import' };
import { env } from '../../config/env';
import { AppError } from '../../shared/errors';
import { UserModel } from '../users/user.model';
import { CompanyModel } from '../companies/company.model';
import { buildTools, type ChatTool } from './chat.tools';
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

function buildSystemPrompt(callerDescription: string): string {
  // Today's date is included because leave questions are relative ("how many do
  // I have left this year", "am I off next Friday") and the model has no clock.
  const today = new Date().toISOString().slice(0, 10);

  return `You are Assistify, the HR assistant for an employee self-service portal.

You are talking to:
${callerDescription}

Today's date is ${today} (UTC).

How to answer:
- Get facts from your tools. Never estimate, guess, or reuse a number from
  earlier in the conversation if it may have changed — call the tool again.
- Answer the question that was actually asked. If you have no tool for the
  subject, say so plainly and suggest they contact HR — do NOT answer a
  neighbouring question instead. Asked about support tickets, payroll,
  benefits, or policy documents, the honest answer is that you cannot see
  those yet; reaching for a leave tool because leave is the nearest thing you
  do have is worse than admitting the gap, because it looks like an answer.
- If your tools only cover this person but they asked about everyone, say that
  in the same breath as the answer: tell them what you can see, that it is
  limited to their own records, and that HR can see the rest. Never let a
  narrower answer pass as if it were the question they asked.
- Do not invent policy. You only know what your tools return.
- Answer in two or three sentences unless asked for detail. This is a chat
  window, not a report.
- Leave is counted in working days; weekends do not consume balance.
- Speak to them directly and use their name occasionally. Plain language, no
  corporate padding.

What you cannot do yet: you can read information but not change anything. You
cannot apply for leave, approve or reject a request, or edit anyone's details.
If asked, say the person should use the relevant page in the app.`;
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

  const systemInstruction = buildSystemPrompt(await describeCaller(auth));

  // Gemini names the assistant's side of a transcript "model", not "assistant".
  const contents: Content[] = input.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const toolsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: tools.map((t) => t.declaration) }],
      },
    });

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
