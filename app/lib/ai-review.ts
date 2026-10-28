import { z } from "zod";
import type { Journal } from "../types/journal";

export const REVIEW_MODEL = "openai/gpt-6-luna";
export const REVIEW_RATE_LIMIT_ID = "trade-journal-ai-review";
export const REVIEW_BODY_LIMIT = 24_000;
const short = z.string().max(80);
export const reviewInputSchema = z.object({
  target: short, category: z.enum(["株式", "FX"]), tradeDate: z.string().max(10),
  decision: z.enum(["Buy", "Sell"]), status: z.enum(["holding", "partial", "closed"]),
  marketEnvironment: short, marketTheme: short, majorEvent: short,
  reason: z.string().max(1000), emotion: short, result: short,
  review: z.string().max(1000), ruleFollowed: z.boolean(),
  recentSettlements: z.array(z.object({
    date: z.string().max(10), outcome: z.enum(["利益", "損失", "損益なし"]),
    reason: z.string().max(300), emotion: short, review: z.string().max(300),
  }).strict()).max(3),
  omittedSettlements: z.number().int().nonnegative().max(100_000),
}).strict();
export const reviewTextSchema = z.object({
  judgment: z.string().min(1).max(400), discipline: z.string().min(1).max(400),
  nextStep: z.string().min(1).max(400),
}).strict();
export const reviewResponseSchema = z.object({
  review: reviewTextSchema, model: z.string().min(1).max(120), createdAt: z.iso.datetime(),
}).strict();
export const savedReviewSchema = reviewResponseSchema.extend({
  version: z.literal(1), source: z.string().max(12_000),
});
export type SavedReview = z.infer<typeof savedReviewSchema>;
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export function readSavedReview(value: unknown): SavedReview | undefined {
  const result = savedReviewSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

// Exclude quantities, prices, balances, IDs and other records. Preview and request
// must use this exact same object, including the displayed text limits.
export function prepareReview(journal: Journal): ReviewInput {
  return reviewInputSchema.parse({
    target: journal.target.slice(0, 80), category: journal.category,
    tradeDate: journal.tradeDate.slice(0, 10), decision: journal.decision, status: journal.status,
    marketEnvironment: journal.marketEnvironment.slice(0, 80),
    marketTheme: journal.marketTheme.slice(0, 80), majorEvent: journal.majorEvent.slice(0, 80),
    reason: journal.reason.slice(0, 1000), emotion: journal.emotion.slice(0, 80),
    result: journal.result.slice(0, 80), review: journal.review.slice(0, 1000),
    ruleFollowed: journal.ruleFollowed,
    recentSettlements: [...journal.settlements]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
      .map(s => ({ date: s.settlementDate.slice(0, 10),
        outcome: s.realizedProfit > 0 ? "利益" : s.realizedProfit < 0 ? "損失" : "損益なし",
        reason: s.reason.slice(0, 300), emotion: s.emotion.slice(0, 80), review: s.review.slice(0, 300) })),
    omittedSettlements: Math.max(0, journal.settlements.length - 3),
  });
}
