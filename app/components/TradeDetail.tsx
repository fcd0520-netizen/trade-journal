import { useState } from "react";
import { calculateInvestment, formatCurrency, formatProfitCurrency, parseMoney } from "../lib/currency";
import type { ActiveJournal, Settlement } from "../types/journal";

const statusDisplay = {
  holding: { label: "保有中", className: "text-sky-300" },
  partial: { label: "一部決済", className: "text-amber-300" },
  closed: { label: "決済済", className: "text-slate-300" },
} as const;

type TradeDetailProps = {
  journal: ActiveJournal;
  onBack: () => void;
  onEdit: (journal: ActiveJournal) => void;
  onSettlement: (journalId: number, settlement: Settlement) => void;
};

type DetailItemProps = { label: string; value: string; valueClassName?: string };

const DetailItem = ({ label, value, valueClassName = "text-slate-200" }: DetailItemProps) => (
  <div><dt className="text-xs font-medium tracking-wide text-slate-500">{label}</dt><dd className={`mt-1.5 break-words text-sm font-medium leading-6 sm:text-base ${valueClassName}`}>{value}</dd></div>
);

const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5 sm:p-6"><h3 className="text-sm font-semibold tracking-wide text-slate-100 sm:text-base">{title}</h3><dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">{children}</dl></section>
);

const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const profitClass = (value: number) => value > 0 ? "text-emerald-300" : value < 0 ? "text-rose-300" : "text-slate-200";

