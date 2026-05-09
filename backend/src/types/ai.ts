export interface QuestionResult {
  question: string;
  attribute: string; // which IPLPlayer field this question targets, e.g. "isForeignPlayer"
}

export interface FilterResult {
  remainingIds: string[];
  confidencePercent: number;
}

export interface GuessResult {
  name: string;
  team: string;
  confidence: number;
  reasoning: string;
}
