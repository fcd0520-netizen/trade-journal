type DashboardJournal = {
  result: string;
  ruleFollowed: boolean;
  emotion: string;
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

  const cards = [
    { label: "総記録数", value: `${journals.length}件`, icon: "▦" },
    {
      label: "勝率",
      value: `${toPercentage(wins, completedResults.length)}%`,
      icon: "↗",
    },
    {
      label: "ルール遵守率",
      value: `${toPercentage(rulesFollowed, journals.length)}%`,
      icon: "✓",
    },
    { label: "飛びつき", value: `${impulsiveEntries}件`, icon: "⚡" },
  ];

  return (
    <section aria-label="ダッシュボード" className="ios-dashboard grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="ios-stat rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">{card.label}</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-lg font-semibold text-blue-400" aria-hidden="true">{card.icon}</span>
          </div>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{card.value}</p>
        </div>
      ))}
    </section>
  );
}
