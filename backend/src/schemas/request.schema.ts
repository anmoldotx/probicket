import { z } from 'zod';

export const AnswerRequestSchema = z.object({
  answer: z.enum(['yes', 'no', 'maybe', "don't_know"]),
});

export const FeedbackRequestSchema = z.object({
  actualName: z.string().min(1).optional(),
});

export type AnswerRequest = z.infer<typeof AnswerRequestSchema>;
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;
