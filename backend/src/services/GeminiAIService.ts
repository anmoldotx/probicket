import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import type { IAIService } from '../interfaces/IAIService';
import type { IPLPlayer, AskedQuestion, AnswerValue } from '../types';
import type { QuestionResult, FilterResult, GuessResult } from '../types';
import type { Config } from '../config/env';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Attribute questions — also used as the local phrasing when no Gemini needed
// ---------------------------------------------------------------------------

const ATTRIBUTE_QUESTIONS: Record<string, string> = {
  isForeignPlayer:             'Is this player from outside India?',
  'role:batsman':              'Is this player primarily a batsman?',
  'role:bowler':               'Is this player primarily a bowler?',
  'role:allrounder':           'Is this player an all-rounder?',
  'role:wicketkeeper':         'Is this player a wicket-keeper?',
  batsRightHanded:             'Does this player bat right-handed?',
  bowlsFast:                   'Does this player bowl fast or medium-fast?',
  bowlsSpin:                   'Does this player bowl spin?',
  hasWonIPL:                   'Has this player won an IPL title?',
  isCurrentlyCaptain:          'Has this player captained an IPL team in a recent season?',
  isVeteran:                   'Has this player been in the IPL since 2012 or earlier?',
  hasPlayedOver100IPLMatches:  'Has this player played 100 or more IPL matches?',
  hasPlayedTestCricket:        'Has this player played Test cricket internationally?',
  hasPlayedWorldCup:           'Has this player appeared in an ICC World Cup?',
  isWellKnown:                 'Is this player a widely recognised name in IPL?',
  hasPlayedForMoreThanOneTeam: 'Has this player played for more than one IPL franchise?',
};

const ALL_ATTRIBUTES = Object.keys(ATTRIBUTE_QUESTIONS);

// ---------------------------------------------------------------------------
// Zod schemas for Gemini responses
// ---------------------------------------------------------------------------

const QuestionResponseSchema = z.object({
  question: z.string().min(1),
  attribute: z.string().min(1),
});

