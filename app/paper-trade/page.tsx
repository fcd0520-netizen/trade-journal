"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PaperTrade } from "../types/paper-trade";

const STORAGE_KEY = "paper-trades";

const emptyForm = (): Omit<PaperTrade, "id" | "createdAt"> => ({
  ticker: "",
  companyName: "",
  side: "買い",
  shareCount: "",
  acquisitionPrice: "",
  reason: "",
  emotion: "冷静",
  result: "未確定",
  memo: "",
});

export default function PaperTradePage() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTrades(JSON.parse(saved) as PaperTrade[]);
    } catch {
      setMessage("保存データを読み込めませんでした。");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }, [trades, loaded]);

  const update = <K extends keyof Omit<PaperTrade, "id" | "createdAt">>(key: K, value: Omit<PaperTrade, "id" | "createdAt">[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const reset = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const save = () => {
    if (!form.ticker.trim()) {
      setMessage("ティッカーを入力してください。");
      return;
    }
    const trade: PaperTrade = {
      ...form,
      ticker: form.ticker.trim().toUpperCase(),
      companyName: form.companyName.trim(),
      id: editingId ?? Date.now(),
      createdAt:
        trades.find((item) => item.id === editingId)?.createdAt ??
        new Date().toISOString(),
    };
    setTrades((current) => editingId === null ? [trade, ...current] : current.map((item) => item.id === editingId ? trade : item));
    setMessage(editingId === null ? "Paper Tradeを保存しました。" : "Paper Tradeを更新しました。");
    reset();
  };

  const edit = (trade: PaperTrade) => {
    const { id, createdAt: _createdAt, ...values } = trade;
    void _createdAt;
    setForm(values);
    setEditingId(id);
    setMessage("編集中です。");
    document.getElementById("paper-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const remove = (id: number) => {
    if (!window.confirm("このPaper Tradeを削除しますか？")) return;
    setTrades((current) => current.filter((trade) => trade.id !== id));
    if (editingId === id) reset();
    setMessage("Paper Tradeを削除しました。");
  };

  return (
    <main className="ios-app min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="ios-hero overflow-hidden rounded-2xl p-6 sm:p-8">
          <Link href="/" className="relative z-10 text-sm font-semibold text-blue-200 hover:text-white">← Trade Journalへ戻る</Link>
          <p className="relative z-10 mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">Simulation</p>
          <h1 className="relative z-10 mt-1 text-3xl font-semibold text-white sm:text-4xl">Paper Trade</h1>
          <p className="relative z-10 mt-3 text-sm text-slate-300">実取引とは独立したシミュレーション記録</p>
        </header>

        <section id="paper-form" className="ios-card scroll-mt-6 rounded-2xl p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">{editingId === null ? "新規作成" : "編集"}</h2>
            {editingId !== null && <button type="button" onClick={reset} className="min-h-10 border border-slate-700 px-4 text-sm text-slate-300">キャンセル</button>}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><label>ティッカー</label><input value={form.ticker} onChange={(e) => update("ticker", e.target.value)} placeholder="AAPL" /></div>
            <div><label>銘柄名</label><input value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Apple" /></div>
            <div><label>買い／売り</label><select value={form.side} onChange={(e) => update("side", e.target.value as "買い" | "売り")}><option>買い</option><option>売り</option></select></div>
            <div><label>株数</label><input type="number" min="0" step="any" inputMode="decimal" value={form.shareCount} onChange={(e) => update("shareCount", e.target.value)} /></div>
            <div><label>取得単価</label><input type="number" min="0" step="0.01" inputMode="decimal" value={form.acquisitionPrice} onChange={(e) => update("acquisitionPrice", e.target.value)} /></div>
            <div><label>感情</label><select value={form.emotion} onChange={(e) => update("emotion", e.target.value)}><option>冷静</option><option>様子見</option><option>飛びつき</option><option>不安</option><option>自信あり</option><option>リベンジ</option></select></div>
            <div><label>結果</label><select value={form.result} onChange={(e) => update("result", e.target.value)}><option>未確定</option><option>勝ち</option><option>負け</option><option>引き分け</option></select></div>
            <div className="sm:col-span-2"><label>理由</label><textarea rows={3} value={form.reason} onChange={(e) => update("reason", e.target.value)} /></div>
            <div className="sm:col-span-2"><label>メモ</label><textarea rows={3} value={form.memo} onChange={(e) => update("memo", e.target.value)} /></div>
            <div className="sm:col-span-2"><button type="button" onClick={save} className="min-h-11 bg-sky-600 px-5 font-semibold text-white hover:bg-sky-500">{editingId === null ? "保存" : "更新する"}</button></div>
            {message && <p aria-live="polite" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300 sm:col-span-2">{message}</p>}
          </div>
        </section>

        <section className="ios-card rounded-2xl p-5 sm:p-7">
          <div><h2 className="text-xl font-semibold text-white">一覧</h2><p className="mt-1 text-sm text-slate-500">{trades.length}件</p></div>
          {trades.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500">まだPaper Tradeがありません。</p> : (
            <div className="mt-5 space-y-3">
              {trades.map((trade) => <article key={trade.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${trade.side === "買い" ? "border-emerald-400/25 text-emerald-300" : "border-rose-400/25 text-rose-300"}`}>{trade.side}</span><h3 className="font-semibold text-white">{trade.ticker}</h3><span className="text-sm text-slate-400">{trade.companyName || "銘柄名未入力"}</span><span className="text-xs text-slate-500">{trade.result}</span></div></div>
                  <div className="flex gap-2"><button type="button" onClick={() => edit(trade)} className="min-h-10 border border-amber-500/30 bg-amber-500/10 px-4 text-sm font-semibold text-amber-300">編集</button><button type="button" onClick={() => remove(trade.id)} className="min-h-10 border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-semibold text-rose-300">削除</button></div>
                </div>
                <dl className="mt-4 grid gap-3 border-t border-slate-800 pt-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">株数</dt><dd className="text-slate-200">{trade.shareCount ? `${trade.shareCount}株` : "未入力"}</dd></div><div><dt className="text-slate-500">取得単価</dt><dd className="text-slate-200">{trade.acquisitionPrice || "未入力"}</dd></div><div><dt className="text-slate-500">感情</dt><dd className="text-slate-200">{trade.emotion}</dd></div><div><dt className="text-slate-500">理由</dt><dd className="whitespace-pre-wrap text-slate-200">{trade.reason || "未入力"}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">メモ</dt><dd className="whitespace-pre-wrap text-slate-200">{trade.memo || "未入力"}</dd></div></dl>
              </article>)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
