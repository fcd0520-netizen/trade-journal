"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BarShapeProps, TooltipContentProps } from "recharts";
import type { EarningsCalendarResponse, EarningsEvent, EarningsTimeOfDay } from "../../types/earnings";
import type { StockHistoryRange, StockHistoryResponse } from "../../types/stock-history";
import type { TradeMarker } from "../lib/trade-markers";

type ChartItem = {
  ticker: string;
  startingPrice: string;
  targetPrice: string;
};

type Props = {
  item: ChartItem;
  currentPrice: number | null;
  tradeMarkers: TradeMarker[];
  onClose?: () => void;
  context?: "watchlist" | "journal";
};

const RANGE_LABELS: Record<StockHistoryRange, string> = {
  "1M": "1か月",
  "3M": "3か月",
  "6M": "6か月",
};

const RANGE_CALENDAR_DAYS: Record<StockHistoryRange, number> = {
  "1M": 31,
  "3M": 93,
  "6M": 186,
};

const historyCache = new Map<string, StockHistoryResponse>();
const earningsCache = new Map<string, EarningsCalendarResponse>();

type ChartPoint = {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  priceRange: [number, number] | null;
};

type EarningsState = {
  ticker: string;
  data: EarningsCalendarResponse | null;
  error: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHistoryResponse(value: unknown): value is StockHistoryResponse {
  return isRecord(value) &&
    typeof value.ticker === "string" &&
    (value.range === "1M" || value.range === "3M" || value.range === "6M") &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.points) &&
    value.points.every((point) =>
      isRecord(point) &&
      typeof point.date === "string" &&
      ["open", "high", "low", "close", "volume"].every(
        (key) => typeof point[key] === "number" && Number.isFinite(point[key]),
      ),
    );
}

function isEarningsEvent(value: unknown): value is EarningsEvent {
  return isRecord(value) &&
    typeof value.symbol === "string" &&
    typeof value.reportDate === "string" &&
    (value.estimate === null || (typeof value.estimate === "number" && Number.isFinite(value.estimate))) &&
    (value.timeOfDay === "pre-market" ||
      value.timeOfDay === "post-market" ||
      value.timeOfDay === "during-market" ||
      value.timeOfDay === "unknown");
}

function isEarningsCalendarResponse(value: unknown): value is EarningsCalendarResponse {
  return isRecord(value) &&
    typeof value.ticker === "string" &&
    value.horizon === "6month" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.events) &&
    value.events.every(isEarningsEvent);
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

