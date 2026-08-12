import type { WatchlistSignal } from "../types/watchlist";

export function toPositivePrice(value: string): number | null {
  if (!value.trim()) return null;
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

export function calculateChangePercent(
  currentPrice: number | null,
  startingPrice: string,
): number | null {
  const starting = toPositivePrice(startingPrice);
  return currentPrice === null || starting === null
    ? null
    : ((currentPrice - starting) / starting) * 100;
}

export function calculateTargetDifference(
  currentPrice: number | null,
  targetPrice: string,
): number | null {
  const target = toPositivePrice(targetPrice);
  return currentPrice === null || target === null
    ? null
    : ((currentPrice - target) / target) * 100;
}

export function getSignal(
  currentPrice: number | null,
  targetPrice: string,
): WatchlistSignal {
  const target = toPositivePrice(targetPrice);
  if (currentPrice === null || target === null) return "NO SIGNAL";
  if (currentPrice <= target) return "BUY";
  return currentPrice >= target * 1.05 ? "HIGH" : "WATCH";
}
