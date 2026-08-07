export type TradeMarker = {
  id: string;
  date: string;
  price: number;
  kind: "buy" | "sell";
  label: "買" | "売" | "買戻";
  quantity: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function positiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function dateKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

export function extractTradeMarkers(value: unknown, ticker: string): TradeMarker[] {
  if (!Array.isArray(value)) return [];
  const normalizedTicker = ticker.trim().toUpperCase();

  return value.flatMap((entry, entryIndex) => {
    if (!isRecord(entry)) return [];
    if (entry.category !== "株式" || entry.currency === "JPY") return [];
    if (typeof entry.target !== "string" || entry.target.trim().toUpperCase() !== normalizedTicker) return [];

    const markers: TradeMarker[] = [];
    const entryDate = dateKey(entry.tradeDate ?? entry.createdAt);
    const entryPrice = positiveNumber(entry.acquisitionPrice);
    const direction = entry.decision === "Sell" || entry.decision === "売り" || entry.entrySide === "Sell" ? "Sell" : "Buy";
    if (entryDate && entryPrice !== null) {
      markers.push({
        id: `entry-${String(entry.id ?? entryIndex)}`,
        date: entryDate,
        price: entryPrice,
        kind: direction === "Buy" ? "buy" : "sell",
        label: direction === "Buy" ? "買" : "売",
        quantity: positiveNumber(entry.shareCount ?? entry.shares),
      });
    }

    if (Array.isArray(entry.settlements)) {
      entry.settlements.forEach((settlement, settlementIndex) => {
        if (!isRecord(settlement)) return;
        const settlementDate = dateKey(settlement.settlementDate ?? settlement.createdAt);
        const settlementPrice = positiveNumber(settlement.settlementPrice);
        if (!settlementDate || settlementPrice === null) return;
        markers.push({
          id: `settlement-${String(entry.id ?? entryIndex)}-${String(settlement.id ?? settlementIndex)}`,
          date: settlementDate,
          price: settlementPrice,
          kind: direction === "Buy" ? "sell" : "buy",
          label: direction === "Buy" ? "売" : "買戻",
          quantity: positiveNumber(settlement.quantity),
        });
      });
    }

    return markers;
  }).sort((left, right) => left.date.localeCompare(right.date));
}
