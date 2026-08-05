export type WatchlistCurrency = "USD" | "JPY";

export type WatchlistStatus = "監視中" | "✅ 購入済" | "❌ 見送り";

export type WatchlistSignal = "BUY" | "WATCH" | "HIGH" | "NO SIGNAL";

export type WatchlistItem = {
  id: number;
  createdAt: string;
  ticker: string;
  companyName: string;
  currency: WatchlistCurrency;
  startingPrice: string;
  targetPrice: string;
  startDate: string;
  reason: string;
  status: WatchlistStatus;
};

export type StockQuote = {
  ticker: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  updatedAt: number;
};
