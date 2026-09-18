import assert from "node:assert/strict";
import test from "node:test";
import { createBackup, parseBackup, restoreBackup, STORAGE_KEYS, RECOVERY_KEY } from "../app/lib/backup.ts";

const journal = { id: 1, createdAt: "2026-09-18T12:00:00Z", category: "株式", target: "TEST", marketEnvironment: "未選択", marketTheme: "未選択", majorEvent: "未選択", currency: "USD", shareCount: "2", status: "partial", remainingShares: "1", acquisitionPrice: "12", profit: "3", decision: "Buy", reason: "決算を確認", emotion: "冷静", result: "未確定", review: "振り返り", ruleFollowed: true, tradeDate: "2026-09-18", settlements: [{ id: "s1", settlementDate: "2026-09-18", quantity: 1, settlementPrice: 15, realizedProfit: 3, reason: "一部利確", emotion: "冷静", review: "確認", createdAt: "2026-09-18T12:00:00Z" }] };
const watch = { id: 2, createdAt: journal.createdAt, ticker: "TEST", companyName: "テスト", currency: "JPY", startingPrice: "100", targetPrice: "90", startDate: "2026-09-18", reason: "監視", status: "監視中" };
const paper = { id: 3, createdAt: journal.createdAt, ticker: "TEST", companyName: "テスト", side: "買い", shareCount: "2", acquisitionPrice: "100", reason: "練習", emotion: "冷静", result: "未確定", memo: "日本語メモ" };
function store(rows = [[], [], []]) {
  const map = new Map(STORAGE_KEYS.map((key, i) => [key, JSON.stringify(rows[i])]));
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => { map.set(key, value); }, removeItem: key => { map.delete(key); } };
}
test("all three record types and settlements survive export / import without alteration", () => {
  const source = store([[journal], [watch], [paper]]);
  const backup = parseBackup(JSON.stringify(createBackup(source)));
  const target = store();
  restoreBackup(target, backup);
  for (const key of STORAGE_KEYS) assert.equal(target.getItem(key), source.getItem(key));
});
test("reject malformed, incomplete, future-version, invalid enum and duplicate records without writing", () => {
  const valid = createBackup(store([[journal], [watch], [paper]]));
  const variants = ["{", "[]", JSON.stringify({ ...valid, version: 2 }), JSON.stringify({ ...valid, data: {} })];
  for (const key of STORAGE_KEYS) {
    variants.push(JSON.stringify({ ...valid, data: { ...valid.data, [key]: [null] } }));
    variants.push(JSON.stringify({ ...valid, data: { ...valid.data, [key]: [valid.data[key][0], valid.data[key][0]] } }));
  }
  variants.push(JSON.stringify({ ...valid, data: { ...valid.data, "paper-trades": [{ ...paper, side: "invalid" }] } }));
  for (const value of variants) assert.throws(() => parseBackup(value));
  const target = store([[journal], [], []]);
  assert.throws(() => restoreBackup(target, { ...valid, version: 2 }));
  assert.equal(target.getItem(RECOVERY_KEY), null);
  assert.equal(JSON.parse(target.getItem(STORAGE_KEYS[0])).length, 1);
});
test("empty backup replaces records and undo snapshot preserves original records", () => {
  const target = store([[journal], [watch], [paper]]);
  const before = createBackup(target);
  restoreBackup(target, createBackup(store()));
  for (const key of STORAGE_KEYS) assert.equal(target.getItem(key), "[]");
  assert.deepEqual(parseBackup(target.getItem(RECOVERY_KEY)).data, before.data);
});
test("quota failure mid-restore rolls back all records", () => {
  const target = store([[journal], [watch], [paper]]);
  const original = createBackup(target);
  const set = target.setItem;
  let calls = 0;
  target.setItem = (key, value) => { if (++calls === 3) throw new Error("quota"); set(key, value); };
  assert.throws(() => restoreBackup(target, createBackup(store())), /元の記録を保持/);
  assert.deepEqual(createBackup(target).data, original.data);
});
test("checkpoint failure never changes records; unrelated storage stays untouched", () => {
  const target = store([[journal], [], []]);
  target.setItem("unrelated", "keep");
  const original = createBackup(target);
  const set = target.setItem;
  target.setItem = (key, value) => { if (key === RECOVERY_KEY) throw new Error("quota"); set(key, value); };
  assert.throws(() => restoreBackup(target, createBackup(store())));
  assert.deepEqual(createBackup(target).data, original.data);
  assert.equal(target.getItem("unrelated"), "keep");
});
