"use client";

import { useEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StockHistoryRange, StockHistoryResponse } from "../../types/stock-history";
import type { WatchlistItem } from "../../types/watchlist";
import type { TradeMarker } from "../lib/trade-markers";

type Props = {
  item: WatchlistItem;
  currentPrice: number | null;
  tradeMarkers: TradeMarker[];
  onClose: () => void;
};

const RANGE_LABELS: Record<StockHistoryRange, string> = {
  "1M": "1か月",
  "3M": "3か月",
  "6M": "6か月",
};

const historyCache = new Map<string, StockHistoryResponse>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHistoryResponse(value: unknown): value is StockHistoryResponse {
  return isRecord(value) &&
    typeof value.ticker === "string" &&
    (value.range === "1M" || value.range === "3M" || value.range === "6M") &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.points) &&
    value.points.every((point) => isRecord(point) && typeof point.date === "string" && typeof point.close === "number" && Number.isFinite(point.close));
}

function responseError(value: unknown): string {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "チャートデータを取得できませんでした。";
}

function price(value: string | number | null) {
  if (value === null || value === "") return "未入力";
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
    : "未入力";
}

function positivePrice(value: string): number | null {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function StockPriceChart({ item, currentPrice, tradeMarkers, onClose }: Props) {
  const [range, setRange] = useState<StockHistoryRange>("3M");
  const [data, setData] = useState<StockHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const cardRef = useRef<HTMLElement>(null);
  const ticker = item.ticker.trim().toUpperCase();

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ticker]);

  useEffect(() => {
    const key = `${ticker}:${range}`;
    const cached = historyCache.get(key);
    if (cached) {
      const timeout = window.setTimeout(() => {
        setData(cached);
        setError("");
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const currentRequest = ++requestId.current;
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(`/api/stock-history?ticker=${encodeURIComponent(ticker)}&range=${range}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const value: unknown = await response.json();
        if (!response.ok) throw new Error(responseError(value));
        if (!isHistoryResponse(value)) throw new Error("チャートデータの形式が不正です。");
        historyCache.set(key, value);
        if (requestId.current === currentRequest) setData(value);
      } catch (caught: unknown) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        if (requestId.current === currentRequest) {
          setError(caught instanceof Error ? caught.message : "チャートデータを取得できませんでした。");
        }
      } finally {
        if (requestId.current === currentRequest) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [range, ticker]);

  const startingPrice = positivePrice(item.startingPrice);
  const targetPrice = positivePrice(item.targetPrice);
  const visibleTradeMarkers = data
    ? tradeMarkers.filter((marker) => data.points.some((point) => point.date === marker.date))
    : [];
  const changeRange = (nextRange: StockHistoryRange) => {
    if (loading || nextRange === range) return;
    setLoading(true);
    setData(null);
    setError("");
    setRange(nextRange);
  };

  return (
    <section ref={cardRef} id="stock-price-chart" aria-labelledby="chart-title" className="ios-card scroll-mt-6 rounded-2xl p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">PRICE HISTORY</p>
          <h2 id="chart-title" className="mt-1 text-xl font-semibold text-white">{ticker} 株価チャート</h2>
        </div>
        <button type="button" onClick={onClose} className="min-h-10 border border-slate-700 px-4 text-sm text-slate-300 hover:bg-slate-800">閉じる</button>
      </div>

      <div className="mt-5 flex gap-2" aria-label="チャート期間">
        {(Object.keys(RANGE_LABELS) as StockHistoryRange[]).map((option) => (
          <button key={option} type="button" onClick={() => changeRange(option)} disabled={loading || range === option} aria-pressed={range === option} className={`min-h-10 px-4 text-sm font-semibold transition disabled:cursor-wait ${range === option ? "bg-sky-600 text-white" : "border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-60"}`}>
            {RANGE_LABELS[option]}
          </button>
        ))}
      </div>

      <div className="mt-6 h-[280px] sm:h-[360px]" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-400">チャートを読み込み中…</div>
        ) : error ? (
          <div role="alert" className="flex h-full items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-center text-rose-300">{error}</div>
        ) : !data || data.points.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400">チャートデータがありません</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.points} margin={{ top: 16, right: 18, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="#334155" strokeOpacity={0.35} strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(date: string) => date.slice(5).replace("-", "/")} minTickGap={28} />
              <YAxis domain={["auto", "auto"]} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value: number) => `$${value.toFixed(0)}`} width={58} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, color: "#f8fafc" }} labelFormatter={(label) => `日付：${String(label)}`} formatter={(value) => [price(typeof value === "number" ? value : Number(value)), "終値"]} />
              {startingPrice !== null && <ReferenceLine y={startingPrice} stroke="#f59e0b" strokeDasharray="5 4" label={{ value: "監視開始", fill: "#fbbf24", fontSize: 11, position: "insideTopRight" }} />}
              {targetPrice !== null && <ReferenceLine y={targetPrice} stroke="#34d399" strokeDasharray="5 4" label={{ value: "希望価格", fill: "#6ee7b7", fontSize: 11, position: "insideBottomRight" }} />}
              {currentPrice !== null && <ReferenceLine y={currentPrice} stroke="#a78bfa" strokeDasharray="5 4" label={{ value: "現在価格", fill: "#c4b5fd", fontSize: 11, position: "insideTopLeft" }} />}
              <Line type="monotone" dataKey="close" name="終値" stroke="#38bdf8" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#67e8f9", stroke: "#082f49" }} />
              {visibleTradeMarkers.map((marker) => (
                <ReferenceDot
                  key={marker.id}
                  x={marker.date}
                  y={marker.price}
                  r={6}
                  fill={marker.kind === "buy" ? "#34d399" : "#fb7185"}
                  stroke={marker.kind === "buy" ? "#052e2b" : "#4c0519"}
                  strokeWidth={2}
                  label={{
                    value: marker.label,
                    fill: marker.kind === "buy" ? "#6ee7b7" : "#fda4af",
                    fontSize: 11,
                    fontWeight: 700,
                    position: marker.kind === "buy" ? "bottom" : "top",
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-emerald-950 bg-emerald-400" />買い・買戻し</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-rose-950 bg-rose-400" />売り・決済</span>
        {tradeMarkers.length === 0 && <span>この銘柄の売買記録はまだありません</span>}
        {tradeMarkers.length > 0 && visibleTradeMarkers.length === 0 && <span>選択期間内に売買記録はありません</span>}
      </div>

      {visibleTradeMarkers.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="表示中の売買記録">
          {visibleTradeMarkers.map((marker) => (
            <span key={`detail-${marker.id}`} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${marker.kind === "buy" ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300" : "border-rose-400/25 bg-rose-500/10 text-rose-300"}`}>
              {marker.date} {marker.label} {price(marker.price)}{marker.quantity !== null ? ` × ${marker.quantity}株` : ""}
            </span>
          ))}
        </div>
      )}

      <dl className="mt-6 grid gap-3 border-t border-slate-800 pt-5 text-sm sm:grid-cols-3">
        <div><dt className="text-slate-500">監視開始価格</dt><dd className="mt-1 font-semibold text-slate-100">{price(item.startingPrice)}</dd></div>
        <div><dt className="text-slate-500">希望購入価格</dt><dd className="mt-1 font-semibold text-slate-100">{price(item.targetPrice)}</dd></div>
        <div><dt className="text-slate-500">現在価格</dt><dd className="mt-1 font-semibold text-slate-100">{price(currentPrice)}</dd></div>
      </dl>
    </section>
  );
}
