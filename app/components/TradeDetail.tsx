import { formatProfitYen, formatYen, parseMoney } from "../lib/currency";
import type { ActiveJournal } from "../types/journal";

type TradeDetailProps = {
  journal: ActiveJournal;
  onBack: () => void;
  onEdit: (journal: ActiveJournal) => void;
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
    <dt className="text-xs font-medium text-slate-500">{label}</dt>
    <dd className="mt-1.5 break-words text-sm font-medium leading-6 text-slate-200">{value}</dd>
  </div>
);

export default function TradeDetail({ journal, onBack, onEdit }: TradeDetailProps) {
  const profit = parseMoney(journal.profit);
  const profitColor =
    profit === null || profit === 0
      ? "text-slate-300"
      : profit > 0
        ? "text-emerald-300"
        : "text-rose-300";

  return (
    <div aria-labelledby="trade-detail-title">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-xl border border-slate-700 bg-slate-900/70 px-3.5 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
        >
          ← 一覧へ戻る
        </button>
        <button
          type="button"
          onClick={() => onEdit(journal)}
          className="min-h-11 rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
        >
          編集
        </button>
      </div>

      <div className="mt-7 border-b border-slate-800 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${journal.category === "株式" ? "border-blue-400/25 bg-blue-500/15 text-blue-300" : "border-violet-400/25 bg-violet-500/15 text-violet-300"}`}>{journal.category}</span>
          <span className="text-sm text-slate-500">{journal.tradeDate}</span>
        </div>
        <h2 id="trade-detail-title" className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{journal.target}</h2>
        <p className={`mt-3 text-xl font-semibold ${profitColor}`}>{formatProfitYen(journal.profit) ?? "損益未入力"}</p>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <DetailItem label="日付" value={journal.tradeDate} />
        <DetailItem label="カテゴリ" value={journal.category} />
        <DetailItem label="対象" value={journal.target} />
        <DetailItem label="売買区分" value={journal.decision || "未選択"} />
        <DetailItem label="投資金額" value={formatYen(journal.amount) ?? "未入力"} />
        <DetailItem label="損益" value={formatProfitYen(journal.profit) ?? "未入力"} />
        <DetailItem label="市場テーマ" value={journal.marketTheme || "未選択"} />
        <DetailItem label="重要イベント" value={journal.majorEvent || "未選択"} />
        <DetailItem label="感情" value={journal.emotion || "未選択"} />
        <DetailItem label="ルール遵守" value={journal.ruleFollowed ? "守った" : "守らなかった"} />
        <DetailItem label="結果" value={journal.result || "未確定"} />
        <div className="sm:col-span-2"><DetailItem label="理由" value={journal.reason || "未入力"} /></div>
        <div className="sm:col-span-2"><DetailItem label="振り返り" value={journal.review || "未入力"} /></div>
      </dl>

      <section aria-labelledby="trade-ai-review-title" className="mt-7 rounded-2xl border border-blue-400/10 bg-slate-950/50 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 font-semibold text-blue-300" aria-hidden="true">AI</span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="trade-ai-review-title" className="text-lg font-semibold text-white">AI Review</h3>
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-500">今後実装</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">このトレードについて<br className="sm:hidden" />AIが分析します。</p>
          </div>
        </div>
      </section>
    </div>
  );
}
