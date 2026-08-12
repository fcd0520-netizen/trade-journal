"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  calculateTargetDifference,
  getSignal,
  toPositivePrice,
} from "../lib/watchlist-pricing";
import { getRecordHref, type RecordSource } from "../lib/record-links";
import type { ActiveJournal } from "../types/journal";
import type { WatchlistItem } from "../types/watchlist";

type DashboardTodayProps = {
  journals: ActiveJournal[];
  watchlistItems: WatchlistItem[];
};

type TodayItemType = "earnings" | "target" | "position";

type TodayItem = {
  id: string;
  source: RecordSource;
  recordId: number;
  type: TodayItemType;
  ticker: string;
  detail: string;
};

type TodayLoadState = "loading" | "ready";

type EarningsSummary = {
  ticker: string;
  events: { symbol: string; reportDate: string }[];
};

type QuoteSummary = {
  ticker: string;
  currentPrice: number;
};

const EARNINGS_WINDOW_DAYS = 14;
const MAX_TODAY_ITEMS = 6;
const TICKER_PATTERN = /^[A-Z0-9.-]+$/;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const normalizeTicker = (value: string) => value.trim().toUpperCase();

const getDaysUntil = (reportDate: string, now = new Date()): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(reportDate);
  if (!match) return null;

  const [, year, month, day] = match;
  const reportTime = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const todayTime = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((reportTime - todayTime) / DAY_IN_MILLISECONDS);
};

const isEarningsEvent = (
  value: unknown,
): value is EarningsSummary["events"][number] => {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Record<string, unknown>;
  return typeof event.symbol === "string" && typeof event.reportDate === "string";
};

const isEarningsCalendarResponse = (value: unknown): value is EarningsSummary => {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.ticker === "string" &&
    Array.isArray(result.events) &&
    result.events.every(isEarningsEvent)
  );
};

const isStockQuote = (value: unknown): value is QuoteSummary => {
  if (typeof value !== "object" || value === null) return false;
  const quote = value as Record<string, unknown>;
  return (
    typeof quote.ticker === "string" &&
    typeof quote.currentPrice === "number" &&
    Number.isFinite(quote.currentPrice) &&
    quote.currentPrice > 0
  );
};

const fetchEarnings = async (ticker: string, signal: AbortSignal) => {
  try {
    const response = await fetch(
      `/api/earnings-calendar?ticker=${encodeURIComponent(ticker)}`,
      { signal },
    );
    if (!response.ok) return null;
    const value: unknown = await response.json();
    return isEarningsCalendarResponse(value) ? value : null;
  } catch {
    return null;
  }
};

const fetchQuote = async (ticker: string, signal: AbortSignal) => {
  try {
    const response = await fetch(
      `/api/stock-quote?ticker=${encodeURIComponent(ticker)}`,
      { signal },
    );
    if (!response.ok) return null;
    const value: unknown = await response.json();
    return isStockQuote(value) ? value : null;
  } catch {
    return null;
  }
};

const formatEarningsDetail = (daysUntil: number) =>
  daysUntil === 0 ? "本日決算" : `決算まで${daysUntil}日`;

const formatTargetDetail = (difference: number) =>
  difference <= 0
    ? "希望価格に到達"
    : `希望価格まで+${difference.toFixed(1)}%`;

const prioritizeTodayItems = (...groups: TodayItem[][]) => {
  const seenTickers = new Set<string>();
  const result: TodayItem[] = [];

  for (const item of groups.flat()) {
    if (seenTickers.has(item.ticker)) continue;
    seenTickers.add(item.ticker);
    result.push(item);
    if (result.length === MAX_TODAY_ITEMS) break;
  }

  return result;
};

const todayItemMeta: Record<
  TodayItemType,
  { label: string; className: string; detailClassName: string }
> = {
  earnings: {
    label: "決算",
    className: "border-amber-400/25 bg-amber-500/10 text-amber-200",
    detailClassName: "text-amber-200",
  },
  target: {
    label: "価格",
    className: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
    detailClassName: "text-emerald-200",
  },
  position: {
    label: "保有",
    className: "border-sky-400/25 bg-sky-500/10 text-sky-200",
    detailClassName: "text-sky-200",
  },
};