function volume(value: number) {
  return new Intl.NumberFormat("ja-JP", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function earningsTiming(value: EarningsTimeOfDay) {
  if (value === "pre-market") return "市場前";
  if (value === "post-market") return "市場後";
  if (value === "during-market") return "市場中";
  return "時刻未定";
}

function addCalendarDays(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function businessDatesAfter(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() + 1);

  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function CandlestickShape({ x, y, width, height, payload }: BarShapeProps) {
  const point = payload as ChartPoint;
  if (
    point.open === null ||
    point.high === null ||
    point.low === null ||
    point.close === null ||
    point.priceRange === null
  ) return <g aria-hidden="true" />;
  const rising = point.close >= point.open;
  const color = rising ? "#34d399" : "#fb7185";
  const centerX = x + width / 2;
  const candleRange = point.high - point.low;
  const bodyTopPrice = Math.max(point.open, point.close);
  const bodyBottomPrice = Math.min(point.open, point.close);
  const bodyTop = candleRange > 0 ? y + ((point.high - bodyTopPrice) / candleRange) * height : y;
  const calculatedBodyHeight = candleRange > 0 ? ((bodyTopPrice - bodyBottomPrice) / candleRange) * height : 0;
  const bodyHeight = Math.max(1.5, calculatedBodyHeight);
  const bodyWidth = Math.max(1.5, Math.min(width * 0.72, 12));

  return (
    <g aria-hidden="true">
      <line x1={centerX} x2={centerX} y1={y} y2={y + height} stroke={color} strokeWidth={1.25} />
      <rect
        x={centerX - bodyWidth / 2}
        y={bodyTop - (bodyHeight - calculatedBodyHeight) / 2}
        width={bodyWidth}
        height={bodyHeight}
        fill={rising ? "#064e3b" : color}
        stroke={color}
        strokeWidth={1.25}
      />
    </g>
  );
}

function CandlestickTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as ChartPoint | undefined;
  if (!point || point.open === null || point.high === null || point.low === null || point.close === null || point.volume === null) return null;
  const change = point.close - point.open;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/95 px-3 py-2.5 text-xs shadow-xl">
      <p className="font-semibold text-slate-200">{String(label)}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        <dt className="text-slate-500">始値</dt><dd className="text-right text-slate-200">{price(point.open)}</dd>
        <dt className="text-slate-500">高値</dt><dd className="text-right text-slate-200">{price(point.high)}</dd>
        <dt className="text-slate-500">安値</dt><dd className="text-right text-slate-200">{price(point.low)}</dd>
        <dt className="text-slate-500">終値</dt><dd className={`text-right font-semibold ${change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{price(point.close)}</dd>
        <dt className="text-slate-500">出来高</dt><dd className="text-right text-slate-200">{volume(point.volume)}</dd>
      </dl>
    </div>
  );
}

export default function StockPriceChart({ item, currentPrice, tradeMarkers, onClose, context = "watchlist" }: Props) {
  const [range, setRange] = useState<StockHistoryRange>("3M");
  const [data, setData] = useState<StockHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const earningsRequestId = useRef(0);
  const [earningsState, setEarningsState] = useState<EarningsState | null>(null);
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

  useEffect(() => {
    const cached = earningsCache.get(ticker);
    if (cached) {
      const timeout = window.setTimeout(() => {
        setEarningsState({ ticker, data: cached, error: "" });
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const currentRequest = ++earningsRequestId.current;
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(`/api/earnings-calendar?ticker=${encodeURIComponent(ticker)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const value: unknown = await response.json();
        if (!response.ok) throw new Error(responseError(value));
        if (!isEarningsCalendarResponse(value)) throw new Error("決算カレンダーの形式が不正です。");
        earningsCache.set(ticker, value);
        if (earningsRequestId.current === currentRequest) {
          setEarningsState({ ticker, data: value, error: "" });
        }
      } catch (caught: unknown) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        if (earningsRequestId.current === currentRequest) {
          setEarningsState({
            ticker,
            data: null,
            error: caught instanceof Error ? caught.message : "決算予定を取得できませんでした。",
          });
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [ticker]);

  const startingPrice = positivePrice(item.startingPrice);
  const targetPrice = positivePrice(item.targetPrice);
  const activeEarnings = earningsState?.ticker === ticker ? earningsState.data : null;
  const earningsError = earningsState?.ticker === ticker ? earningsState.error : "";
  const earningsLoading = earningsState?.ticker !== ticker;
  const latestHistoryDate = data?.points.at(-1)?.date ?? null;
  const earningsRangeEnd = latestHistoryDate
    ? addCalendarDays(latestHistoryDate, RANGE_CALENDAR_DAYS[range])
    : null;
  const visibleEarnings = activeEarnings && latestHistoryDate && earningsRangeEnd
    ? activeEarnings.events.filter(
        (event) => event.reportDate >= latestHistoryDate && event.reportDate <= earningsRangeEnd,
      )
    : [];
  const nextEarnings = activeEarnings?.events[0] ?? null;
  const chartPoints: ChartPoint[] = data?.points.map((point) => ({
    ...point,
    priceRange: [point.low, point.high],
  })) ?? [];
  if (latestHistoryDate && visibleEarnings.length > 0) {
    const lastEventDate = visibleEarnings.at(-1)?.reportDate ?? latestHistoryDate;
    const axisEndDate = addCalendarDays(lastEventDate, 3);
    const chartDates = new Set(chartPoints.map((point) => point.date));
    const futureDates = businessDatesAfter(latestHistoryDate, axisEndDate);
    for (const event of visibleEarnings) futureDates.push(event.reportDate);

    for (const date of Array.from(new Set(futureDates)).sort()) {
      if (chartDates.has(date)) continue;
      chartPoints.push({
        date,
        open: null,
        high: null,
        low: null,
        close: null,
        volume: null,
        priceRange: null,
      });
    }
    chartPoints.sort((left, right) => left.date.localeCompare(right.date));
  }
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
    <section ref={cardRef} id="stock-price-chart" aria-labelledby="chart-title" className="ios-card w-full min-w-0 max-w-full scroll-mt-6 rounded-2xl p-4 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">PRICE HISTORY</p>
          <h2 id="chart-title" className="mt-1 break-words text-xl font-semibold text-white">{ticker} 株価チャート</h2>
        </div>
        {onClose && <button type="button" onClick={onClose} className="min-h-10 border border-slate-700 px-4 text-sm text-slate-300 hover:bg-slate-800">閉じる</button>}
      </div>

      <div className="mt-5 grid w-full min-w-0 grid-cols-3 gap-2 sm:flex sm:w-auto" aria-label="チャート期間">
        {(Object.keys(RANGE_LABELS) as StockHistoryRange[]).map((option) => (
          <button key={option} type="button" onClick={() => changeRange(option)} disabled={loading || range === option} aria-pressed={range === option} className={`min-h-10 min-w-0 px-2 text-sm font-semibold transition disabled:cursor-wait sm:px-4 ${range === option ? "bg-sky-600 text-white" : "border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-60"}`}>
            {RANGE_LABELS[option]}
          </button>
        ))}
      </div>

      <div className="mt-6 w-full min-w-0 max-w-full min-h-[390px] sm:min-h-[470px]" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="flex h-[390px] items-center justify-center text-slate-400 sm:h-[470px]">チャートを読み込み中…</div>
        ) : error ? (
          <div role="alert" className="flex h-[390px] items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-center text-rose-300 sm:h-[470px]">{error}</div>
        ) : !data || data.points.length === 0 ? (
          <div className="flex h-[390px] items-center justify-center text-slate-400 sm:h-[470px]">チャートデータがありません</div>
        ) : (
          <div className="w-full min-w-0 max-w-full">
            <div className="h-[300px] w-full min-w-0 max-w-full sm:h-[370px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart data={chartPoints} margin={{ top: 16, right: 4, left: 0, bottom: 0 }} barCategoryGap="12%">
                  <CartesianGrid stroke="#334155" strokeOpacity={0.35} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis domain={["auto", "auto"]} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value: number) => `$${value.toFixed(0)}`} width={48} />
                  <Tooltip cursor={{ stroke: "#64748b", strokeDasharray: "3 3" }} content={CandlestickTooltip} />
                  {startingPrice !== null && <ReferenceLine y={startingPrice} stroke="#f59e0b" strokeDasharray="5 4" label={{ value: context === "journal" ? "取得単価" : "監視開始", fill: "#fbbf24", fontSize: 11, position: "insideTopRight" }} />}
                  {context === "watchlist" && targetPrice !== null && <ReferenceLine y={targetPrice} stroke="#34d399" strokeDasharray="5 4" label={{ value: "希望価格", fill: "#6ee7b7", fontSize: 11, position: "insideBottomRight" }} />}
                  {currentPrice !== null && <ReferenceLine y={currentPrice} stroke="#a78bfa" strokeDasharray="5 4" label={{ value: "現在価格", fill: "#c4b5fd", fontSize: 11, position: "insideTopLeft" }} />}
                  {visibleEarnings.map((event) => (
                    <ReferenceLine
                      key={`earnings-price-${event.reportDate}`}
                      x={event.reportDate}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{ value: "E 決算", fill: "#fbbf24", fontSize: 11, fontWeight: 700, position: "insideTopLeft" }}
                    />
                  ))}
                  <Bar dataKey="priceRange" name="値幅" shape={CandlestickShape} isAnimationActive={false} />
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
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 h-[90px] w-full min-w-0 max-w-full border-t border-slate-800/80 pt-1 sm:h-[100px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartPoints} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="12%">
                  <CartesianGrid stroke="#334155" strokeOpacity={0.2} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(date: string) => date.slice(5).replace("-", "/")} minTickGap={28} />
                  <YAxis stroke="#64748b" tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={volume} width={48} tickCount={3} />
                  <Tooltip cursor={{ fill: "#334155", fillOpacity: 0.25 }} contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 12, color: "#f8fafc" }} labelFormatter={(label) => `日付：${String(label)}`} formatter={(value) => [volume(Number(value)), "出来高"]} />
                  {visibleEarnings.map((event) => (
                    <ReferenceLine
                      key={`earnings-volume-${event.reportDate}`}
                      x={event.reportDate}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                  ))}
                  <Bar dataKey="volume" name="出来高" isAnimationActive={false}>
                    {chartPoints.map((point) => <Cell key={point.date} fill={point.close === null || point.open === null ? "transparent" : point.close >= point.open ? "#34d399" : "#fb7185"} fillOpacity={0.55} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-2 border border-emerald-400 bg-emerald-950" />上昇</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-2 border border-rose-400 bg-rose-400" />下落</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-emerald-950 bg-emerald-400" />買い・買戻し</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-rose-950 bg-rose-400" />売り・決済</span>
        <span className="inline-flex items-center gap-2"><span className="h-4 border-l-2 border-dashed border-amber-400" />決算</span>
        {tradeMarkers.length === 0 && <span>この銘柄の売買記録はまだありません</span>}
        {tradeMarkers.length > 0 && visibleTradeMarkers.length === 0 && <span>選択期間内に売買記録はありません</span>}
        {earningsLoading && <span>決算予定を確認中…</span>}
        {!earningsLoading && earningsError && <span className="text-amber-300">{earningsError}</span>}
        {!earningsLoading && !earningsError && activeEarnings?.events.length === 0 && <span>次回決算日は未定です</span>}
        {!earningsLoading && !earningsError && nextEarnings && visibleEarnings.length === 0 && (
          <span>次回決算 {nextEarnings.reportDate}（{earningsTiming(nextEarnings.timeOfDay)}）は{RANGE_LABELS[range]}の表示範囲外です</span>
        )}
      </div>

      {visibleEarnings.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="表示中の決算予定">
          {visibleEarnings.map((event) => (
            <span key={`earnings-detail-${event.reportDate}`} className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200">
              {event.reportDate} 決算（{earningsTiming(event.timeOfDay)}）
            </span>
          ))}
        </div>
      )}

      {visibleTradeMarkers.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="表示中の売買記録">
          {visibleTradeMarkers.map((marker) => (
            <span key={`detail-${marker.id}`} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${marker.kind === "buy" ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300" : "border-rose-400/25 bg-rose-500/10 text-rose-300"}`}>
              {marker.date} {marker.label} {price(marker.price)}{marker.quantity !== null ? ` × ${marker.quantity}株` : ""}
            </span>
          ))}
        </div>
      )}

      <dl className={`mt-6 grid gap-3 border-t border-slate-800 pt-5 text-sm ${context === "watchlist" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div><dt className="text-slate-500">{context === "journal" ? "取得単価" : "監視開始価格"}</dt><dd className="mt-1 font-semibold text-slate-100">{price(item.startingPrice)}</dd></div>
        {context === "watchlist" && <div><dt className="text-slate-500">希望購入価格</dt><dd className="mt-1 font-semibold text-slate-100">{price(item.targetPrice)}</dd></div>}
        <div><dt className="text-slate-500">チャート最新終値</dt><dd className="mt-1 font-semibold text-slate-100">{data?.points.at(-1) ? price(data.points.at(-1)?.close ?? null) : price(currentPrice)}</dd></div>
      </dl>
    </section>
  );
}
