import { formatProfitYen, parseMoney } from "../lib/currency";

type DashboardJournal = {
  result: string;
  ruleFollowed: boolean;
  emotion: string;
  profit: string;
};

type DashboardProps = {
  journals: DashboardJournal[];
};

const toPercentage = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);

export default function Dashboard({ journals }: DashboardProps) {
  const completedResults = journals.filter((journal) =>
    ["勝ち", "負け", "引き分け"].includes(journal.result)
  );
  const wins = completedResults.filter(
    (journal) => journal.result === "勝ち"
  ).length;
  const rulesFollowed = journals.filter(
    (journal) => journal.ruleFollowed
  ).length;
  const impulsiveEntries = journals.filter(
    (journal) => journal.emotion === "飛びつき"
  ).length;
  const totalProfit = journals.reduce(
    (total, journal) => total + (parseMoney(journal.profit) ?? 0),
    0
  );
  const totalProfitColor =
    totalProfit > 0
      ? "text-emerald-300"
      : totalProfit < 0
        ? "text-rose-300"
        : "text-slate-300";

  const cards = [
    { label: "総記録数", value: `${journals.length}件`, icon: "▦", valueClass: "text-white" },
    {
      label: "勝率",
      value: `${toPercentage(wins, completedResults.length)}%`,
      icon: "↗",
      valueClass: "text-white",
    },
    {
      label: "ルール遵守率",
      value: `${toPercentage(rulesFollowed, journals.length)}%`,
      icon: "✓",
      valueClass: "text-white",
    },
    { label: "飛びつき", value: `${impulsiveEntries}件`, icon: "⚡", valueClass: "text-white" },
    {
      label: "損益合計",
      value: formatProfitYen(totalProfit) ?? "0円",
      icon: "¥",
      valueClass: totalProfitColor,
    },
  ];

  return (
    <section aria-label="ダッシュボード" className="ios-dashboard grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="ios-stat rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">{card.label}</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-lg font-semibold text-blue-400" aria-hidden="true">{card.icon}</span>
          </div>
          <p className={`mt-4 text-2xl font-semibold tracking-tight sm:text-3xl ${card.valueClass}`}>{card.value}</p>
        </div>
      ))}
    </section>
  );
}
