import type { sheets_v4 } from 'googleapis';
import type { IPlayerRepository } from '../interfaces/IPlayerRepository';
import type { IPLPlayer } from '../types';
import { SheetPlayerRowSchema } from '../schemas/player.schema';
import { logger } from '../utils/logger';

const HEADERS = [
  'id', 'name', 'nationality', 'role', 'batsRightHanded', 'bowlingStyle',
  'currentTeam', 'hasPlayedForMoreThanOneTeam', 'hasWonIPL', 'isCurrentlyCaptain',
  'isForeignPlayer', 'iplDebut', 'isVeteran', 'hasPlayedOver100IPLMatches',
  'hasPlayedTestCricket', 'hasPlayedWorldCup', 'isWellKnown',
];

export class SheetsPlayerRepository implements IPlayerRepository {
  constructor(
    private readonly sheets: sheets_v4.Sheets,
    private readonly spreadsheetId: string,
    private readonly playersTab: string
  ) {}

  async getAllPlayers(): Promise<IPLPlayer[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.playersTab}!A:Q`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      logger.warn('Players sheet is empty or has only headers');
      return [];
    }

    // skip header row (index 0)
    const dataRows = rows.slice(1);
    const players: IPLPlayer[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rawObject: Record<string, string> = {};

      HEADERS.forEach((header, colIndex) => {
        rawObject[header] = row[colIndex] ?? '';
      });

      const result = SheetPlayerRowSchema.safeParse(rawObject);
      if (result.success) {
        players.push(result.data);
      } else {
        logger.warn(
          { row: i + 2, errors: result.error.flatten() },
          'Skipping invalid player row'
        );
      }
    }

    logger.info(`Loaded ${players.length} players from Sheets`);
    return players;
  }

  async appendFeedbackRow(row: string[][]): Promise<void> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `Feedback!A:F`,
      valueInputOption: 'RAW',
      requestBody: { values: row },
    });
  }
}
