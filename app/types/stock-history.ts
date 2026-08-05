export type StockHistoryRange = "1M" | "3M" | "6M";

export type StockHistoryPoint = {
  date: string;
  close: number;
};

export type StockHistoryResponse = {
  ticker: string;
  range: StockHistoryRange;
  points: StockHistoryPoint[];
  updatedAt: string;
};