export default function TradeDetail({ journal, onBack, onEdit, onSettlement }: TradeDetailProps) {
  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [settlementDate, setSettlementDate] = useState(getToday());
  const [quantity, setQuantity] = useState(journal.remainingShares);
  const [settlementPrice, setSettlementPrice] = useState("");
  const [reason, setReason] = useState("");
  const [emotion, setEmotion] = useState("");
  const [review, setReview] = useState("");
  const [error, setError] = useState("");
  const realizedProfit = journal.settlements.reduce((total, item) => total + item.realizedProfit, 0);
  const sortedSettlements = [...journal.settlements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const acquisitionPrice = parseMoney(journal.acquisitionPrice);
  const remainingShares = parseMoney(journal.remainingShares) ?? 0;

  const resetSettlementForm = () => {
    setSettlementDate(getToday()); setQuantity(journal.remainingShares); setSettlementPrice("");
    setReason(""); setEmotion(""); setReview(""); setError("");
  };

  const handleSettlementSave = () => {
    const parsedQuantity = parseMoney(quantity);
    const parsedPrice = parseMoney(settlementPrice);
    if (!settlementDate || !quantity.trim() || !settlementPrice.trim() || !reason.trim() || !emotion.trim() || !review.trim()) {
      setError("すべての必須項目を入力してください。"); return;
    }
    if (parsedQuantity === null || parsedQuantity < 1) { setError("決済数量は1以上で入力してください。"); return; }
    if (parsedQuantity > remainingShares) { setError(`決済数量は残り数量（${journal.remainingShares}）以下で入力してください。`); return; }
    if (parsedPrice === null || parsedPrice <= 0) { setError("決済単価は0より大きい値を入力してください。"); return; }
    if (acquisitionPrice === null || acquisitionPrice <= 0) { setError("取得単価が未入力または不正なため決済できません。Journalを編集してください。"); return; }

    const rawProfit = (journal.decision === "Buy" ? parsedPrice - acquisitionPrice : acquisitionPrice - parsedPrice) * parsedQuantity;
    const roundedProfit = journal.currency === "JPY" ? Math.round(rawProfit) : Math.round((rawProfit + Number.EPSILON) * 100) / 100;
    onSettlement(journal.id, {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      settlementDate, quantity: parsedQuantity, settlementPrice: parsedPrice, realizedProfit: roundedProfit,
      reason: reason.trim(), emotion: emotion.trim(), review: review.trim(), createdAt: new Date().toISOString(),
    });
    resetSettlementForm(); setShowSettlementForm(false);
  };

  return (
    <article aria-labelledby="trade-detail-title">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="min-h-11 rounded-xl border border-slate-700 bg-slate-900/70 px-3.5 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">← 一覧へ戻る</button>
        <button type="button" onClick={() => onEdit(journal)} className="min-h-11 rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/20">編集</button>
      </div>

      <header className="mt-6 border-y border-slate-800 py-6 sm:py-7">
        <p className="text-xs font-medium tracking-wide text-slate-500">ティッカー</p>
        <h2 id="trade-detail-title" className="mt-1.5 break-words text-2xl font-semibold text-white sm:text-3xl">{journal.target}</h2>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium"><span className="text-blue-300">{journal.category}</span><span className="text-slate-200">エントリー方向：{journal.decision}</span></div>
        <p className="mt-4 text-sm text-slate-300">取引日：{journal.tradeDate}</p>
      </header>

      <div className="mt-5 space-y-4">
        <DetailSection title="ポジション状況">
          <DetailItem label="現在のstatus" value={statusDisplay[journal.status].label} valueClassName={statusDisplay[journal.status].className} />
          <DetailItem label="残り数量" value={`${journal.remainingShares || "0"}株`} />
          <DetailItem label="取得単価" value={formatCurrency(journal.acquisitionPrice, journal.currency) ?? "未入力"} />
          <DetailItem label="累計確定損益" value={formatProfitCurrency(realizedProfit, journal.currency) ?? "未入力"} valueClassName={`${profitClass(realizedProfit)} text-lg font-semibold`} />
        </DetailSection>

        {(journal.status === "holding" || journal.status === "partial") && !showSettlementForm && (
          <button type="button" onClick={() => { resetSettlementForm(); setShowSettlementForm(true); }} className="min-h-12 w-full rounded-xl border border-rose-400/30 bg-rose-500/10 px-5 py-3 font-semibold text-rose-300 hover:bg-rose-500/20">決済する</button>
        )}

        {showSettlementForm && (
          <section aria-labelledby="settlement-form-title" className="rounded-2xl border border-rose-400/25 bg-slate-950/70 p-5 sm:p-6">
            <h3 id="settlement-form-title" className="text-lg font-semibold text-white">決済を記録</h3>
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm sm:grid-cols-4">
              <div><dt className="text-slate-500">ティッカー</dt><dd className="mt-1 font-semibold text-slate-100">{journal.target}</dd></div>
              <div><dt className="text-slate-500">方向</dt><dd className="mt-1 text-slate-200">{journal.decision}</dd></div>
              <div><dt className="text-slate-500">取得単価</dt><dd className="mt-1 text-slate-200">{formatCurrency(journal.acquisitionPrice, journal.currency) ?? "未入力"}</dd></div>
              <div><dt className="text-slate-500">残り数量</dt><dd className="mt-1 text-slate-200">{journal.remainingShares}株</dd></div>
            </dl>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="settlement-date">決済日 <span className="text-rose-300">*</span></label><input id="settlement-date" type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} /></div>
              <div><label htmlFor="settlement-quantity">決済数量 <span className="text-rose-300">*</span></label><input id="settlement-quantity" type="number" inputMode="decimal" min="1" max={remainingShares} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
              <div><label htmlFor="settlement-price">決済単価 <span className="text-rose-300">*</span></label><input id="settlement-price" type="number" inputMode="decimal" min="0" step={journal.currency === "JPY" ? "1" : "0.01"} value={settlementPrice} onChange={(e) => setSettlementPrice(e.target.value)} placeholder={journal.currency === "JPY" ? "2500" : "75.50"} /></div>
              <div><label htmlFor="settlement-emotion">決済時の感情 <span className="text-rose-300">*</span></label><input id="settlement-emotion" value={emotion} onChange={(e) => setEmotion(e.target.value)} placeholder="冷静、焦り、安心など" /></div>
              <div className="sm:col-span-2"><label htmlFor="settlement-reason">決済理由 <span className="text-rose-300">*</span></label><textarea id="settlement-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="利確目標到達、損切りなど" /></div>
              <div className="sm:col-span-2"><label htmlFor="settlement-review">振り返り <span className="text-rose-300">*</span></label><textarea id="settlement-review" rows={2} value={review} onChange={(e) => setReview(e.target.value)} placeholder="決済判断の振り返り" /></div>
            </div>
            {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">{error}</p>}
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { resetSettlementForm(); setShowSettlementForm(false); }} className="min-h-11 rounded-xl border border-slate-700 px-5 py-2.5 font-semibold text-slate-300">キャンセル</button>
              <button type="button" onClick={handleSettlementSave} className="min-h-11 rounded-xl bg-rose-600 px-5 py-2.5 font-semibold text-white hover:bg-rose-500">決済を保存</button>
            </div>
          </section>
        )}

        <DetailSection title="取引情報">
          <DetailItem label="理由" value={journal.reason || "未入力"} />
          <DetailItem label="感情" value={journal.emotion || "未選択"} />
          <DetailItem label="株数" value={journal.shareCount ? `${journal.shareCount}株` : "未入力"} />
          <DetailItem label="投資額" value={formatCurrency(calculateInvestment(journal.shareCount, journal.acquisitionPrice), journal.currency) ?? "未入力"} />
          <DetailItem label="市場環境" value={journal.marketEnvironment || "未選択"} />
          <DetailItem label="振り返り" value={journal.review || "未入力"} />
        </DetailSection>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-100">決済履歴</h3>
          {sortedSettlements.length === 0 ? <p className="mt-4 text-sm text-slate-500">決済履歴はありません。</p> : (
            <div className="mt-4 space-y-3">{sortedSettlements.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <DetailItem label="決済日" value={item.settlementDate} /><DetailItem label="決済数量" value={`${item.quantity}株`} />
                  <DetailItem label="決済単価" value={formatCurrency(item.settlementPrice, journal.currency) ?? String(item.settlementPrice)} />
                  <DetailItem label="確定損益" value={formatProfitCurrency(item.realizedProfit, journal.currency) ?? String(item.realizedProfit)} valueClassName={profitClass(item.realizedProfit)} />
                  <DetailItem label="決済理由" value={item.reason || "未入力"} /><DetailItem label="感情" value={item.emotion || "未入力"} />
                  <div className="sm:col-span-2"><DetailItem label="振り返り" value={item.review || "未入力"} /></div>
                </dl>
              </article>
            ))}</div>
          )}
        </section>
      </div>
    </article>
  );
}
