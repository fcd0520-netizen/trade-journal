import { formatProfitYen, parseMoney } from "../lib/currency";
import type { ActiveJournal } from "../types/journal";

type AnalyticsProps = {
  journals: ActiveJournal[];
};

type EmotionSummary = {
  emotion: string;
  wins: number;
  losses: number;
};

const percentage = (value: number, total: number) =>
  total === 0 ? 0 : Math.round((value / total) * 100);

const average = (values: number[]) =>
  values.length === 0
    ? null
    : values.reduce((total, value) => total + value, 0) / values.length;

const profitColor = (profit: number | null) =>
  profit === null || profit === 0
    ? "text-slate-200"
    : profit > 0
      ? "text-emerald-300"
      : "text-rose-300";

const displayProfit = (profit: number | null) =>
  profit === null ? "データなし" : (formatProfitYen(profit) ?? "0円");

export default function Analytics({ journals }: AnalyticsProps) {
  const wins = journals.filter((journal) => journal.result === "勝ち");
  const losses = journals.filter((journal) => journal.result === "負け");
  const decidedTrades = wins.length + losses.length;

  const profitValues = journals
    .map((journal) => parseMoney(journal.profit))
    .filter((profit): profit is number => profit !== null);
  const winningProfits = wins
    .map((journal) => parseMoney(journal.profit))
    .filter((profit): profit is number => profit !== null);
  const losingProfits = losses
    .map((journal) => parseMoney(journal.profit))
    .filter((profit): profit is number => profit !== null);

  const totalProfit = profitValues.reduce((total, profit) => total + profit, 0);
  const averageProfit = average(winningProfits);
  const averageLoss = average(losingProfits);

  const rulesFollowed = journals.filter((journal) => journal.ruleFollowed).length;
  const rulesNotFollowed = journals.length - rulesFollowed;

  const emotionResults = Array.from(
    journals.reduce((groups, journal) => {
      const emotion = journal.emotion.trim() || "未選択";
      const current = groups.get(emotion) ?? { emotion, wins: 0, losses: 0 };

      if (journal.result === "勝ち") current.wins += 1;
      if (journal.result === "負け") current.losses += 1;

      groups.set(emotion, current);
      return groups;
    }, new Map<string, EmotionSummary>())
  )
    .map(([, summary]) => summary)
    .sort(
      (a, b) =>
        b.wins + b.losses - (a.wins + a.losses) ||
        a.emotion.localeCompare(b.emotion, "ja")
    );

  return (
    <section
      id="analytics"
      aria-labelledby="analytics-title"
      className="scroll-mt-8 space-y-5 sm:space-y-6"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
          Decision analytics
        </p>
        <h2
          id="analytics-title"
          className="mt-1 text-xl font-semibold text-white sm:text-2xl"
        >
          Analytics
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Journalの記録だけを集計し、取引判断の傾向を振り返ります。
        </p>
      </div>

      {journals.length === 0 ? (
        <div className="ios-card rounded-2xl border border-dashed border-slate-700 p-8 text-center sm:p-10">
          <p className="font-semibold text-slate-300">
            分析できるJournalがまだありません
          </p>
          <p className="mt-1 text-sm text-slate-500">
            取引記録を保存すると、ここに集計結果が表示されます。
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <section
              aria-labelledby="win-rate-title"
              className="ios-card rounded-2xl p-5 sm:p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
                Performance
              </p>
              <h3 id="win-rate-title" className="mt-1 text-lg font-semibold text-white">
                勝率
              </h3>
              <p className="mt-5 text-3xl font-semibold tracking-tight text-white">
                {percentage(wins.length, decidedTrades)}%
              </p>
              <p className="mt-1 text-xs text-slate-500">
                勝敗が確定した {decidedTrades}件が対象
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800 pt-5">
                <div className="rounded-xl bg-emerald-500/10 p-3">
                  <dt className="text-xs text-slate-400">勝ちトレード数</dt>
                  <dd className="mt-1 text-xl font-semibold text-emerald-300">
                    {wins.length}件
                  </dd>
                </div>
                <div className="rounded-xl bg-rose-500/10 p-3">
                  <dt className="text-xs text-slate-400">負けトレード数</dt>
                  <dd className="mt-1 text-xl font-semibold text-rose-300">
                    {losses.length}件
                  </dd>
                </div>
              </dl>
            </section>

            <section
              aria-labelledby="profit-title"
              className="ios-card rounded-2xl p-5 sm:p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">
                Profit &amp; loss
              </p>
              <h3 id="profit-title" className="mt-1 text-lg font-semibold text-white">
                損益
              </h3>
              <dl className="mt-5 space-y-3">
                {[
                  { label: "総利益", value: totalProfit },
                  { label: "平均利益", value: averageProfit },
                  { label: "平均損失", value: averageLoss },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3"
                  >
                    <dt className="text-sm text-slate-400">{item.label}</dt>
                    <dd
                      className={`break-words text-right font-semibold ${profitColor(item.value)}`}
                    >
                      {displayProfit(item.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section
              aria-labelledby="rule-title"
              className="ios-card rounded-2xl p-5 sm:p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-400">
                Discipline
              </p>
              <h3 id="rule-title" className="mt-1 text-lg font-semibold text-white">
                ルール遵守率
              </h3>
              <p className="mt-5 text-3xl font-semibold tracking-tight text-white">
                {percentage(rulesFollowed, journals.length)}%
              </p>
              <p className="mt-1 text-xs text-slate-500">
                全Journal {journals.length}件が対象
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800 pt-5">
                <div className="rounded-xl bg-emerald-500/10 p-3">
                  <dt className="text-xs text-slate-400">守った</dt>
                  <dd className="mt-1 text-xl font-semibold text-emerald-300">
                    {rulesFollowed}件
                  </dd>
                </div>
                <div className="rounded-xl bg-rose-500/10 p-3">
                  <dt className="text-xs text-slate-400">守らなかった</dt>
                  <dd className="mt-1 text-xl font-semibold text-rose-300">
                    {rulesNotFollowed}件
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <section
            aria-labelledby="emotion-title"
            className="ios-card rounded-2xl p-5 sm:p-6"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">
                Emotion review
              </p>
              <h3 id="emotion-title" className="mt-1 text-lg font-semibold text-white">
                感情別成績
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                感情ごとの勝ち・負けを比較できます。
              </p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {emotionResults.map((summary) => (
                <article
                  key={summary.emotion}
                  className="rounded-xl border border-slate-800 bg-slate-950/45 p-4"
                >
                  <h4 className="font-semibold text-slate-100">{summary.emotion}</h4>
                  <dl className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-xs text-slate-500">勝ち</dt>
                      <dd className="mt-1 text-lg font-semibold text-emerald-300">
                        {summary.wins}件
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">負け</dt>
                      <dd className="mt-1 text-lg font-semibold text-rose-300">
                        {summary.losses}件
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
