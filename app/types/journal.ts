export type TradeCategory = "株式" | "FX";

export type Journal = {
  id: number;
  category: string;
  target: string;
  marketEnvironment: string;
  marketTheme: string;
  majorEvent: string;
  amount: string;
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
