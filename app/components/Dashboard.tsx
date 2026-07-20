import { formatProfitYen, parseMoney } from "../lib/currency";
import type { ActiveJournal } from "../types/journal";

type DashboardProps = {
  journals: ActiveJournal[];
  onEdit: (journal: ActiveJournal) => void;
};

const toPercentage = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);

const profitColor = (profit: number) =>
  profit > 0
    ? "text-emerald-300"
    : profit < 0
      ? "text-rose-300"
      : "text-slate-300";

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getCompletedResults = (journals: ActiveJournal[]) =>
  journals.filter((journal) =>
    ["勝ち", "負け", "引き分け"].includes(journal.result)
  );

export default function Dashboard({ journals, onEdit }: DashboardProps) {
  const completedResults = getCompletedResults(journals);
  const wins = completedResults.filter((journal) => journal.result === "勝ち").length;
  const rulesFollowed = journals.filter((journal) => journal.ruleFollowed).length;
  const totalProfit = journals.reduce(
    (total, journal) => total + (parseMoney(journal.profit) ?? 0),
    0
  );
  const monthlyJournals = journals.filter((journal) =>
    journal.tradeDate.startsWith(getCurrentMonthKey())
  );
  const monthlyCompletedResults = getCompletedResults(monthlyJournals);
  const monthlyWins = monthlyCompletedResults.filter(
    (journal) => journal.result === "勝ち"
  ).length;
  const monthlyDecidedResults = monthlyJournals.filter((journal) =>
    ["勝ち", "負け"].includes(journal.result)
  );
  const monthlyDecidedWins = monthlyDecidedResults.filter(
    (journal) => journal.result === "勝ち"
  ).length;
  const monthlyProfit = monthlyJournals.reduce(
    (total, journal) => total + (parseMoney(journal.profit) ?? 0),
    0
  );
  const monthlyRulesFollowed = monthlyJournals.filter(
    (journal) => journal.ruleFollowed
  ).length;
  const recentJournals = [...journals]
    .sort(
      (a, b) =>
        b.tradeDate.localeCompare(a.tradeDate) || b.id - a.id
    )
    .slice(0, 3);
  const totalProfitColor = profitColor(totalProfit);

  const cards = [
    { label: "総記録数", value: `${journals.length}件`, icon: "▦", valueClass: "text-white" },
    { label: "勝率", value: `${toPercentage(wins, completedResults.length)}%`, icon: "↗", valueClass: "text-white" },
    { label: "損益合計", value: formatProfitYen(totalProfit) ?? "0円", icon: "¥", valueClass: totalProfitColor },
    { label: "ルール遵守率", value: `${toPercentage(rulesFollowed, journals.length)}%`, icon: "✓", valueClass: "text-white" },
    { label: "今月の記録数", value: `${monthlyJournals.length}件`, icon: "◫", valueClass: "text-white" },
    { label: "今月の勝率", value: `${toPercentage(monthlyWins, monthlyCompletedResults.length)}%`, icon: "◎", valueClass: "text-white" },
  ];

  return (
    <section aria-labelledby="dashboard-title" className="space-y-5 sm:space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Overview</p>
        <h2 id="dashboard-title" className="mt-1 text-xl font-semibold text-white sm:text-2xl">Dashboard</h2>
      </div>

      <section aria-labelledby="today-title" className="ios-card overflow-hidden rounded-2xl border-blue-400/20 bg-gradient-to-br from-blue-950/70 via-slate-900/95 to-slate-950/95 p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Today</p>
          <h3 id="today-title" className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
            今日も、良い意思決定を積み重ねよう。
          </h3>
        </div>

        <dl className="mt-5 grid grid-cols-3 divide-x divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/45 py-3 sm:mt-6 sm:py-4">
          <div className="min-w-0 px-2 text-center sm:px-4">
            <dt className="text-[10px] font-medium leading-4 text-slate-500 sm:text-xs">今月の勝率</dt>
            <dd className="mt-1 break-words text-lg font-semibold tracking-tight text-white sm:text-2xl">
              {monthlyDecidedResults.length === 0
                ? "—"
                : `${toPercentage(monthlyDecidedWins, monthlyDecidedResults.length)}%`}
            </dd>
          </div>
          <div className="min-w-0 px-2 text-center sm:px-4">
            <dt className="text-[10px] font-medium leading-4 text-slate-500 sm:text-xs">今月の損益</dt>
            <dd className={`mt-1 break-words text-base font-semibold tracking-tight sm:text-2xl ${monthlyJournals.length === 0 ? "text-slate-500" : profitColor(monthlyProfit)}`}>
              {monthlyJournals.length === 0
                ? "—"
                : formatProfitYen(monthlyProfit) ?? "0円"}
            </dd>
          </div>
          <div className="min-w-0 px-2 text-center sm:px-4">
            <dt className="text-[10px] font-medium leading-4 text-slate-500 sm:text-xs">ルール遵守率</dt>
            <dd className="mt-1 break-words text-lg font-semibold tracking-tight text-white sm:text-2xl">
              {monthlyJournals.length === 0
                ? "—"
                : `${toPercentage(monthlyRulesFollowed, monthlyJournals.length)}%`}
            </dd>
          </div>
        </dl>
      </section>

      <div className="ios-dashboard grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="ios-stat flex min-h-32 flex-col justify-between rounded-2xl p-4 sm:min-h-36 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">{card.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-lg font-semibold text-blue-400" aria-hidden="true">{card.icon}</span>
            </div>
            <p className={`mt-4 text-2xl font-semibold tracking-tight sm:text-3xl ${card.valueClass}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <section aria-labelledby="recent-journals-title" className="ios-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Latest activity</p>
            <h3 id="recent-journals-title" className="mt-1 text-lg font-semibold text-white">最近の記録</h3>
          </div>
          <p className="text-xs text-slate-500">直近3件</p>
        </div>

        {recentJournals.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">まだ記録がありません。</p>
        ) : (
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-800">
            {recentJournals.map((journal) => (
              <button
                key={journal.id}
                type="button"
                onClick={() => onEdit(journal)}
                aria-label={`${journal.tradeDate} ${journal.category} ${journal.target}を編集`}
                className="grid min-h-16 w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-none border-b border-slate-800 px-3.5 py-3 text-left transition last:border-b-0 hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:px-4"
              >
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${journal.category === "株式" ? "border-blue-400/25 bg-blue-500/15 text-blue-300" : "border-violet-400/25 bg-violet-500/15 text-violet-300"}`}>{journal.category}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-100">{journal.target}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{journal.tradeDate}</span>
                </span>
                <span className={`text-sm font-semibold ${parseMoney(journal.profit) === null ? "text-slate-500" : (parseMoney(journal.profit) ?? 0) > 0 ? "text-emerald-300" : (parseMoney(journal.profit) ?? 0) < 0 ? "text-rose-300" : "text-slate-300"}`}>
                  {formatProfitYen(journal.profit) ?? "未入力"}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="ai-review-title" className="ios-card rounded-2xl border-blue-400/10 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 font-semibold text-blue-300" aria-hidden="true">AI</span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="ai-review-title" className="text-lg font-semibold text-white">AI Review</h3>
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-500">今後実装</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">あなたのトレード傾向を<br className="sm:hidden" />AIが分析します。</p>
          </div>
        </div>
      </section>
    </section>
  );
}
