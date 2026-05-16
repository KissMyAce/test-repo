import { z } from "zod";

export const approveDriverSchema = z.object({
  body: z.object({
    reviewNotes: z.string().optional(),
  }),
  params: z.object({
    userId: z.string().min(1),
  }),
  query: z.object({}),
});

export const rejectDriverSchema = z.object({
  body: z.object({
    reason: z.string().min(1),
  }),
  params: z.object({
    userId: z.string().min(1),
  }),
  query: z.object({}),
});
