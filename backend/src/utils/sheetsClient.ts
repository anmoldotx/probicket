import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';
import type { Config } from '../config/env';

let sheetsInstance: sheets_v4.Sheets | null = null;

export function createSheetsClient(config: Config): sheets_v4.Sheets {
  if (sheetsInstance) return sheetsInstance;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: config.GOOGLE_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsInstance = google.sheets({ version: 'v4', auth });
  return sheetsInstance;
}
