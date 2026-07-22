export type WatchlistCurrency = "USD" | "JPY";

export type WatchlistStatus = "監視中" | "✅ 購入済" | "❌ 見送り";

export type WatchlistItem = {
  id: number;
  ticker: string;
  companyName: string;
  currency: WatchlistCurrency;
  startingPrice: string;
  targetPrice: string;
  startDate: string;
  reason: string;
  status: WatchlistStatus;
};
