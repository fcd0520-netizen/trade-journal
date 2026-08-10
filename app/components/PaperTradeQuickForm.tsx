"use client";

import { useState } from "react";
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

export default function PaperTradeQuickForm() {
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const update = <K extends keyof Omit<PaperTrade, "id" | "createdAt">>(
    key: K,
    value: Omit<PaperTrade, "id" | "createdAt">[K],
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

    const trade: PaperTrade = {
      ...form,
      ticker: form.ticker.trim().toUpperCase(),
      companyName: form.companyName.trim(),
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const trades = saved ? (JSON.parse(saved) as PaperTrade[]) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([trade, ...trades]));
      setForm(emptyForm());
      setIsError(false);
      setMessage("Paper Tradeを保存しました。");
    } catch {
      setIsError(true);
      setMessage("保存できませんでした。もう一度お試しください。");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">Paper Tradeを追加</h2>
        <button type="button" onClick={() => { setForm(emptyForm()); setMessage(""); }} className="min-h-11 rounded-xl border border-slate-700 px-3.5 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-100">
          リセット
        </button>
      </div>
      <div className="mt-6 grid min-w-0 grid-cols-2 gap-x-3 gap-y-4 sm:gap-5 [&>div]:min-w-0">
        <div><label htmlFor="quick-paper-ticker">ティッカー</label><input id="quick-paper-ticker" value={form.ticker} onChange={(e) => update("ticker", e.target.value)} placeholder="AAPL" /></div>
        <div><label htmlFor="quick-paper-company">銘柄名</label><input id="quick-paper-company" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Apple" /></div>
        <div><label htmlFor="quick-paper-side">買い／売り</label><select id="quick-paper-side" value={form.side} onChange={(e) => update("side", e.target.value as "買い" | "売り")}><option>買い</option><option>売り</option></select></div>
        <div><label htmlFor="quick-paper-shares">株数</label><input id="quick-paper-shares" type="number" min="0" step="any" inputMode="decimal" value={form.shareCount} onChange={(e) => update("shareCount", e.target.value)} /></div>
        <div><label htmlFor="quick-paper-price">取得単価</label><input id="quick-paper-price" type="number" min="0" step="0.01" inputMode="decimal" value={form.acquisitionPrice} onChange={(e) => update("acquisitionPrice", e.target.value)} /></div>
        <div><label htmlFor="quick-paper-emotion">感情</label><select id="quick-paper-emotion" value={form.emotion} onChange={(e) => update("emotion", e.target.value)}><option>冷静</option><option>様子見</option><option>飛びつき</option><option>不安</option><option>自信あり</option><option>リベンジ</option></select></div>
        <div><label htmlFor="quick-paper-result">結果</label><select id="quick-paper-result" value={form.result} onChange={(e) => update("result", e.target.value)}><option>未確定</option><option>勝ち</option><option>負け</option><option>引き分け</option></select></div>
        <div className="col-span-2"><label htmlFor="quick-paper-reason">理由</label><textarea id="quick-paper-reason" rows={3} value={form.reason} onChange={(e) => update("reason", e.target.value)} /></div>
        <div className="col-span-2"><label htmlFor="quick-paper-memo">メモ</label><textarea id="quick-paper-memo" rows={3} value={form.memo} onChange={(e) => update("memo", e.target.value)} /></div>
        <div className="col-span-2"><button type="button" onClick={save} className="min-h-11 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500">保存</button></div>
        {message && <p role="status" aria-live="polite" className={`col-span-2 rounded-xl border p-3 text-sm ${isError ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"}`}>{message}</p>}
      </div>
    </div>
  );
}
