export type TradeCategory = "株式" | "FX";
export type Currency = "USD" | "JPY";

export type Journal = {
  id: number;
  createdAt: string;
  category: string;
  target: string;
  marketEnvironment: string;
  marketTheme: string;
  majorEvent: string;
  /** @deprecated 旧バージョンの保存データ読み込み専用 */
  amount?: string;
  currency: Currency;
  shareCount: string;
  acquisitionPrice: string;
  profit: string;
  decision: string;
  reason: string;
  emotion: string;
  result: string;
  review: string;
  ruleFollowed: boolean;
  tradeDate: string;
};

export type ActiveJournal = Journal & { category: TradeCategory };
