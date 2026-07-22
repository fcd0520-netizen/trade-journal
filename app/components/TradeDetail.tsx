import { calculateInvestment, formatCurrency, formatProfitYen, formatYen, parseMoney } from "../lib/currency";
import type { ActiveJournal } from "../types/journal";

type TradeDetailProps = {
  journal: ActiveJournal;
  onBack: () => void;
  onEdit: (journal: ActiveJournal) => void;
};

type DetailItemProps = {
  label: string;
  value: string;
  valueClassName?: string;
};

const DetailItem = ({ label, value, valueClassName = "text-slate-200" }: DetailItemProps) => (
  <div>
    <dt className="text-xs font-medium tracking-wide text-slate-500">{label}</dt>
    <dd className={`mt-1.5 break-words text-sm font-medium leading-6 sm:text-base ${valueClassName}`}>
      {value}
    </dd>
  </div>
);

const DetailSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5 sm:p-6">
    <h3 className="text-sm font-semibold tracking-wide text-slate-100 sm:text-base">{title}</h3>
    <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">{children}</dl>
  </section>
);

export default function TradeDetail({ journal, onBack, onEdit }: TradeDetailProps) {
  const profit = parseMoney(journal.profit);
  const profitColor =
    profit === null || profit === 0
      ? "text-slate-200"
      : profit > 0
        ? "text-emerald-300"
        : "text-rose-300";

  return (
    <article aria-labelledby="trade-detail-title">
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

      <header className="mt-6 border-y border-slate-800 py-6 sm:py-7">
        <p className="text-xs font-medium tracking-wide text-slate-500">対象</p>
        <h2 id="trade-detail-title" className="mt-1.5 break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {journal.target}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-medium">
          <span className={journal.category === "株式" ? "text-blue-300" : "text-violet-300"}>
            {journal.category}
          </span>
          <span aria-hidden="true" className="text-slate-700">｜</span>
          <span className="text-slate-200">{journal.decision || "未選択"}</span>
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium tracking-wide text-slate-500">取引日</p>
          <p className="mt-1 text-sm text-slate-300">{journal.tradeDate}</p>
        </div>
      </header>

      <div className="mt-5 space-y-4">
        <DetailSection title="なぜこのトレードをした？">
          <div className="sm:col-span-2">
            <DetailItem label="理由" value={journal.reason || "未入力"} />
          </div>
        </DetailSection>

        <DetailSection title="判断">
          <DetailItem label="感情" value={journal.emotion || "未選択"} />
          <DetailItem
            label="ルール遵守"
            value={journal.ruleFollowed ? "守った" : "守らなかった"}
            valueClassName={journal.ruleFollowed ? "text-emerald-300" : "text-rose-300"}
          />
          <DetailItem label="結果" value={journal.result || "未確定"} />
        </DetailSection>

        <DetailSection title="損益">
          <DetailItem
            label="損益"
            value={formatProfitYen(journal.profit) ?? "未入力"}
            valueClassName={`${profitColor} text-lg font-semibold`}
          />
          <DetailItem label="株数" value={journal.shareCount ? `${journal.shareCount}株` : "未入力"} />
          <DetailItem label="取得単価" value={formatCurrency(journal.acquisitionPrice, journal.currency) ?? "未入力"} />
          <DetailItem label="投資額" value={formatCurrency(calculateInvestment(journal.shareCount, journal.acquisitionPrice), journal.currency) ?? (journal.amount ? formatYen(journal.amount) : null) ?? "未入力"} />
        </DetailSection>

        <DetailSection title="相場環境">
          <DetailItem label="市場環境" value={journal.marketEnvironment || "未選択"} />
          <DetailItem label="市場テーマ" value={journal.marketTheme || "未選択"} />
          <DetailItem label="重要イベント" value={journal.majorEvent || "未選択"} />
        </DetailSection>

        <DetailSection title="振り返り">
          <div className="sm:col-span-2">
            <DetailItem label="振り返り" value={journal.review || "未入力"} />
          </div>
        </DetailSection>

        <section aria-labelledby="trade-ai-review-title" className="rounded-2xl border border-blue-400/10 bg-slate-950/50 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 font-semibold text-blue-300" aria-hidden="true">AI</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 id="trade-ai-review-title" className="text-lg font-semibold text-white">AI Review</h3>
                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-500">今後実装</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">このトレードについてAIが分析します。</p>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
