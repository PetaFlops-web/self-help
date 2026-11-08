import { z } from 'zod';

export const MatchDecisionSchema = z.object({
  unmatched_id: z.string().uuid({ message: 'unmatched_id harus UUID yang valid' }),
  matched_id: z.string().uuid({ message: 'matched_id harus UUID yang valid' }),
  decision: z.enum(['match', 'not_match'], {
    error: 'decision harus salah satu dari: match, not_match',
  }),
});

export type MatchDecisionBody = z.infer<typeof MatchDecisionSchema>;
