import { z } from 'zod';

const VALID_LEVELS = [
  'cadet', 'scout', 'ranger', 'warlord', 'phantom', 'alien-mind',
] as const;

export const StartGameSchema = z.object({
  level: z.enum(VALID_LEVELS, {
    message: 'level must be one of: cadet, scout, ranger, warlord, phantom, alien-mind',
  }),
});

export const SubmitGameSchema = z.object({
  sessionId:   z.string().uuid({ message: 'sessionId must be a valid UUID' }),
  timeTakenMs: z.number().int().min(0).max(86_400_000),
  hintsUsed:   z.number().int().min(0).max(10),
  errorCount:  z.number().int().min(0).max(1000),
});

export const FailGameSchema = z.object({
  sessionId: z.string().uuid({ message: 'sessionId must be a valid UUID' }),
});