export default function DashboardToday({ journals, watchlistItems }: DashboardTodayProps) {
  const [todayItems, setTodayItems] = useState<TodayItem[]>([]);
  const [loadState, setLoadState] = useState<TodayLoadState>("loading");
  const [hasPartialFailure, setHasPartialFailure] = useState(false);

  useEffect(() => {
    const activeJournals = journals.filter(
      (journal) =>
        journal.category === "株式" &&
        (journal.status === "holding" || journal.status === "partial") &&
        normalizeTicker(journal.target),
    );
    const activeWatchlistItems = watchlistItems.filter(
      (item) => item.status !== "❌ 見送り",
    );
    const sortedActiveJournals = [...activeJournals].sort(
      (left, right) =>
        right.tradeDate.localeCompare(left.tradeDate) || right.id - left.id,
    );
    const positionItems = sortedActiveJournals
      .map<TodayItem>((journal) => ({
        id: `position-${journal.id}`,
        source: "journal",
        recordId: journal.id,
        type: "position",
        ticker: normalizeTicker(journal.target),
        detail: journal.status === "partial" ? "一部決済・保有中" : "保有中",
      }));
    const earningsRecordByTicker = new Map<
      string,
      Pick<TodayItem, "source" | "recordId">
    >();
    for (const journal of sortedActiveJournals) {
      const ticker = normalizeTicker(journal.target);
      if (!earningsRecordByTicker.has(ticker)) {
        earningsRecordByTicker.set(ticker, {
          source: "journal",
          recordId: journal.id,
        });
      }
    }
    for (const item of [...activeWatchlistItems].sort(
      (left, right) => right.id - left.id,
    )) {
      const ticker = normalizeTicker(item.ticker);
      if (!earningsRecordByTicker.has(ticker)) {
        earningsRecordByTicker.set(ticker, {
          source: "watchlist",
          recordId: item.id,
        });
      }
    }
    const earningsTickers = Array.from(
      new Set([
        ...activeJournals.map((journal) => normalizeTicker(journal.target)),
        ...activeWatchlistItems.map((item) => normalizeTicker(item.ticker)),
      ]),
    ).filter((ticker) => TICKER_PATTERN.test(ticker));
    const targetCandidates = activeWatchlistItems.filter(
      (item) =>
        item.status === "監視中" &&
        item.currency === "USD" &&
        TICKER_PATTERN.test(normalizeTicker(item.ticker)) &&
        toPositivePrice(item.targetPrice) !== null,
    );
    const quoteTickers = Array.from(
      new Set(targetCandidates.map((item) => normalizeTicker(item.ticker))),
    );

    if (earningsTickers.length === 0 && quoteTickers.length === 0) {
      const frame = window.requestAnimationFrame(() => {
        setTodayItems(prioritizeTodayItems([], [], positionItems));
        setHasPartialFailure(false);
        setLoadState("ready");
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const controller = new AbortController();
    const loadingFrame = window.requestAnimationFrame(() => {
      setHasPartialFailure(false);
      setLoadState("loading");
    });

    const loadTodayItems = async () => {
      const [earningsResults, quoteResults] = await Promise.all([
        Promise.all(
          earningsTickers.map((ticker) => fetchEarnings(ticker, controller.signal)),
        ),
        Promise.all(
          quoteTickers.map((ticker) => fetchQuote(ticker, controller.signal)),
        ),
      ]);

      if (controller.signal.aborted) return;

      const earningsItems = earningsResults
        .flatMap((result): (TodayItem & { daysUntil: number })[] => {
          if (!result) return [];
          const ticker = normalizeTicker(result.ticker);
          const record = earningsRecordByTicker.get(ticker);
          if (!record) return [];
          const nextEvent = result.events
            .map((event) => ({ event, daysUntil: getDaysUntil(event.reportDate) }))
            .filter(
              (entry): entry is {
                event: EarningsSummary["events"][number];
                daysUntil: number;
              } =>
                entry.daysUntil !== null &&
                entry.daysUntil >= 0 &&
                entry.daysUntil <= EARNINGS_WINDOW_DAYS,
            )
            .sort((left, right) => left.daysUntil - right.daysUntil)
            .at(0);

          return nextEvent
            ? [{
                id: `earnings-${result.ticker}`,
                source: record.source,
                recordId: record.recordId,
                type: "earnings",
                ticker,
                detail: formatEarningsDetail(nextEvent.daysUntil),
                daysUntil: nextEvent.daysUntil,
              }]
            : [];
        })
        .sort(
          (left, right) =>
            left.daysUntil - right.daysUntil || left.ticker.localeCompare(right.ticker),
        )
        .map<TodayItem>((item) => ({
          id: item.id,
          source: item.source,
          recordId: item.recordId,
          type: item.type,
          ticker: item.ticker,
          detail: item.detail,
        }));

      const quoteByTicker = new Map(
        quoteResults.flatMap((quote) =>
          quote ? [[normalizeTicker(quote.ticker), quote] as const] : [],
        ),
      );
      const targetItems = targetCandidates
        .flatMap((item): (TodayItem & { distance: number })[] => {
          const ticker = normalizeTicker(item.ticker);
          const currentPrice = quoteByTicker.get(ticker)?.currentPrice ?? null;
          const difference = calculateTargetDifference(currentPrice, item.targetPrice);
          const signal = getSignal(currentPrice, item.targetPrice);
          if (difference === null || (signal !== "BUY" && signal !== "WATCH")) return [];

          return [{
            id: `target-${item.id}`,
            source: "watchlist",
            recordId: item.id,
            type: "target",
            ticker,
            detail: formatTargetDetail(difference),
            distance: Math.abs(difference),
          }];
        })
        .sort(
          (left, right) =>
            left.distance - right.distance || left.ticker.localeCompare(right.ticker),
        )
        .map<TodayItem>((item) => ({
          id: item.id,
          source: item.source,
          recordId: item.recordId,
          type: item.type,
          ticker: item.ticker,
          detail: item.detail,
        }));

      window.cancelAnimationFrame(loadingFrame);
      setTodayItems(prioritizeTodayItems(earningsItems, targetItems, positionItems));
      setHasPartialFailure(
        earningsResults.some((result) => result === null) ||
          quoteResults.some((result) => result === null),
      );
      setLoadState("ready");
    };

    void loadTodayItems();
    return () => {
      window.cancelAnimationFrame(loadingFrame);
      controller.abort();
    };
  }, [journals, watchlistItems]);

  return (
    <section aria-labelledby="today-title" className="ios-card overflow-hidden rounded-2xl border-blue-400/20 bg-gradient-to-br from-blue-950/70 via-slate-900/95 to-slate-950/95 p-5 sm:p-6">
      <div className="flex min-w-0 items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Today</p>
          <h3 id="today-title" className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
            今日、確認したい銘柄
          </h3>
        </div>
        <p className="shrink-0 text-[11px] text-slate-500 sm:text-xs">優先度順・最大6件</p>
      </div>

      {loadState === "loading" ? (
        <p className="mt-5 rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-5 text-center text-sm text-slate-400" aria-live="polite">
          決算日と現在価格を確認中…
        </p>
      ) : todayItems.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950/30 px-4 py-6 text-center text-sm leading-6 text-slate-400">
          今日は特に確認が必要な銘柄はありません
        </p>
      ) : (
        <ul className="mt-5 min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/45">
          {todayItems.map((item) => {
            const meta = todayItemMeta[item.type];
            return (
              <li key={item.id} className="border-b border-slate-800 last:border-b-0">
                <Link
                  href={getRecordHref(item.source, item.recordId)}
                  aria-label={`${item.ticker}の記録を開く：${item.detail}`}
                  className="flex min-h-12 min-w-0 items-center gap-2.5 px-3 py-2.5 transition hover:bg-slate-800/55 focus:outline-none focus-visible:bg-slate-800/55 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:gap-3 sm:px-4"
                >
                  <span className={`inline-flex shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold ${meta.className}`}>
                    {meta.label}
                  </span>
                  <span className="min-w-0 shrink truncate text-sm font-semibold tracking-wide text-white">
                    {item.ticker}
                  </span>
                  <span
                    title={item.detail}
                    className={`min-w-0 flex-1 truncate text-right text-xs font-medium sm:text-sm ${meta.detailClassName}`}
                  >
                    {item.detail}
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-lg leading-none text-slate-600">
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {loadState === "ready" && hasPartialFailure && (
        <p className="mt-2 text-right text-[11px] text-amber-300/80" aria-live="polite">
          一部の株価・決算情報を取得できませんでした
        </p>
      )}
    </section>
  );
}
