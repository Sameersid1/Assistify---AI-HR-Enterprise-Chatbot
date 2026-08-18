import { z } from 'zod';

/**
 * POST /api/v1/chat
 *
 * The conversation is sent whole on every turn — the server keeps nothing
 * between requests, the same way the rest of this API works. The transcript is
 * plain text only: tool calls and their results are not echoed back by the
 * client, so the model sees its own past *answers* but not the raw rows behind
 * them. That is fine for follow-ups ("and casual leave?") because the answer
 * carries the facts, and it keeps the client from having to model tool blocks.
 */
export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        // Capped so one enormous paste cannot blow up a request. Anthropic's
        // limit is far higher; this is about our own request size.
        content: z.string().trim().min(1, 'Message cannot be empty').max(4000),
      }),
    )
    .min(1, 'At least one message is required')
    // Long conversations get expensive and slow, and this API has no
    // compaction. The client is expected to trim; this is the backstop.
    .max(40, 'Conversation is too long — start a new chat'),
});

export type ChatInput = z.infer<typeof chatSchema>;
