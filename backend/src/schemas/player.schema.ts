import { z } from 'zod';
import type { IPLPlayer } from '../types';

const boolField = z
  .string()
  .toUpperCase()
  .transform((v) => v === 'TRUE');

export const SheetPlayerRowSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    nationality: z.string().min(1),
    role: z.enum(['batsman', 'bowler', 'allrounder', 'wicketkeeper']),
    batsRightHanded: boolField,
    bowlingStyle: z.enum(['fast', 'medium-fast', 'spin', 'none']),
    currentTeam: z.string().min(1),
    hasPlayedForMoreThanOneTeam: boolField,
    hasWonIPL: boolField,
    isCurrentlyCaptain: boolField,
    isForeignPlayer: boolField,
    iplDebut: z.string().transform((v) => parseInt(v, 10)),
    isVeteran: boolField,
    hasPlayedOver100IPLMatches: boolField,
    hasPlayedTestCricket: boolField,
    hasPlayedWorldCup: boolField,
    isWellKnown: boolField,
  })
  .transform(
    (row): IPLPlayer => ({
      ...row,
      isBatsman: row.role === 'batsman' || row.role === 'allrounder' || row.role === 'wicketkeeper',
      isBowler: row.role === 'bowler' || row.role === 'allrounder',
      isAllRounder: row.role === 'allrounder',
      isWicketkeeper: row.role === 'wicketkeeper',
      bowlsFast: row.bowlingStyle === 'fast' || row.bowlingStyle === 'medium-fast',
      bowlsSpin: row.bowlingStyle === 'spin',
    })
  );

export type SheetPlayerRow = z.input<typeof SheetPlayerRowSchema>;
