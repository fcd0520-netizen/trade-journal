export const STORAGE_KEYS = ["trade-journals", "trade-journal-watchlist", "paper-trades"] as const;
export const RECOVERY_KEY = "trade-journal-before-restore";
export type StorageKey = (typeof STORAGE_KEYS)[number];
export type Backup = {
  app: "trade-journal";
  version: 1;
  exportedAt: string;
  data: Record<StorageKey, Record<string, unknown>[]>;
};
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const strings = (v: Record<string, unknown>, keys: string[]) => keys.every(k => typeof v[k] === "string");
const oneOf = (v: unknown, values: string[]) => typeof v === "string" && values.includes(v);

function validRecord(key: StorageKey, v: unknown): v is Record<string, unknown> {
  if (!object(v) || !finite(v.id) || !strings(v, ["createdAt"]) || !Number.isFinite(Date.parse(v.createdAt as string))) return false;
  if (key === "trade-journal-watchlist") return strings(v, ["ticker", "companyName", "startingPrice", "targetPrice", "startDate", "reason"]) && oneOf(v.currency, ["USD", "JPY"]) && oneOf(v.status, ["監視中", "✅ 購入済", "❌ 見送り"]);
  if (key === "paper-trades") return strings(v, ["ticker", "companyName", "shareCount", "acquisitionPrice", "reason", "emotion", "result", "memo"]) && oneOf(v.side, ["買い", "売り"]);
  return strings(v, ["category", "target", "marketEnvironment", "marketTheme", "majorEvent", "shareCount", "remainingShares", "acquisitionPrice", "profit", "reason", "emotion", "result", "review", "tradeDate"])
    && oneOf(v.currency, ["USD", "JPY"]) && oneOf(v.status, ["holding", "partial", "closed"])
    && oneOf(v.decision, ["Buy", "Sell"]) && typeof v.ruleFollowed === "boolean"
    && Array.isArray(v.settlements) && v.settlements.every(s => object(s) && strings(s, ["id", "settlementDate", "reason", "emotion", "review", "createdAt"]) && [s.quantity, s.settlementPrice, s.realizedProfit].every(finite));
}

export function parseBackup(text: string): Backup {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("JSONファイルを読み込めません。バックアップファイルを選んでください。"); }
  if (!object(value) || value.app !== "trade-journal" || value.version !== 1 || typeof value.exportedAt !== "string" || !Number.isFinite(Date.parse(value.exportedAt)) || !object(value.data)) throw new Error("対応するTrade Journalのバックアップではありません。");
  for (const key of STORAGE_KEYS) {
    const rows = value.data[key];
    if (!Array.isArray(rows) || !rows.every(row => validRecord(key, row)) || new Set(rows.map(row => row.id)).size !== rows.length) throw new Error("記録の形式が正しくありません。現在の記録は変更していません。");
  }
  return value as Backup;
}

export function createBackup(storage: Store): Backup {
  const data = Object.fromEntries(STORAGE_KEYS.map(key => [key, JSON.parse(storage.getItem(key) ?? "[]")]));
  return parseBackup(JSON.stringify({ app: "trade-journal", version: 1, exportedAt: new Date().toISOString(), data }));
}

export function restoreBackup(storage: Store, backup: Backup) {
  // Validate again immediately before any writes; keep a durable undo snapshot.
  const checked = parseBackup(JSON.stringify(backup));
  const before = createBackup(storage);
  const previous = STORAGE_KEYS.map(key => storage.getItem(key));
  storage.setItem(RECOVERY_KEY, JSON.stringify(before));
  try {
    for (const key of STORAGE_KEYS) storage.setItem(key, JSON.stringify(checked.data[key]));
  } catch {
    let rolledBack = true;
    STORAGE_KEYS.forEach((key, i) => {
      try {
        const value = previous[i];
        if (value === null) storage.removeItem(key); else storage.setItem(key, value);
      } catch { rolledBack = false; }
    });
    throw new Error(rolledBack ? "保存容量が不足している可能性があります。復元を中止し、元の記録を保持しました。" : "復元が中断されました。「復元前の記録を書き出す」で退避データを保存してください。");
  }
}
