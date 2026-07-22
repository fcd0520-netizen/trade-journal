"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import type {
  WatchlistCurrency,
  WatchlistItem,
  WatchlistStatus,
} from "../types/watchlist";

const STORAGE_KEY = "trade-journal-watchlist";

const emptyForm = (): Omit<WatchlistItem, "id"> => ({
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

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setItems(JSON.parse(saved) as WatchlistItem[]);
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

  const update = <K extends keyof Omit<WatchlistItem, "id">>(
    key: K,
    value: Omit<WatchlistItem, "id">[K],
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
    const { id, ...values } = item;
    setForm(values);
    setEditingId(id);
    setMessage("編集中です。");
    document.getElementById("watchlist-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const remove = (id: number) => {
    if (!window.confirm("この銘柄をWatchlistから削除しますか？")) return;
    setItems((current) => current.filter((item) => item.id !== id));
    if (editingId === id) reset();
    setMessage("Watchlistから削除しました。");
  };

  return (
    <main className="ios-app min-h-screen bg-[#060b16] px-4 py-20 sm:px-6 sm:py-12 lg:pl-[calc(16rem+1.5rem)]">
      <Sidebar />
      <div className="mx-auto max-w-6xl space-y-7 sm:space-y-9">
        <header className="ios-hero overflow-hidden rounded-2xl p-6 sm:p-8">
          <p className="relative z-10 mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">WATCHLIST</p>
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

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div><label htmlFor="ticker">ティッカー</label><input id="ticker" value={form.ticker} onChange={(event) => update("ticker", event.target.value)} placeholder="AAPL" /></div>
            <div><label htmlFor="company-name">銘柄名</label><input id="company-name" value={form.companyName} onChange={(event) => update("companyName", event.target.value)} placeholder="Apple" /></div>
            <div><label htmlFor="currency">通貨</label><select id="currency" value={form.currency} onChange={(event) => update("currency", event.target.value as WatchlistCurrency)}><option value="USD">USD</option><option value="JPY">JPY</option></select></div>
            <div><label htmlFor="starting-price">監視開始価格</label><input id="starting-price" type="number" min="0" step="any" inputMode="decimal" value={form.startingPrice} onChange={(event) => update("startingPrice", event.target.value)} placeholder={form.currency === "USD" ? "180.00" : "2500"} /></div>
            <div><label htmlFor="target-price">希望購入価格</label><input id="target-price" type="number" min="0" step="any" inputMode="decimal" value={form.targetPrice} onChange={(event) => update("targetPrice", event.target.value)} placeholder={form.currency === "USD" ? "165.00" : "2200"} /></div>
            <div><label htmlFor="start-date">監視開始日</label><input id="start-date" type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></div>
            <div><label htmlFor="status">ステータス</label><select id="status" value={form.status} onChange={(event) => update("status", event.target.value as WatchlistStatus)}><option value="監視中">監視中</option><option value="✅ 購入済">✅ 購入済</option><option value="❌ 見送り">❌ 見送り</option></select></div>
            <div className="sm:col-span-2 lg:col-span-3"><label htmlFor="reason">監視理由</label><textarea id="reason" rows={3} value={form.reason} onChange={(event) => update("reason", event.target.value)} placeholder="監視を始めた理由や注目しているポイント" /></div>
            <div className="sm:col-span-2 lg:col-span-3"><button type="button" onClick={save} className="min-h-11 bg-sky-600 px-5 font-semibold text-white hover:bg-sky-500">{editingId === null ? "追加する" : "更新する"}</button></div>
            {message && <p aria-live="polite" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300 sm:col-span-2 lg:col-span-3">{message}</p>}
          </div>
        </section>

        <section className="ios-card rounded-2xl p-5 sm:p-7">
          <h2 className="text-xl font-semibold text-white">一覧</h2>
          <p className="mt-1 text-sm text-slate-500">{items.length}件</p>

          {items.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500">まだWatchlistに銘柄がありません。</p>
          ) : (
            <>
              <div className="mt-5 hidden overflow-x-auto rounded-xl border border-slate-800 lg:block">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">ティッカー</th><th className="px-4 py-3">銘柄名</th><th className="px-4 py-3">監視開始価格</th><th className="px-4 py-3">希望購入価格</th><th className="px-4 py-3">ステータス</th><th className="px-4 py-3">監視開始日</th><th className="px-3 py-3">編集</th><th className="px-3 py-3">削除</th></tr></thead>
                  <tbody>{items.map((item) => <tr key={item.id} className="border-t border-slate-800 text-slate-200"><td className="px-4 py-4 font-semibold text-white">{item.ticker}</td><td className="px-4 py-4">{item.companyName || "未入力"}</td><td className="whitespace-nowrap px-4 py-4">{formatPrice(item.startingPrice, item.currency)}</td><td className="whitespace-nowrap px-4 py-4">{formatPrice(item.targetPrice, item.currency)}</td><td className="px-4 py-4"><span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass[item.status]}`}>{item.status}</span></td><td className="whitespace-nowrap px-4 py-4">{item.startDate || "未入力"}</td><td className="px-3 py-4"><button type="button" onClick={() => edit(item)} className="min-h-10 border border-amber-500/30 bg-amber-500/10 px-4 text-sm font-semibold text-amber-300 hover:bg-amber-500/20">編集</button></td><td className="px-3 py-4"><button type="button" onClick={() => remove(item.id)} className="min-h-10 border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-semibold text-rose-300 hover:bg-rose-500/20">削除</button></td></tr>)}</tbody>
                </table>
              </div>

              <div className="mt-5 space-y-3 lg:hidden">{items.map((item) => <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-white">{item.ticker}</h3><span className="text-sm text-slate-400">{item.companyName || "銘柄名未入力"}</span><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass[item.status]}`}>{item.status}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 text-sm"><div><dt className="text-slate-500">監視開始価格</dt><dd className="mt-1 text-slate-200">{formatPrice(item.startingPrice, item.currency)}</dd></div><div><dt className="text-slate-500">希望購入価格</dt><dd className="mt-1 text-slate-200">{formatPrice(item.targetPrice, item.currency)}</dd></div><div className="col-span-2"><dt className="text-slate-500">監視開始日</dt><dd className="mt-1 text-slate-200">{item.startDate || "未入力"}</dd></div></dl><div className="mt-4 flex gap-2"><button type="button" onClick={() => edit(item)} className="min-h-10 flex-1 border border-amber-500/30 bg-amber-500/10 px-4 text-sm font-semibold text-amber-300">編集</button><button type="button" onClick={() => remove(item.id)} className="min-h-10 flex-1 border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-semibold text-rose-300">削除</button></div></article>)}</div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
