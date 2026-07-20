import { formatProfitYen, parseMoney } from "../lib/currency";
import type { ActiveJournal, TradeCategory } from "../types/journal";

type AnalyticsProps = {
  journals: ActiveJournal[];
};

type Summary = {
  count: number;
  wins: number;
  losses: number;
  completed: number;
  profit: number;
};

const percentage = (value: number, total: number) =>
  total === 0 ? 0 : Math.round((value / total) * 100);

const summarize = (journals: ActiveJournal[]): Summary => ({
  count: journals.length,
  wins: journals.filter((journal) => journal.result === "勝ち").length,
  losses: journals.filter((journal) => journal.result === "負け").length,
  completed: journals.filter((journal) =>
    ["勝ち", "負け", "引き分け"].includes(journal.result)
  ).length,
  profit: journals.reduce(
    (total, journal) => total + (parseMoney(journal.profit) ?? 0),
    0
  ),
});

const profitColor = (profit: number) =>
  profit > 0
    ? "text-emerald-300"
    : profit < 0
      ? "text-rose-300"
      : "text-slate-200";

const formatMonth = (month: string) => {
  if (month === "日付未設定") return month;
  const [year, monthNumber] = month.split("-");
  return `${year}年${Number(monthNumber)}月`;
};

export default function Analytics({ journals }: AnalyticsProps) {
  if (journals.length === 0) {
    return (
      <section id="analytics" aria-labelledby="analytics-title" className="scroll-mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Decision analytics</p>
        <h2 id="analytics-title" className="mt-1 text-xl font-semibold text-white sm:text-2xl">Analytics</h2>
        <div className="ios-card mt-5 rounded-2xl border border-dashed border-slate-700 p-8 text-center sm:p-10">
          <p className="font-semibold text-slate-300">分析できる記録がまだありません</p>
        </div>
      </section>
    );
  }

  const overall = summarize(journals);
  const rulesFollowed = journals.filter((journal) => journal.ruleFollowed).length;
  const emotions = Array.from(
    journals.reduce((groups, journal) => {
      const emotion = journal.emotion || "未選択";
      groups.set(emotion, (groups.get(emotion) ?? 0) + 1);
      return groups;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"));

  const categories = (["株式", "FX"] as TradeCategory[]).map((category) => ({
    category,
    summary: summarize(journals.filter((journal) => journal.category === category)),
  }));

  const months = Array.from(
    journals.reduce((groups, journal) => {
      const month = /^\d{4}-\d{2}/.exec(journal.tradeDate)?.[0] ?? "日付未設定";
      const group = groups.get(month) ?? [];
      group.push(journal);
      groups.set(month, group);
      return groups;
    }, new Map<string, ActiveJournal[]>())
  )
    .sort(([monthA], [monthB]) => {
      if (monthA === "日付未設定") return 1;
      if (monthB === "日付未設定") return -1;
      return monthB.localeCompare(monthA);
    })
    .map(([month, monthJournals]) => ({ month, summary: summarize(monthJournals) }));

  const summaryCards = [
    { label: "総トレード数", value: `${overall.count}件`, note: "株式・FX", color: "text-white" },
    { label: "勝率", value: `${percentage(overall.wins, overall.completed)}%`, note: `確定 ${overall.completed}件`, color: "text-white" },
    { label: "総損益", value: formatProfitYen(overall.profit) ?? "0円", note: "入力済み損益の合計", color: profitColor(overall.profit) },
    { label: "ルール遵守率", value: `${percentage(rulesFollowed, overall.count)}%`, note: `${rulesFollowed} / ${overall.count}件`, color: "text-white" },
  ];

  return (
    <section id="analytics" aria-labelledby="analytics-title" className="scroll-mt-8 space-y-5 sm:space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Decision analytics</p>
        <h2 id="analytics-title" className="mt-1 text-xl font-semibold text-white sm:text-2xl">Analytics</h2>
        <p className="mt-2 text-sm text-slate-500">記録から意思決定の傾向を振り返ります。</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="ios-stat min-w-0 rounded-2xl p-4 sm:p-5">
            <p className="text-[11px] font-semibold tracking-wide text-slate-400 sm:text-xs">{card.label}</p>
            <p className={`mt-3 break-words text-xl font-semibold tracking-tight sm:text-2xl ${card.color}`}>{card.value}</p>
            <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">{card.note}</p>
          </div>
        ))}
      </div>

      <section aria-labelledby="emotion-title" className="ios-card rounded-2xl p-5 sm:p-6">
        <h3 id="emotion-title" className="text-lg font-semibold text-white">感情別集計</h3>
        <div className="mt-5 space-y-4">
          {emotions.map(([emotion, count]) => {
            const share = percentage(count, overall.count);
            return (
              <div key={emotion}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-slate-200">{emotion}</span>
                  <span className="shrink-0 text-slate-400">{count}件 <span className="text-slate-600">({share}%)</span></span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${share}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="category-title">
        <h3 id="category-title" className="text-lg font-semibold text-white">カテゴリ別集計</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {categories.map(({ category, summary }) => (
            <div key={category} className="ios-card rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-semibold text-slate-100">{category}</h4>
                <span className={`h-2.5 w-2.5 rounded-full ${category === "株式" ? "bg-blue-400" : "bg-violet-400"}`} aria-hidden="true" />
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3">
                <div><dt className="text-xs text-slate-500">件数</dt><dd className="mt-1 font-semibold text-slate-200">{summary.count}件</dd></div>
                <div><dt className="text-xs text-slate-500">勝率</dt><dd className="mt-1 font-semibold text-slate-200">{percentage(summary.wins, summary.completed)}%</dd></div>
                <div><dt className="text-xs text-slate-500">損益</dt><dd className={`mt-1 break-words font-semibold ${profitColor(summary.profit)}`}>{formatProfitYen(summary.profit) ?? "0円"}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="monthly-title" className="ios-card rounded-2xl p-5 sm:p-6">
        <h3 id="monthly-title" className="text-lg font-semibold text-white">月別集計</h3>
        <div className="mt-5 space-y-3">
          {months.map(({ month, summary }) => (
            <div key={month} className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
              <div className="flex items-center justify-between gap-4">
                <h4 className="font-semibold text-slate-100">{formatMonth(month)}</h4>
                <p className={`font-semibold ${profitColor(summary.profit)}`}>{formatProfitYen(summary.profit) ?? "0円"}</p>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-800 pt-4 text-sm">
                <div><dt className="text-xs text-slate-500">トレード数</dt><dd className="mt-1 font-medium text-slate-200">{summary.count}件</dd></div>
                <div><dt className="text-xs text-slate-500">勝ち</dt><dd className="mt-1 font-medium text-emerald-300">{summary.wins}件</dd></div>
                <div><dt className="text-xs text-slate-500">負け</dt><dd className="mt-1 font-medium text-rose-300">{summary.losses}件</dd></div>
              </dl>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
