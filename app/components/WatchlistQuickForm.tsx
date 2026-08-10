"use client";

import { useState } from "react";
import type {
  WatchlistCurrency,
  WatchlistItem,
  WatchlistStatus,
} from "../types/watchlist";

const STORAGE_KEY = "trade-journal-watchlist";

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

export default function WatchlistQuickForm() {
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const update = <K extends keyof Omit<WatchlistItem, "id" | "createdAt">>(
    key: K,
    value: Omit<WatchlistItem, "id" | "createdAt">[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("");
  };

  const save = () => {
    if (!form.ticker.trim()) {
      setIsError(true);
      setMessage("ティッカーを入力してください。");
      return;
    }

    const item: WatchlistItem = {
      ...form,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ticker: form.ticker.trim().toUpperCase(),
      companyName: form.companyName.trim(),
      reason: form.reason.trim(),
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const items = saved ? (JSON.parse(saved) as WatchlistItem[]) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...items]));
      setForm(emptyForm());
      setIsError(false);
      setMessage("Watchlistに追加しました。");
    } catch {
      setIsError(true);
      setMessage("保存できませんでした。もう一度お試しください。");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">Watchlistに追加</h2>
        <button type="button" onClick={() => { setForm(emptyForm()); setMessage(""); }} className="min-h-11 rounded-xl border border-slate-700 px-3.5 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-100">
          リセット
        </button>
      </div>
      <div className="mt-6 grid min-w-0 grid-cols-2 gap-x-3 gap-y-4 sm:gap-5 lg:grid-cols-3 [&>div]:min-w-0">
        <div><label htmlFor="quick-watch-ticker">ティッカー</label><input id="quick-watch-ticker" value={form.ticker} onChange={(e) => update("ticker", e.target.value)} placeholder="AAPL" /></div>
        <div><label htmlFor="quick-watch-company">銘柄名</label><input id="quick-watch-company" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Apple" /></div>
        <div><label htmlFor="quick-watch-currency">通貨</label><select id="quick-watch-currency" value={form.currency} onChange={(e) => update("currency", e.target.value as WatchlistCurrency)}><option value="USD">USD</option><option value="JPY">JPY</option></select></div>
        <div><label htmlFor="quick-watch-start-price">監視開始価格</label><input id="quick-watch-start-price" type="number" min="0" step="any" inputMode="decimal" value={form.startingPrice} onChange={(e) => update("startingPrice", e.target.value)} placeholder={form.currency === "USD" ? "180.00" : "2500"} /></div>
        <div><label htmlFor="quick-watch-target-price">希望購入価格</label><input id="quick-watch-target-price" type="number" min="0" step="any" inputMode="decimal" value={form.targetPrice} onChange={(e) => update("targetPrice", e.target.value)} placeholder={form.currency === "USD" ? "165.00" : "2200"} /></div>
        <div><label htmlFor="quick-watch-date">監視開始日</label><input id="quick-watch-date" type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} /></div>
        <div><label htmlFor="quick-watch-status">ステータス</label><select id="quick-watch-status" value={form.status} onChange={(e) => update("status", e.target.value as WatchlistStatus)}><option value="監視中">監視中</option><option value="✅ 購入済">✅ 購入済</option><option value="❌ 見送り">❌ 見送り</option></select></div>
        <div className="col-span-2 lg:col-span-3"><label htmlFor="quick-watch-reason">監視理由</label><textarea id="quick-watch-reason" rows={3} value={form.reason} onChange={(e) => update("reason", e.target.value)} placeholder="監視を始めた理由や注目しているポイント" /></div>
        <div className="col-span-2 lg:col-span-3"><button type="button" onClick={save} className="min-h-11 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500">追加する</button></div>
        {message && <p role="status" aria-live="polite" className={`col-span-2 rounded-xl border p-3 text-sm lg:col-span-3 ${isError ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"}`}>{message}</p>}
      </div>
    </div>
  );
}
