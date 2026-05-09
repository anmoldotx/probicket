import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import type { IAIService } from '../interfaces/IAIService';
import type { IPLPlayer, AskedQuestion, AnswerValue } from '../types';
import type { QuestionResult, FilterResult, GuessResult } from '../types';
import type { Config } from '../config/env';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// All queryable attributes + their natural question phrasings (fallback only)
// Gemini generates the actual question wording — this is used for fallback.
// ---------------------------------------------------------------------------

const ATTRIBUTE_QUESTIONS: Record<string, string> = {
  isForeignPlayer: 'Is this player from outside India?',
  'role:batsman': 'Is this player primarily a batsman?',
  'role:bowler': 'Is this player primarily a bowler?',
  'role:allrounder': 'Is this player an all-rounder?',
  'role:wicketkeeper': 'Is this player a wicket-keeper?',
  batsRightHanded: 'Does this player bat right-handed?',
  bowlsFast: 'Does this player bowl fast or medium-fast?',
  bowlsSpin: 'Does this player bowl spin?',
  hasWonIPL: 'Has this player won an IPL title?',
  isCurrentlyCaptain: 'Has this player captained an IPL team recently?',
  isVeteran: 'Has this player been in IPL since 2012 or earlier?',
  hasPlayedOver100IPLMatches: 'Has this player played 100 or more IPL matches?',
  hasPlayedTestCricket: 'Has this player played Test cricket internationally?',
  hasPlayedWorldCup: 'Has this player appeared in an ICC World Cup?',
  isWellKnown: 'Is this player a widely recognised cricket star?',
  hasPlayedForMoreThanOneTeam: 'Has this player played for more than one IPL team?',
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
// Local attribute resolution — maps attribute key → boolean value on a player
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
// Attribute distribution — compact string sent to Gemini instead of player JSON
// Shows yes-count/total so Gemini can pick the best-splitting attribute.
// ---------------------------------------------------------------------------

function buildDistribution(candidates: IPLPlayer[], askedAttributes: Set<string>): string {
  const total = candidates.length;
  const lines: string[] = [`total_candidates: ${total}`];

  for (const attr of ALL_ATTRIBUTES) {
    if (askedAttributes.has(attr)) continue;
    const yes = candidates.filter((p) => getAttributeValue(p, attr)).length;
    const pct = Math.round((yes / total) * 100);
    lines.push(`${attr}: ${yes}/${total} (${pct}%)`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// When the pool is small, include player names so Gemini can ask targeted
// contextual questions (e.g. "Is this player known for the helicopter shot?")
// rather than generic attribute phrasing.
// ---------------------------------------------------------------------------

const CONTEXTUAL_THRESHOLD = 15;

function buildCandidateContext(candidates: IPLPlayer[]): string {
  return candidates
    .map((p) => `${p.name} (${p.currentTeam}, ${p.role})`)
    .join(', ');
}

// ---------------------------------------------------------------------------
// Local confidence heuristic — no Gemini needed
// ---------------------------------------------------------------------------

function estimateConfidence(remaining: number): number {
  if (remaining === 1) return 95;
  if (remaining === 2) return 88;
  if (remaining <= 4) return 82;
  if (remaining <= 8) return 60;
  return 25;
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

  // ── Prompt A: Question generation ──────────────────────────────────────────
  // Large pool (>15): sends only the distribution table (~150 tokens).
  // Small pool (≤15): also sends player names so Gemini can ask targeted,
  //   player-aware questions rather than generic attribute phrasing.
  async generateQuestion(
    candidates: IPLPlayer[],
    history: AskedQuestion[]
  ): Promise<QuestionResult> {
    const askedAttributes = new Set(history.map((h) => h.attribute));
    const distribution = buildDistribution(candidates, askedAttributes);
    const isSmallPool = candidates.length <= CONTEXTUAL_THRESHOLD;

    const contextSection = isSmallPool
      ? `\nRemaining candidates (use these to ask a precise, player-aware question):\n${buildCandidateContext(candidates)}\n`
      : '';

    const questionInstruction = isSmallPool
      ? 'Phrase a targeted yes/no question that would best distinguish between the specific players listed. The question can reference playing style, career moments, or team history — not just the attribute name.'
      : 'Phrase a natural yes/no question for a general cricket audience.';

    const validKeys = ALL_ATTRIBUTES.join(', ');

    const prompt = `You are the question engine for an IPL (Indian Premier League) cricket Akinator game.
Pick the single best attribute to ask about — the one whose yes% is closest to 50%.
Do NOT pick any attribute already in the asked list.
${contextSection}
Attribute distribution (attribute: yes/total, %yes):
${distribution}

RULES:
- ALL questions MUST be specifically about the player's IPL career and IPL records — not Test cricket, ODIs, or other leagues.
- Frame questions in IPL context, e.g. "In the IPL, has this player ever captained a franchise?" not "Has this player been a captain?"
- The "attribute" field MUST be EXACTLY one of these valid values (copy exactly, no variation):
  ${validKeys}
- If you cannot map your question to one of the above attributes, pick the closest matching one from the list.

${questionInstruction}

Return JSON only — no markdown, no explanation:
{"question": "<IPL-specific yes/no question>", "attribute": "<one of the valid attribute names above>"}`;

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

    return this.fallbackQuestion(askedAttributes);
  }

  // ── Filtering: pure local logic — zero Gemini tokens ──────────────────────
  // The question was generated from a known attribute, so we filter deterministically.
  // "maybe" / "don't_know" → keep all candidates unchanged.
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

  // ── Prompt B: Final guess ──────────────────────────────────────────────────
  // Sends only player names + teams + Q&A history (~100-200 tokens total).
  async makeGuess(
    candidates: IPLPlayer[],
    history: AskedQuestion[]
  ): Promise<GuessResult> {
    const candidateList = candidates
      .map((p) => `${p.name} (${p.currentTeam})`)
      .join(', ');

    const qa = history
      .map((h) => `- ${h.question} → ${h.answer}`)
      .join('\n');

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

  // ── Fallback: pick the available attribute closest to 50/50 locally ────────
  private fallbackQuestion(askedAttributes: Set<string>): QuestionResult {
    for (const attr of ALL_ATTRIBUTES) {
      if (!askedAttributes.has(attr)) {
        return {
          question: ATTRIBUTE_QUESTIONS[attr],
          attribute: attr,
        };
      }
    }
    return { question: 'Is this player currently active in IPL?', attribute: 'isCurrentlyCaptain' };
  }
}