const GuessResponseSchema = z.object({
  name: z.string().min(1),
  team: z.string().min(1),
  confidence: z.number().min(0).max(100),
  reasoning: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Local attribute resolver
// ---------------------------------------------------------------------------

function getAttributeValue(player: IPLPlayer, attribute: string): boolean {
  switch (attribute) {
    case 'isForeignPlayer':             return player.isForeignPlayer;
    case 'role:batsman':                return player.role === 'batsman';
    case 'role:bowler':                 return player.role === 'bowler';
    case 'role:allrounder':             return player.role === 'allrounder';
    case 'role:wicketkeeper':           return player.role === 'wicketkeeper';
    case 'batsRightHanded':             return player.batsRightHanded;
    case 'bowlsFast':                   return player.bowlsFast;
    case 'bowlsSpin':                   return player.bowlsSpin;
    case 'hasWonIPL':                   return player.hasWonIPL;
    case 'isCurrentlyCaptain':          return player.isCurrentlyCaptain;
    case 'isVeteran':                   return player.isVeteran;
    case 'hasPlayedOver100IPLMatches':  return player.hasPlayedOver100IPLMatches;
    case 'hasPlayedTestCricket':        return player.hasPlayedTestCricket;
    case 'hasPlayedWorldCup':           return player.hasPlayedWorldCup;
    case 'isWellKnown':                 return player.isWellKnown;
    case 'hasPlayedForMoreThanOneTeam': return player.hasPlayedForMoreThanOneTeam;
    default:                            return false;
  }
}

// ---------------------------------------------------------------------------
// Core: select the best attribute to ask about entirely locally.
//
// Rules:
//   1. Never re-ask an already-asked attribute.
//   2. Skip attributes that are 0 % or 100 % in the current pool — they carry
//      zero information and lead to absurd follow-up questions (e.g. asking
//      "is this player a bowler?" when every remaining candidate is a batsman).
//   3. Among the rest, pick the attribute whose yes-ratio is closest to 50 %
//      (maximum information gain / entropy reduction).
//
// Returns null only if no useful attribute remains (should not happen in
// practice with 16 attributes and ≤12 questions).
// ---------------------------------------------------------------------------

function selectBestAttribute(
  candidates: IPLPlayer[],
  askedAttributes: Set<string>
): { attribute: string; yesCount: number; total: number } | null {
  const total = candidates.length;
  let best: { attribute: string; yesCount: number; total: number } | null = null;
  let bestScore = Infinity; // minimise |0.5 - ratio|

  for (const attr of ALL_ATTRIBUTES) {
    if (askedAttributes.has(attr)) continue;

    const yes = candidates.filter((p) => getAttributeValue(p, attr)).length;
    const ratio = yes / total;

    // Skip zero-information attributes — already implied by previous answers.
    if (ratio === 0 || ratio === 1) continue;

    const score = Math.abs(0.5 - ratio);
    if (score < bestScore) {
      bestScore = score;
      best = { attribute: attr, yesCount: yes, total };
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Build compact distribution string for Gemini (small-pool contextual mode).
// Only includes attributes that carry information (not 0 % or 100 %).
// ---------------------------------------------------------------------------

function buildUsefulDistribution(
  candidates: IPLPlayer[],
  askedAttributes: Set<string>
): string {
  const total = candidates.length;
  const lines: string[] = [`total_candidates: ${total}`];

  for (const attr of ALL_ATTRIBUTES) {
    if (askedAttributes.has(attr)) continue;
    const yes = candidates.filter((p) => getAttributeValue(p, attr)).length;
    const pct = Math.round((yes / total) * 100);
    if (pct === 0 || pct === 100) continue; // skip zero-information attributes
    lines.push(`${attr}: ${yes}/${total} (${pct}%)`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Confidence heuristic — no Gemini needed
// ---------------------------------------------------------------------------

function estimateConfidence(remaining: number): number {
  if (remaining === 1) return 95;
  if (remaining === 2) return 88;
  if (remaining <= 4) return 82;
  if (remaining <= 8) return 60;
  return 25;
}

// ---------------------------------------------------------------------------
// Pool sizes
// ---------------------------------------------------------------------------

// Below this threshold we ask Gemini to generate a targeted, player-aware question.
// Above it we select and phrase the question entirely locally (instant, no API call).
const CONTEXTUAL_THRESHOLD = 15;

function buildCandidateContext(candidates: IPLPlayer[]): string {
  return candidates.map((p) => `${p.name} (${p.currentTeam}, ${p.role})`).join(', ');
}

// ---------------------------------------------------------------------------
// GeminiAIService
// ---------------------------------------------------------------------------

export class GeminiAIService implements IAIService {
  private readonly model;

  constructor(config: Config) {
    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({
      model: config.GEMINI_MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    });
  }

  // ── Question generation ────────────────────────────────────────────────────
  //
  // LARGE POOL (> CONTEXTUAL_THRESHOLD):
  //   Pick the best attribute locally (pure math, instant, no API call).
  //   Use the static question phrasing from ATTRIBUTE_QUESTIONS.
  //   This eliminates hallucinated follow-ups like "Is this player a bowler?"
  //   after the user already confirmed they are a batsman.
  //
  // SMALL POOL (≤ CONTEXTUAL_THRESHOLD):
  //   Ask Gemini to generate a contextual, player-aware question using the
  //   actual candidate names — but only from the useful (non-degenerate)
  //   distribution so Gemini cannot pick a 0 %/100 % attribute.
  //
  async generateQuestion(
    candidates: IPLPlayer[],
    history: AskedQuestion[]
  ): Promise<QuestionResult> {
    const askedAttributes = new Set(history.map((h) => h.attribute));
    const isSmallPool = candidates.length <= CONTEXTUAL_THRESHOLD;

    // ── Fast path: local selection (large pool) ──────────────────────────────
    if (!isSmallPool) {
      const best = selectBestAttribute(candidates, askedAttributes);
      if (best) {
        logger.debug(
          { attr: best.attribute, yes: best.yesCount, total: best.total },
          'Local question selection'
        );
        return {
          question: ATTRIBUTE_QUESTIONS[best.attribute],
          attribute: best.attribute,
        };
      }
      // Fallback if every attribute is 0 %/100 % (very unusual)
      return this.fallbackQuestion(askedAttributes);
    }

    // ── Contextual path: Gemini (small pool) ────────────────────────────────
    const distribution = buildUsefulDistribution(candidates, askedAttributes);
    const validKeys = ALL_ATTRIBUTES.join(', ');

    const prompt = `You are the question engine for an IPL cricket Akinator game.
The player pool has narrowed to ${candidates.length} specific players. Ask a targeted question.

Remaining candidates:
${buildCandidateContext(candidates)}

Attribute distribution — ONLY useful attributes shown (0% and 100% already filtered out):
${distribution}

RULES:
- Pick the attribute whose yes% is closest to 50% (maximum information gain).
- ALL questions MUST reference IPL career specifically — not Test cricket, ODIs, or other leagues.
- Phrase the question in a way that directly relates to the specific players listed above.
- The "attribute" field MUST be EXACTLY one of: ${validKeys}

Return JSON only:
{"question": "<targeted yes/no question about IPL>", "attribute": "<exact attribute name>"}`;

    try {
      const result = await this.model.generateContent(prompt);
      const parsed = QuestionResponseSchema.safeParse(
        JSON.parse(result.response.text().trim())
      );
      if (parsed.success && ALL_ATTRIBUTES.includes(parsed.data.attribute)) {
        return parsed.data;
      }
      logger.warn({ raw: result.response.text() }, 'Gemini question response invalid');
    } catch (err) {
      logger.error({ err }, 'Gemini generateQuestion failed');
    }

    // Gemini failed — fall back to local selection
    const best = selectBestAttribute(candidates, askedAttributes);
    if (best) {
      return { question: ATTRIBUTE_QUESTIONS[best.attribute], attribute: best.attribute };
    }
    return this.fallbackQuestion(askedAttributes);
  }

  // ── Filtering: pure local logic — zero Gemini tokens ──────────────────────
  async filterCandidates(
    candidates: IPLPlayer[],
    _question: string,
    attribute: string,
    answer: AnswerValue,
    _history: AskedQuestion[]
  ): Promise<FilterResult> {
    let remaining: IPLPlayer[];

    if (answer === 'maybe' || answer === "don't_know") {
      remaining = candidates;
    } else {
      const want = answer === 'yes';
      remaining = candidates.filter((p) => getAttributeValue(p, attribute) === want);
      if (remaining.length === 0) remaining = candidates; // safety: never wipe the pool
    }

    return {
      remainingIds: remaining.map((p) => p.id),
      confidencePercent: estimateConfidence(remaining.length),
    };
  }

  // ── Final guess ────────────────────────────────────────────────────────────
  async makeGuess(
    candidates: IPLPlayer[],
    history: AskedQuestion[]
  ): Promise<GuessResult> {
    const candidateList = candidates.map((p) => `${p.name} (${p.currentTeam})`).join(', ');
    const qa = history.map((h) => `- ${h.question} → ${h.answer}`).join('\n');

    const prompt = `IPL Akinator — make a final guess.

Q&A history:
${qa}

Remaining candidates: ${candidateList}

Return JSON only:
{"name": "...", "team": "...", "confidence": 0-100, "reasoning": "<1-2 sentences>"}`;

    try {
      const result = await this.model.generateContent(prompt);
      const parsed = GuessResponseSchema.safeParse(
        JSON.parse(result.response.text().trim())
      );
      if (parsed.success) return parsed.data;
      logger.warn({ raw: result.response.text() }, 'Gemini makeGuess response invalid');
    } catch (err) {
      logger.error({ err }, 'Gemini makeGuess failed');
    }

    const best = candidates[0];
    return {
      name: best.name,
      team: best.currentTeam,
      confidence: 50,
      reasoning: 'Best match based on available information.',
    };
  }

  // ── Fallback ───────────────────────────────────────────────────────────────
  private fallbackQuestion(askedAttributes: Set<string>): QuestionResult {
    for (const attr of ALL_ATTRIBUTES) {
      if (!askedAttributes.has(attr)) {
        return { question: ATTRIBUTE_QUESTIONS[attr], attribute: attr };
      }
    }
    return { question: 'Has this player captained an IPL team?', attribute: 'isCurrentlyCaptain' };
  }
}
