/**
 * One-time seed script: merges both CSVs in scripts/data/, enriches
 * remaining fields via Gemini, and writes the player table to Google Sheets.
 *
 * Usage:
 *   1. Make sure both CSVs are in scripts/data/
 *      - ipl_player_database.csv   (full_name, raw_names, teams_played, years_active)
 *      - IPLPlayerAuctionData.csv  (Player, Role, Amount, Team, Year, Player Origin)
 *   2. Copy .env.example to .env and fill in all values
 *   3. Run: pnpm seed
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { google } from 'googleapis';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SPREADSHEET_ID = process.env.SHEETS_SPREADSHEET_ID!;
const PLAYERS_TAB = process.env.SHEETS_PLAYERS_TAB ?? 'Players';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');

const DB_CSV = path.resolve(__dirname, 'data/ipl_player_database.csv');
const AUCTION_CSV = path.resolve(__dirname, 'data/IPLPlayerAuctionData.csv');
const BATCH_SIZE = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DbRow {
  fullName: string;
  teamsPlayed: string[];
  yearsActive: number[];
}

interface AuctionEntry {
  role: string;
  team: string;
  year: number;
  isForeignPlayer: boolean;
}

interface PreFilledPlayer {
  id: string;
  name: string;
  isForeignPlayer: boolean;
  hasPlayedForMoreThanOneTeam: boolean;
  iplDebut: number;
  isVeteran: boolean;
  currentTeam: string;
  role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
  // Gemini fills these:
  nationality: null;
  batsRightHanded: null;
  bowlingStyle: null;
  hasWonIPL: null;
  isCurrentlyCaptain: null;
  hasPlayedOver100IPLMatches: null;
  hasPlayedTestCricket: null;
  hasPlayedWorldCup: null;
  isWellKnown: null;
}

// ---------------------------------------------------------------------------
// Zod schema for Gemini-enriched output
// ---------------------------------------------------------------------------

const EnrichedPlayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nationality: z.string().min(1),
  role: z.enum(['batsman', 'bowler', 'allrounder', 'wicketkeeper']),
  batsRightHanded: z.boolean(),
  bowlingStyle: z.enum(['fast', 'medium-fast', 'spin', 'none']),
  currentTeam: z.string().min(1),
  hasPlayedForMoreThanOneTeam: z.boolean(),
  hasWonIPL: z.boolean(),
  isCurrentlyCaptain: z.boolean(),
  isForeignPlayer: z.boolean(),
  iplDebut: z.number().int().min(2008).max(2025),
  isVeteran: z.boolean(),
  hasPlayedOver100IPLMatches: z.boolean(),
  hasPlayedTestCricket: z.boolean(),
  hasPlayedWorldCup: z.boolean(),
  isWellKnown: z.boolean(),
});

type EnrichedPlayer = z.infer<typeof EnrichedPlayerSchema>;

// ---------------------------------------------------------------------------
// Name normalization — keeps first + last token, lowercase, alpha only
// e.g. "Aaron James Finch" → "aaron finch", "Aaron Finch" → "aaron finch"
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
  const parts = name
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return name.toLowerCase();
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ---------------------------------------------------------------------------
// Parse ipl_player_database.csv
// ---------------------------------------------------------------------------

async function parsePlayerDatabase(): Promise<Map<string, DbRow>> {
  const map = new Map<string, DbRow>();

  const rl = readline.createInterface({
    input: fs.createReadStream(DB_CSV),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) { isHeader = false; continue; }

    // CSV columns: full_name, raw_names, teams_played, years_active
    // teams_played and years_active use " | " as separator and may be quoted
    const cols = splitCsvLine(line);
    if (cols.length < 4) continue;

    const fullName = cols[0].trim();
    const teamsRaw = cols[2].trim();
    const yearsRaw = cols[3].trim();

    const teamsPlayed = teamsRaw.split('|').map((t) => t.trim()).filter(Boolean);
    const yearsActive = yearsRaw
      .split('|')
      .map((y) => parseInt(y.trim(), 10))
      .filter((y) => !isNaN(y));

    if (fullName && yearsActive.length > 0) {
      map.set(normalizeName(fullName), { fullName, teamsPlayed, yearsActive });
    }
  }

  console.log(`Parsed ${map.size} players from ipl_player_database.csv`);
  return map;
}

// ---------------------------------------------------------------------------
// Parse IPLPlayerAuctionData.csv
// ---------------------------------------------------------------------------

async function parseAuctionData(): Promise<Map<string, AuctionEntry[]>> {
  const map = new Map<string, AuctionEntry[]>();

  const rl = readline.createInterface({
    input: fs.createReadStream(AUCTION_CSV),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) { isHeader = false; continue; }

    // CSV columns: Player, Role, Amount, Team, Year, Player Origin
    const cols = splitCsvLine(line);
    if (cols.length < 6) continue;

    const playerName = cols[0].trim();
    const role = cols[1].trim();
    const team = cols[3].trim();
    const year = parseInt(cols[4].trim(), 10);
    const origin = cols[5].trim();

    if (!playerName || isNaN(year)) continue;

    const key = normalizeName(playerName);
    const entry: AuctionEntry = {
      role,
      team,
      year,
      isForeignPlayer: origin.toLowerCase() === 'overseas',
    };

    const existing = map.get(key) ?? [];
    existing.push(entry);
    map.set(key, existing);
  }

  console.log(`Parsed ${map.size} unique players from IPLPlayerAuctionData.csv`);
  return map;
}

// ---------------------------------------------------------------------------
// Robust CSV line splitter (handles quoted fields with commas inside)
// ---------------------------------------------------------------------------

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ---------------------------------------------------------------------------
// Map auction role string to our schema enum
// ---------------------------------------------------------------------------

function mapRole(auctionRole: string): 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper' {
  const r = auctionRole.toLowerCase();
  if (r.includes('wicket') || r.includes('wk')) return 'wicketkeeper';
  if (r.includes('all')) return 'allrounder';
  if (r.includes('bowl')) return 'bowler';
  return 'batsman';
}

// ---------------------------------------------------------------------------
// Map full team name to abbreviation
// ---------------------------------------------------------------------------

const TEAM_ABBREV: Record<string, string> = {
  'mumbai indians': 'MI',
  'chennai super kings': 'CSK',
  'royal challengers bangalore': 'RCB',
  'royal challengers bengaluru': 'RCB',
  'kolkata knight riders': 'KKR',
  'sunrisers hyderabad': 'SRH',
  'delhi capitals': 'DC',
  'delhi daredevils': 'DC',
  'punjab kings': 'PBKS',
  'kings xi punjab': 'PBKS',
  'rajasthan royals': 'RR',
  'gujarat titans': 'GT',
  'gujarat lions': 'Retired',
  'lucknow super giants': 'LSG',
  'rising pune supergiant': 'Retired',
  'rising pune supergiants': 'Retired',
  'pune warriors': 'Retired',
  'kochi tuskers kerala': 'Retired',
  'deccan chargers': 'Retired',
};

function abbrevTeam(teamName: string): string {
  return TEAM_ABBREV[teamName.toLowerCase()] ?? 'Retired';
}

// ---------------------------------------------------------------------------
// Build pre-filled player objects by merging both CSVs
// ---------------------------------------------------------------------------

function buildPreFilledPlayers(
  dbMap: Map<string, DbRow>,
  auctionMap: Map<string, AuctionEntry[]>
): PreFilledPlayer[] {
  const players: PreFilledPlayer[] = [];

  for (const [normKey, dbRow] of dbMap) {
    const { fullName, teamsPlayed, yearsActive } = dbRow;

    // Filter: active in 2024/2025 OR 5+ seasons
    const isRecentlyActive = yearsActive.includes(2024) || yearsActive.includes(2025);
    const isVeteranWithDepth = yearsActive.length >= 5;
    if (!isRecentlyActive && !isVeteranWithDepth) continue;

    const iplDebut = Math.min(...yearsActive);
    const isVeteran = iplDebut <= 2012;
    const hasPlayedForMoreThanOneTeam = teamsPlayed.length > 1;

    // Cross-reference auction data
    const auctionEntries = auctionMap.get(normKey) ?? [];
    const latestEntry = auctionEntries.sort((a, b) => b.year - a.year)[0];

    const role = latestEntry ? mapRole(latestEntry.role) : 'batsman';
    const isForeignPlayer = latestEntry ? latestEntry.isForeignPlayer : false;

    // currentTeam: from most recent auction entry, then from teamsPlayed last entry
    let currentTeam = 'Retired';
    if (latestEntry && latestEntry.year >= 2022) {
      currentTeam = abbrevTeam(latestEntry.team);
    } else if (teamsPlayed.length > 0) {
      currentTeam = abbrevTeam(teamsPlayed[teamsPlayed.length - 1]);
    }

    players.push({
      id: slugify(fullName),
      name: fullName,
      isForeignPlayer,
      hasPlayedForMoreThanOneTeam,
      iplDebut,
      isVeteran,
      currentTeam,
      role,
      nationality: null,
      batsRightHanded: null,
      bowlingStyle: null,
      hasWonIPL: null,
      isCurrentlyCaptain: null,
      hasPlayedOver100IPLMatches: null,
      hasPlayedTestCricket: null,
      hasPlayedWorldCup: null,
      isWellKnown: null,
    });
  }

  console.log(`Filtered to ${players.length} notable players (active 2024/25 or 5+ seasons)`);
  return players;
}

// ---------------------------------------------------------------------------
// Gemini enrichment — fills only null fields
// ---------------------------------------------------------------------------

async function enrichBatch(
  genAI: GoogleGenerativeAI,
  batch: PreFilledPlayer[]
): Promise<EnrichedPlayer[]> {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const prompt = `You are a cricket data expert with deep knowledge of IPL history.
For each player object below, fill ONLY the fields that are null.
Do NOT change any field that already has a value — those are verified from official data.

Fields to fill (all others are correct and must be preserved exactly):
- nationality: full country name ("Indian", "Australian", "West Indian", "South African", "English", "New Zealander", "Sri Lankan", "Afghan", "Bangladeshi", "Pakistani", etc.)
- batsRightHanded: true if right-handed batter, false if left-handed
- bowlingStyle: one of "fast" | "medium-fast" | "spin" | "none"
- hasWonIPL: true if they were part of any IPL title-winning squad
- isCurrentlyCaptain: true if they captained an IPL team in the 2024 season
- hasPlayedOver100IPLMatches: true if career IPL appearances >= 100
- hasPlayedTestCricket: true if they have played at least one Test match
- hasPlayedWorldCup: true if they appeared in an ICC ODI or T20I World Cup
- isWellKnown: true if they are a household name in cricket (top-tier recognition)

Players:
${JSON.stringify(batch, null, 2)}

Return the full array with all null fields replaced by the correct values. Return JSON only. No markdown.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    console.warn('  Gemini returned non-JSON, skipping batch');
    return [];
  }

  if (!Array.isArray(raw)) {
    console.warn('  Gemini response is not an array, skipping batch');
    return [];
  }

  const enriched: EnrichedPlayer[] = [];
  for (const item of raw) {
    const parsed = EnrichedPlayerSchema.safeParse(item);
    if (parsed.success) {
      enriched.push(parsed.data);
    } else {
      console.warn(
        `  Skipping invalid player "${(item as { name?: string }).name ?? '?'}":`,
        JSON.stringify(parsed.error.flatten().fieldErrors)
      );
    }
  }

  return enriched;
}

// ---------------------------------------------------------------------------
// Write to Google Sheets
// ---------------------------------------------------------------------------

async function writeToSheets(players: EnrichedPlayer[]): Promise<void> {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: SERVICE_ACCOUNT_EMAIL, private_key: PRIVATE_KEY },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const headers = [
    'id', 'name', 'nationality', 'role', 'batsRightHanded', 'bowlingStyle',
    'currentTeam', 'hasPlayedForMoreThanOneTeam', 'hasWonIPL', 'isCurrentlyCaptain',
    'isForeignPlayer', 'iplDebut', 'isVeteran', 'hasPlayedOver100IPLMatches',
    'hasPlayedTestCricket', 'hasPlayedWorldCup', 'isWellKnown',
  ];

  const rows = players.map((p) =>
    headers.map((h) => {
      const val = (p as unknown as Record<string, unknown>)[h];
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      return String(val ?? '');
    })
  );

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${PLAYERS_TAB}!A:Q`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${PLAYERS_TAB}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers, ...rows] },
  });

  console.log(`\n✅  Wrote ${players.length} players to "${PLAYERS_TAB}" tab`);
}

// ---------------------------------------------------------------------------
// Sleep helper
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('🏏  IPL Akinator — Player Seed Script');
  console.log('=====================================\n');

  // Step 1: Parse CSVs
  const dbMap = await parsePlayerDatabase();
  const auctionMap = await parseAuctionData();

  // Step 2: Build pre-filled objects, apply filter
  const preFilled = buildPreFilledPlayers(dbMap, auctionMap);

  if (preFilled.length === 0) {
    console.error('No players matched the filter criteria. Check your CSV files.');
    process.exit(1);
  }

  // Step 3: Gemini enrichment in batches
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const allEnriched: EnrichedPlayer[] = [];

  const batches: PreFilledPlayer[][] = [];
  for (let i = 0; i < preFilled.length; i += BATCH_SIZE) {
    batches.push(preFilled.slice(i, i + BATCH_SIZE));
  }

  console.log(`\nEnriching ${preFilled.length} players across ${batches.length} batches...\n`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    process.stdout.write(`Batch ${i + 1}/${batches.length} (${batch.length} players)... `);

    const enriched = await enrichBatch(genAI, batch);
    allEnriched.push(...enriched);
    console.log(`${enriched.length}/${batch.length} ok`);

    if (i < batches.length - 1) await sleep(2000);
  }

  // Step 4: Deduplicate
  const seen = new Set<string>();
  const unique = allEnriched.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  const dropped = allEnriched.length - unique.length;
  console.log(`\nTotal: ${unique.length} players (${dropped} duplicates removed)`);

  // Step 5: Write to Sheets
  await writeToSheets(unique);

  console.log('\n🎉  Seed complete!');
  console.log('    Open your Google Sheet and spot-check 5-10 rows for accuracy.');
  console.log('    Then run: pnpm dev');
}

main().catch((err) => {
  console.error('\nSeed script failed:', err);
  process.exit(1);
});
