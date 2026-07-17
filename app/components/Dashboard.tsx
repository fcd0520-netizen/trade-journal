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
    { label: "総記録数", value: `${journals.length}件` },
    {
      label: "勝率",
      value: `${toPercentage(wins, completedResults.length)}%`,
    },
    {
      label: "ルール遵守率",
      value: `${toPercentage(rulesFollowed, journals.length)}%`,
    },
    { label: "「飛びつき」と記録", value: `${impulsiveEntries}件` },
  ];

  return (
    <section aria-label="ダッシュボード" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-black/10 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">{card.value}</p>
        </div>
      ))}
    </section>
  );
}
