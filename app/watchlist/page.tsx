"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import StockPriceChart from "./components/StockPriceChart";
import { extractTradeMarkers, type TradeMarker } from "./lib/trade-markers";
import type {
  WatchlistCurrency,
  WatchlistItem,
  WatchlistSignal,
  WatchlistStatus,
  StockQuote,
} from "../types/watchlist";

const STORAGE_KEY = "trade-journal-watchlist";
const JOURNAL_STORAGE_KEY = "trade-journals";

const signalClass: Record<WatchlistSignal, string> = {
  BUY: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  WATCH: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  HIGH: "border-rose-400/30 bg-rose-500/10 text-rose-300",
  "NO SIGNAL": "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

const emptyForm = (): Omit<WatchlistItem, "id" | "createdAt"> => ({
  ticker: "",
  companyName: "",
  currency: "USD",
  startingPrice: "",
  targetPrice: "",
  startDate: "",
  reason: "",
  status: "監視中",
});

const statusClass: Record<WatchlistStatus, string> = {
  監視中: "border-sky-400/25 bg-sky-500/10 text-sky-300",
  "✅ 購入済": "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  "❌ 見送り": "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

function formatPrice(value: string, currency: WatchlistCurrency) {
  if (!value) return "未入力";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;

  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "ja-JP", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(amount);
}

function toPositivePrice(value: string): number | null {
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

function formatPercent(value: number | null) {
  if (value === null) return "計算不可";
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return `${normalized > 0 ? "+" : ""}${normalized.toFixed(2)}%`;
}

function percentClass(value: number | null) {
  if (value === null || Math.abs(value) < 0.005) return "text-slate-400";
  return value > 0 ? "text-emerald-300" : "text-rose-300";
}

function formatCurrentPrice(value: number | null, currency: WatchlistCurrency) {
  return value === null ? "未更新" : formatPrice(String(value), currency);
}

function formatUpdatedAt(value: number | null) {
  if (value === null) return null;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isStockQuote(value: unknown): value is StockQuote {
  if (!isRecord(value)) return false;
  return (
    typeof value.ticker === "string" &&
    typeof value.currentPrice === "number" &&
    value.currentPrice > 0 &&
    ["currentPrice", "change", "changePercent", "high", "low", "open", "previousClose", "updatedAt"].every(
      (key) => typeof value[key] === "number" && Number.isFinite(value[key]),
    )
  );
}

function getErrorMessage(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "株価を取得できませんでした。";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeSavedItems(value: unknown): WatchlistItem[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).map((item, index) => ({
    id: typeof item.id === "number" ? item.id : Date.now() + index,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    ticker: typeof item.ticker === "string" ? item.ticker : "",
    companyName: typeof item.companyName === "string" ? item.companyName : "",
    currency: item.currency === "JPY" ? "JPY" : "USD",
    startingPrice: typeof item.startingPrice === "string" ? item.startingPrice : "",
    targetPrice: typeof item.targetPrice === "string" ? item.targetPrice : "",
    startDate: typeof item.startDate === "string" ? item.startDate : "",
    reason: typeof item.reason === "string" ? item.reason : "",
    status:
      item.status === "✅ 購入済" || item.status === "❌ 見送り"
        ? item.status
        : "監視中",
  }));
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [quoteErrors, setQuoteErrors] = useState<Record<string, string>>({});
  const [updatingTickers, setUpdatingTickers] = useState<ReadonlySet<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [selectedChartId, setSelectedChartId] = useState<number | null>(null);
  const [tradeMarkersByTicker, setTradeMarkersByTicker] = useState<Record<string, TradeMarker[]>>({});

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setItems(normalizeSavedItems(JSON.parse(saved) as unknown));
        const savedJournals = localStorage.getItem(JOURNAL_STORAGE_KEY);
        if (savedJournals) {
          const parsedJournals: unknown = JSON.parse(savedJournals);
          const journalTickers = Array.isArray(parsedJournals)
            ? Array.from(new Set(parsedJournals.flatMap((entry) => isRecord(entry) && typeof entry.target === "string" ? [entry.target.trim().toUpperCase()] : [])))
            : [];
          setTradeMarkersByTicker(Object.fromEntries(journalTickers.map((ticker) => [ticker, extractTradeMarkers(parsedJournals, ticker)])));
        }
      } catch {
        setMessage("保存データを読み込めませんでした。");
      }
      setLoaded(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      const timeout = window.setTimeout(() => setMessage("保存データを書き込めませんでした。"), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [items, loaded]);

  const update = <K extends keyof Omit<WatchlistItem, "id" | "createdAt">>(
    key: K,
    value: Omit<WatchlistItem, "id" | "createdAt">[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const reset = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const save = () => {
    if (!form.ticker.trim()) {
      setMessage("ティッカーを入力してください。");
      return;
    }

    const item: WatchlistItem = {
      ...form,
      id: editingId ?? Date.now(),
      createdAt:
        items.find((entry) => entry.id === editingId)?.createdAt ??
        new Date().toISOString(),
      ticker: form.ticker.trim().toUpperCase(),
      companyName: form.companyName.trim(),
      reason: form.reason.trim(),
    };

    setItems((current) =>
      editingId === null
        ? [item, ...current]
        : current.map((entry) => (entry.id === editingId ? item : entry)),
    );
    setMessage(editingId === null ? "Watchlistに追加しました。" : "Watchlistを更新しました。");
    reset();
  };

  const edit = (item: WatchlistItem) => {
    const { id, createdAt: _createdAt, ...values } = item;
    void _createdAt;
    setForm(values);
    setEditingId(id);
    setMessage("編集中です。");
    document.getElementById("watchlist-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const remove = (id: number) => {
    if (!window.confirm("この銘柄をWatchlistから削除しますか？")) return;
    setItems((current) => current.filter((item) => item.id !== id));
    if (editingId === id) reset();
    if (selectedChartId === id) setSelectedChartId(null);
    setMessage("Watchlistから削除しました。");
  };

  const updateQuotes = async () => {
    if (isUpdating || items.length === 0) return;

    const tickers = Array.from(
      new Set(
        items
          .filter((item) => item.currency === "USD")
          .map((item) => item.ticker.trim().toUpperCase())
          .filter(Boolean),
      ),
    );
    if (tickers.length === 0) return;

    setIsUpdating(true);
    setUpdatingTickers(new Set(tickers));
    setQuoteErrors((current) => {
      const next = { ...current };
      tickers.forEach((ticker) => delete next[ticker]);
      return next;
    });

    const fetchQuote = async (ticker: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/stock-quote?ticker=${encodeURIComponent(ticker)}`, {
          cache: "no-store",
        });
        const data: unknown = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(data));
        if (!isStockQuote(data)) throw new Error("株価データの形式が不正です。");
        setQuotes((current) => ({ ...current, [ticker]: data }));
        return true;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "株価を取得できませんでした。";
        setQuoteErrors((current) => ({ ...current, [ticker]: errorMessage }));
        return false;
      } finally {
        setUpdatingTickers((current) => {
          const next = new Set(current);
          next.delete(ticker);
          return next;
        });
      }
    };

    try {
      const concurrency = 3;
      let successfulUpdates = 0;
      for (let index = 0; index < tickers.length; index += concurrency) {
        const results = await Promise.all(tickers.slice(index, index + concurrency).map(fetchQuote));
        successfulUpdates += results.filter(Boolean).length;
      }
      if (successfulUpdates > 0) setLastUpdatedAt(Date.now());
    } finally {
      setIsUpdating(false);
      setUpdatingTickers(new Set());
    }
  };

  const getQuoteDisplay = (item: WatchlistItem) => {
    const ticker = item.ticker.trim().toUpperCase();
    if (item.currency === "JPY") {
      return { currentPrice: null, priceLabel: "未対応", detail: "日本株は未対応です。" };
    }
    if (updatingTickers.has(ticker)) {
      return { currentPrice: null, priceLabel: "取得中…", detail: null };
    }
    if (quoteErrors[ticker]) {
      return { currentPrice: null, priceLabel: "取得失敗", detail: quoteErrors[ticker] };
    }
    const quote = quotes[ticker];
    return {
      currentPrice: quote?.currentPrice ?? null,
      priceLabel: formatCurrentPrice(quote?.currentPrice ?? null, item.currency),
      detail: quote ? `更新：${formatUpdatedAt(quote.updatedAt * 1000)}` : null,
    };
  };

  const selectedChartItem = items.find((item) => item.id === selectedChartId) ?? null;
  const selectedChartPrice = selectedChartItem
    ? quotes[selectedChartItem.ticker.trim().toUpperCase()]?.currentPrice ?? null
    : null;

  return (
    <main className="ios-app min-h-screen w-full min-w-0 max-w-full bg-[#060b16] px-4 py-20 sm:px-6 sm:py-12 lg:pl-[calc(16rem+1.5rem)]">
      <Sidebar />
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-7 sm:space-y-9">
        <header className="ios-hero overflow-hidden rounded-2xl p-6 sm:p-8">
          <Link
            href="/"
            className="relative z-10 inline-flex min-h-11 items-center text-sm font-semibold text-blue-200 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/70"
          >
            ← Dashboardへ戻る
          </Link>
          <p className="relative z-10 mb-2 mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">WATCHLIST</p>
          <h1 className="relative z-10 mt-1 text-3xl font-semibold text-white sm:text-4xl">Watchlist</h1>
          <p className="relative z-10 mt-3 text-sm text-slate-300">投資候補を管理し、<br />購入タイミングを記録する</p>
        </header>

        <section id="watchlist-form" className="ios-card scroll-mt-6 rounded-2xl p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">{editingId === null ? "新規作成" : "編集"}</h2>
            {editingId !== null && (
              <button type="button" onClick={reset} className="min-h-10 border border-slate-700 px-4 text-sm text-slate-300 hover:bg-slate-800">
                キャンセル
              </button>
            )}
          </div>

          <div className="mt-6 grid min-w-0 grid-cols-2 gap-x-3 gap-y-4 sm:gap-5 lg:grid-cols-3 [&>div]:min-w-0">
            <div><label htmlFor="ticker">ティッカー</label><input id="ticker" value={form.ticker} onChange={(event) => update("ticker", event.target.value)} placeholder="AAPL" /></div>
            <div><label htmlFor="company-name">銘柄名</label><input id="company-name" value={form.companyName} onChange={(event) => update("companyName", event.target.value)} placeholder="Apple" /></div>
            <div><label htmlFor="currency">通貨</label><select id="currency" value={form.currency} onChange={(event) => update("currency", event.target.value as WatchlistCurrency)}><option value="USD">USD</option><option value="JPY">JPY</option></select></div>
            <div><label htmlFor="starting-price">監視開始価格</label><input id="starting-price" type="number" min="0" step="any" inputMode="decimal" value={form.startingPrice} onChange={(event) => update("startingPrice", event.target.value)} placeholder={form.currency === "USD" ? "180.00" : "2500"} /></div>
            <div><label htmlFor="target-price">希望購入価格</label><input id="target-price" type="number" min="0" step="any" inputMode="decimal" value={form.targetPrice} onChange={(event) => update("targetPrice", event.target.value)} placeholder={form.currency === "USD" ? "165.00" : "2200"} /></div>
            <div><label htmlFor="start-date">監視開始日</label><input id="start-date" type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></div>
            <div><label htmlFor="status">ステータス</label><select id="status" value={form.status} onChange={(event) => update("status", event.target.value as WatchlistStatus)}><option value="監視中">監視中</option><option value="✅ 購入済">✅ 購入済</option><option value="❌ 見送り">❌ 見送り</option></select></div>
            <div className="col-span-2 lg:col-span-3"><label htmlFor="reason">監視理由</label><textarea id="reason" rows={3} value={form.reason} onChange={(event) => update("reason", event.target.value)} placeholder="監視を始めた理由や注目しているポイント" /></div>
            <div className="col-span-2 lg:col-span-3"><button type="button" onClick={save} className="min-h-11 bg-sky-600 px-5 font-semibold text-white hover:bg-sky-500">{editingId === null ? "追加する" : "更新する"}</button></div>
            {message && <p aria-live="polite" className="col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300 lg:col-span-3">{message}</p>}
          </div>
        </section>

        <section className="ios-card rounded-2xl p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">一覧</h2>
              <p className="mt-1 text-sm text-slate-500">{items.length}件</p>
              {lastUpdatedAt !== null && (
                <p className="mt-1 text-xs text-slate-400">最終更新：{formatUpdatedAt(lastUpdatedAt)}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void updateQuotes()}
              disabled={isUpdating || items.length === 0}
              className="min-h-11 bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {isUpdating ? "更新中…" : "株価を更新"}
            </button>
          </div>

          {items.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500">まだWatchlistに銘柄がありません。</p>
          ) : (
            <>
              <div className="mt-5 hidden overflow-x-auto rounded-xl border border-slate-800 lg:block">
                <table className="w-full min-w-[1480px] text-left text-sm">
                  <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">ティッカー</th><th className="px-4 py-3">銘柄名</th><th className="px-4 py-3">監視開始価格</th><th className="px-4 py-3">希望購入価格</th><th className="px-4 py-3">現在価格</th><th className="px-4 py-3">監視開始比</th><th className="px-4 py-3">希望価格との差</th><th className="px-4 py-3">シグナル</th><th className="px-4 py-3">ステータス</th><th className="px-4 py-3">監視開始日</th><th className="px-3 py-3">チャート</th><th className="px-3 py-3">編集</th><th className="px-3 py-3">削除</th></tr></thead>
                  <tbody>{items.map((item) => {
                    const { currentPrice, priceLabel, detail } = getQuoteDisplay(item);
                    const changePercent = calculateChangePercent(currentPrice, item.startingPrice);
                    const targetDifference = calculateTargetDifference(currentPrice, item.targetPrice);
                    const signal = getSignal(currentPrice, item.targetPrice);
                    return <tr key={item.id} className="border-t border-slate-800 text-slate-200"><td className="px-4 py-4 font-semibold text-white">{item.ticker}</td><td className="px-4 py-4">{item.companyName || "未入力"}</td><td className="whitespace-nowrap px-4 py-4">{formatPrice(item.startingPrice, item.currency)}</td><td className="whitespace-nowrap px-4 py-4">{formatPrice(item.targetPrice, item.currency)}</td><td className="px-4 py-4"><span className="whitespace-nowrap font-semibold text-white">{priceLabel}</span>{detail && <span className={`mt-1 block max-w-52 text-xs ${quoteErrors[item.ticker.trim().toUpperCase()] ? "text-rose-300" : "text-slate-500"}`}>{detail}</span>}</td><td className={`whitespace-nowrap px-4 py-4 font-semibold ${percentClass(changePercent)}`}>{formatPercent(changePercent)}</td><td className={`whitespace-nowrap px-4 py-4 font-semibold ${percentClass(targetDifference)}`}>{formatPercent(targetDifference)}</td><td className="px-4 py-4"><span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${signalClass[signal]}`}>{signal}</span></td><td className="px-4 py-4"><span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass[item.status]}`}>{item.status}</span></td><td className="whitespace-nowrap px-4 py-4">{item.startDate || "未入力"}</td><td className="px-3 py-4"><button type="button" onClick={() => setSelectedChartId(item.id)} disabled={item.currency !== "USD" || selectedChartId === item.id} className="min-h-10 border border-sky-500/30 bg-sky-500/10 px-4 text-sm font-semibold text-sky-300 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50">チャート</button></td><td className="px-3 py-4"><button type="button" onClick={() => edit(item)} className="min-h-10 border border-amber-500/30 bg-amber-500/10 px-4 text-sm font-semibold text-amber-300 hover:bg-amber-500/20">編集</button></td><td className="px-3 py-4"><button type="button" onClick={() => remove(item.id)} className="min-h-10 border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-semibold text-rose-300 hover:bg-rose-500/20">削除</button></td></tr>;
                  })}</tbody>
                </table>
              </div>

              <div className="mt-5 space-y-3 lg:hidden">{items.map((item) => {
                const { currentPrice, priceLabel, detail } = getQuoteDisplay(item);
                const changePercent = calculateChangePercent(currentPrice, item.startingPrice);
                const targetDifference = calculateTargetDifference(currentPrice, item.targetPrice);
                const signal = getSignal(currentPrice, item.targetPrice);
                return <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-white">{item.ticker}</h3><span className="text-sm text-slate-400">{item.companyName || "銘柄名未入力"}</span><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass[item.status]}`}>{item.status}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 text-sm"><div><dt className="text-slate-500">監視開始価格</dt><dd className="mt-1 text-slate-200">{formatPrice(item.startingPrice, item.currency)}</dd></div><div><dt className="text-slate-500">希望購入価格</dt><dd className="mt-1 text-slate-200">{formatPrice(item.targetPrice, item.currency)}</dd></div><div><dt className="text-slate-500">現在価格</dt><dd className="mt-1 font-semibold text-white">{priceLabel}</dd>{detail && <dd className={`mt-1 text-xs ${quoteErrors[item.ticker.trim().toUpperCase()] ? "text-rose-300" : "text-slate-500"}`}>{detail}</dd>}</div><div><dt className="text-slate-500">シグナル</dt><dd className="mt-1"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${signalClass[signal]}`}>{signal}</span></dd></div><div><dt className="text-slate-500">監視開始比</dt><dd className={`mt-1 font-semibold ${percentClass(changePercent)}`}>{formatPercent(changePercent)}</dd></div><div><dt className="text-slate-500">希望価格との差</dt><dd className={`mt-1 font-semibold ${percentClass(targetDifference)}`}>{formatPercent(targetDifference)}</dd></div><div className="col-span-2"><dt className="text-slate-500">監視開始日</dt><dd className="mt-1 text-slate-200">{item.startDate || "未入力"}</dd></div></dl><div className="mt-4 grid grid-cols-3 gap-2"><button type="button" onClick={() => setSelectedChartId(item.id)} disabled={item.currency !== "USD" || selectedChartId === item.id} className="min-h-10 border border-sky-500/30 bg-sky-500/10 px-2 text-sm font-semibold text-sky-300 disabled:cursor-not-allowed disabled:opacity-50">チャート</button><button type="button" onClick={() => edit(item)} className="min-h-10 border border-amber-500/30 bg-amber-500/10 px-2 text-sm font-semibold text-amber-300">編集</button><button type="button" onClick={() => remove(item.id)} className="min-h-10 border border-rose-500/30 bg-rose-500/10 px-2 text-sm font-semibold text-rose-300">削除</button></div></article>;
              })}</div>
            </>
          )}
        </section>
        {selectedChartItem && (
          <StockPriceChart
            key={selectedChartItem.id}
            item={selectedChartItem}
            currentPrice={selectedChartPrice}
            tradeMarkers={tradeMarkersByTicker[selectedChartItem.ticker.trim().toUpperCase()] ?? []}
            onClose={() => setSelectedChartId(null)}
          />
        )}
      </div>
    </main>
  );
}
