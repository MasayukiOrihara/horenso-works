import { z } from "zod";

export const ChatRequestOptionsSchema = z.object({
  memoryOn: z.boolean(),
  learnOn: z.boolean(),
  addPromptOn: z.boolean(),
  debug: z.boolean(),
  step: z.number(),
});
