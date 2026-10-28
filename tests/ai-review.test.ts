import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { ActiveJournal } from "../app/types/journal";
import { prepareReview, readSavedReview, REVIEW_BODY_LIMIT, REVIEW_MODEL } from "../app/lib/ai-review";
import { createBackup, parseBackup, restoreBackup } from "../app/lib/backup";

const mocks = vi.hoisted(() => ({ generate: vi.fn(), limit: vi.fn() }));
vi.mock("ai", () => ({ generateText: mocks.generate, Output: { object: (x: unknown) => x } }));
vi.mock("@vercel/firewall", () => ({ checkRateLimit: mocks.limit }));
import { GET, POST } from "../app/api/ai-review/route";

const journal: ActiveJournal = {
  id: 1, createdAt: "2026-10-29T00:00:00.000Z", category: "株式", target: "TEST",
  marketEnvironment: "レンジ相場", marketTheme: "その他", majorEvent: "未選択",
  currency: "USD", shareCount: "10", status: "holding", remainingShares: "10",
  settlements: [], acquisitionPrice: "100", profit: "", decision: "Buy",
  reason: "決算内容を確認してから少額で試した。", emotion: "冷静", result: "未確定",
  review: "撤退する条件を先に記録したい。", ruleFollowed: true, tradeDate: "2026-10-29",
};
const response = {
  review: { judgment: "結果は未確定です。", discipline: "具体的なルールは確認できません。", nextStep: "次回は撤退条件を一つ記録しましょう。" },
  model: "test/model", createdAt: "2026-10-29T00:00:00.000Z",
};
const saved = { ...response, version: 1 as const, source: JSON.stringify(prepareReview(journal)) };
function request(body: unknown = prepareReview(journal), headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/ai-review", { method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body) });
}

beforeEach(() => {
  vi.stubEnv("AI_REVIEW_ENABLED", "true"); vi.stubEnv("AI_GATEWAY_API_KEY", "test-not-a-real-key");
  vi.stubEnv("VERCEL_OIDC_TOKEN", ""); vi.stubEnv("AI_GATEWAY_MODEL", "test/model");
  vi.stubEnv("VERCEL", "1"); vi.stubEnv("NODE_ENV", "production");
  mocks.generate.mockReset().mockResolvedValue({ output: response.review });
  mocks.limit.mockReset().mockResolvedValue({ rateLimited: false });
});
afterEach(() => vi.unstubAllEnvs());

describe("AI request boundary", () => {
  it("is off by default and never calls the model when disabled", async () => {
    vi.stubEnv("AI_REVIEW_ENABLED", "");
    expect(await GET().json()).toEqual({ enabled: false });
    expect((await POST(request())).status).toBe(503);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("rejects foreign or missing origin", async () => {
    expect((await POST(request(undefined, { origin: "https://foreign.test" }))).status).toBe(403);
    expect((await POST(request(undefined, { origin: "" }))).status).toBe(403);
    expect(mocks.limit).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("rejects invalid JSON, unsupported fields and wrong content type", async () => {
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request({ ...prepareReview(journal), accountBalance: 500 }))).status).toBe(400);
    expect((await POST(request(undefined, { "content-type": "text/plain" }))).status).toBe(415);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("enforces the byte limit even without content-length", async () => {
    expect((await POST(request("x".repeat(REVIEW_BODY_LIMIT + 1)))).status).toBe(413);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("does not send an empty diary", async () => {
    expect((await POST(request({ ...prepareReview(journal), reason: "", review: "" }))).status).toBe(400);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it.each([{ rateLimited: false, error: "not-found" }, { rateLimited: true }, { rateLimited: true, error: "blocked" }])("stops on quota or missing configuration: %j", async limit => {
    mocks.limit.mockResolvedValue(limit);
    expect([429, 503]).toContain((await POST(request())).status);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("fails closed when quota service is unreachable", async () => {
    mocks.limit.mockRejectedValue(new Error("network failure"));
    expect((await POST(request())).status).toBe(503);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("never uses the SDK development bypass for live generation", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect((await POST(request())).status).toBe(503);
    expect(mocks.limit).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("returns a structured review with bounded output, no automatic retries and one shared bucket", async () => {
    const result = await POST(request());
    expect(result.status).toBe(200); expect(result.headers.get("cache-control")).toBe("no-store");
    expect(await result.json()).toMatchObject({ review: response.review, model: REVIEW_MODEL });
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      prompt: saved.source, maxOutputTokens: 1200, maxRetries: 0,
    }));
    expect(mocks.limit).toHaveBeenCalledWith("trade-journal-ai-review", expect.objectContaining({ rateLimitKey: "all-trade-journal-reviews" }));
  });
  it("does not disclose upstream errors or prompts", async () => {
    mocks.generate.mockRejectedValue(new Error("secret provider credential and private prompt"));
    const result = await POST(request());
    expect(result.status).toBe(502); expect(await result.text()).not.toMatch(/secret|private/);
  });
});

describe("local data and privacy", () => {
  it("sends only allowlisted fields and the latest three settlements", () => {
    const input = prepareReview({ ...journal, reason: "あ".repeat(1100), settlements: [1, 2, 3, 4].map(n => ({
      id: String(n), createdAt: `2026-10-${20 + n}T00:00:00.000Z`, settlementDate: `2026-10-${20 + n}`,
      quantity: 1, settlementPrice: 120, realizedProfit: 20,
      reason: "決済理由", emotion: "冷静", review: "振り返り",
    })) });
    expect(input.reason.length).toBe(1000); expect(input.recentSettlements[0].date).toBe("2026-10-24");
    expect(input.recentSettlements).toHaveLength(3); expect(input.omittedSettlements).toBe(1);
    for (const key of ["id", "aiReview", "shareCount", "acquisitionPrice", "profit", "remainingShares", "currency"])
      expect(input).not.toHaveProperty(key);
    expect(input.recentSettlements[0]).not.toHaveProperty("settlementPrice");
  });
  it("detects changed source and rejects malformed stored AI comments", () => {
    expect(readSavedReview(saved)).toEqual(saved);
    expect(JSON.stringify(prepareReview({ ...journal, reason: "変更後" }))).not.toBe(saved.source);
    expect(readSavedReview({ ...saved, review: { judgment: 5 } })).toBeUndefined();
  });
  it("round-trips old backups and AI comments through backup/restore", () => {
    const values = new Map<string, string>();
    const store = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
    values.set("trade-journals", JSON.stringify([journal]));
    expect(createBackup(store).data["trade-journals"]).toHaveLength(1);
    values.set("trade-journals", JSON.stringify([{ ...journal, aiReview: saved }]));
    const backup = parseBackup(JSON.stringify(createBackup(store)));
    values.set("trade-journals", "[]"); restoreBackup(store, backup);
    expect(JSON.parse(store.getItem("trade-journals")!)[0].aiReview).toEqual(saved);
  });
});
