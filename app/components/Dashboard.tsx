import { useEffect, useState } from "react";
import Link from "next/link";
import { formatProfitUsd, parseMoney } from "../lib/currency";
import type { ActiveJournal } from "../types/journal";
import type { WatchlistItem } from "../types/watchlist";

type DashboardProps = {
  journals: ActiveJournal[];
  onEdit: (journal: ActiveJournal) => void;
};

type SummaryCounts = {
  journals: number;
  watchlist: number;
  paperTrades: number;
};

type ActivityType = "journal" | "watchlist" | "paperTrade";

type RecentActivity = {
  id: string;
  type: ActivityType;
  ticker: string;
  createdAt: string;
  timestamp: number;
};

type SearchCategory = "Journal" | "Watchlist" | "Paper Trade";

type GlobalSearchItem = {
  id: string;
  category: SearchCategory;
  ticker: string;
  company: string;
  reason: string;
  tradeDate: string;
};

const SUMMARY_STORAGE_KEYS = {
  journals: "trade-journals",
  watchlist: "trade-journal-watchlist",
  paperTrades: "paper-trades",
} as const;

const emptySummaryCounts: SummaryCounts = {
  journals: 0,
  watchlist: 0,
  paperTrades: 0,
};

const getStoredItemCount = (key: string) => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return 0;

    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
};

const getStoredItems = (key: string): Record<string, unknown>[] => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null
        )
      : [];
  } catch {
    return [];
  }
};

const getStringValue = (
  item: Record<string, unknown>,
  keys: string[],
) => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const getGlobalSearchItems = (): GlobalSearchItem[] => {
  const sources: {
    key: string;
    category: SearchCategory;
    tickerKeys: string[];
  }[] = [
    {
      key: SUMMARY_STORAGE_KEYS.journals,
      category: "Journal",
      tickerKeys: ["ticker", "target"],
    },
    {
      key: SUMMARY_STORAGE_KEYS.watchlist,
      category: "Watchlist",
      tickerKeys: ["ticker"],
    },
    {
      key: SUMMARY_STORAGE_KEYS.paperTrades,
      category: "Paper Trade",
      tickerKeys: ["ticker"],
    },
  ];

  return sources.flatMap(({ key, category, tickerKeys }) =>
    getStoredItems(key).map((item, index) => ({
      id: `${category}-${String(item.id ?? index)}`,
      category,
      ticker: getStringValue(item, tickerKeys),
      company: getStringValue(item, ["company", "companyName"]),
      reason: getStringValue(item, ["reason"]),
      tradeDate: getStringValue(item, ["tradeDate"]),
    })),
  );
};

const getActivityDate = (item: Record<string, unknown>) => {
  if (typeof item.createdAt === "string") {
    const timestamp = Date.parse(item.createdAt);
    if (Number.isFinite(timestamp)) return timestamp;
  }

  if (typeof item.id === "number" && Number.isFinite(item.id)) return item.id;
  if (typeof item.tradeDate === "string") {
    const timestamp = Date.parse(item.tradeDate);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  if (typeof item.startDate === "string") {
    const timestamp = Date.parse(item.startDate);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return 0;
};

const getRecentActivities = (): RecentActivity[] => {
  const sources: { key: string; type: ActivityType; tickerKey: string }[] = [
    { key: SUMMARY_STORAGE_KEYS.journals, type: "journal", tickerKey: "target" },
    { key: SUMMARY_STORAGE_KEYS.watchlist, type: "watchlist", tickerKey: "ticker" },
    { key: SUMMARY_STORAGE_KEYS.paperTrades, type: "paperTrade", tickerKey: "ticker" },
  ];

  return sources
    .flatMap(({ key, type, tickerKey }) =>
      getStoredItems(key).map((item, index) => {
        const timestamp = getActivityDate(item);
        return {
          id: `${type}-${String(item.id ?? index)}`,
          type,
          ticker:
            typeof item[tickerKey] === "string" && item[tickerKey].trim()
              ? item[tickerKey].trim()
              : "名称未入力",
          createdAt: timestamp ? new Date(timestamp).toISOString() : "",
          timestamp,
        };
      })
    )
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);
};

const getWatchingItems = (): WatchlistItem[] =>
  getStoredItems(SUMMARY_STORAGE_KEYS.watchlist)
    .filter(
      (item): item is Record<string, unknown> & WatchlistItem =>
        item.status === "監視中" &&
        typeof item.id === "number" &&
        typeof item.createdAt === "string" &&
        typeof item.ticker === "string" &&
        typeof item.companyName === "string" &&
        typeof item.reason === "string" &&
        typeof item.targetPrice === "string" &&
        (item.currency === "USD" || item.currency === "JPY")
    )
    .sort((a, b) => getActivityDate(b) - getActivityDate(a))
    .slice(0, 3);

const formatWatchlistPrice = (value: string, currency: WatchlistItem["currency"]) => {
  if (!value) return "未入力";

  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;

  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "ja-JP", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(amount);
};

const activityMeta: Record<
  ActivityType,
  { label: string; icon: string; iconClass: string }
> = {
  journal: {
    label: "Journal",
    icon: "▦",
    iconClass: "border-blue-400/20 bg-blue-500/10 text-blue-300",
  },
  watchlist: {
    label: "Watchlist",
    icon: "☆",
    iconClass: "border-amber-400/20 bg-amber-500/10 text-amber-300",
  },
  paperTrade: {
    label: "Paper Trade",
    icon: "◫",
    iconClass: "border-violet-400/20 bg-violet-500/10 text-violet-300",
  },
};

const formatActivityDate = (date: string) =>
  date
    ? new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(date))
    : "登録日不明";

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
  const [summaryCounts, setSummaryCounts] =
    useState<SummaryCounts>(emptySummaryCounts);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [watchingItems, setWatchingItems] = useState<WatchlistItem[]>([]);
  const [globalSearchItems, setGlobalSearchItems] = useState<GlobalSearchItem[]>([]);
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    let frame: number | null = null;

    const refreshSummaryCounts = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);

      frame = window.requestAnimationFrame(() => {
        setSummaryCounts({
          journals: getStoredItemCount(SUMMARY_STORAGE_KEYS.journals),
          watchlist: getStoredItemCount(SUMMARY_STORAGE_KEYS.watchlist),
          paperTrades: getStoredItemCount(SUMMARY_STORAGE_KEYS.paperTrades),
        });
        setRecentActivities(getRecentActivities());
        setWatchingItems(getWatchingItems());
        setGlobalSearchItems(getGlobalSearchItems());
        frame = null;
      });
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        Object.values(SUMMARY_STORAGE_KEYS).includes(
          event.key as (typeof SUMMARY_STORAGE_KEYS)[keyof typeof SUMMARY_STORAGE_KEYS]
        )
      ) {
        refreshSummaryCounts();
      }
    };

    refreshSummaryCounts();
    window.addEventListener("focus", refreshSummaryCounts);
    window.addEventListener("pageshow", refreshSummaryCounts);
    window.addEventListener("storage", handleStorage);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("focus", refreshSummaryCounts);
      window.removeEventListener("pageshow", refreshSummaryCounts);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

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
  const normalizedGlobalSearch = globalSearch.trim().toLocaleLowerCase();
  const globalSearchResults = normalizedGlobalSearch
    ? globalSearchItems.filter(
        (item) =>
          item.ticker.toLocaleLowerCase().includes(normalizedGlobalSearch) ||
          item.company.toLocaleLowerCase().includes(normalizedGlobalSearch),
      )
    : [];

  const cards = [
    { label: "総記録数", value: `${journals.length}件`, icon: "▦", valueClass: "text-white" },
    { label: "勝率", value: `${toPercentage(wins, completedResults.length)}%`, icon: "↗", valueClass: "text-white" },
    { label: "損益合計", value: formatProfitUsd(totalProfit) ?? "$0.00", icon: "$", valueClass: totalProfitColor },
    { label: "ルール遵守率", value: `${toPercentage(rulesFollowed, journals.length)}%`, icon: "✓", valueClass: "text-white" },
    { label: "今月の記録数", value: `${monthlyJournals.length}件`, icon: "◫", valueClass: "text-white" },
    { label: "今月の勝率", value: `${toPercentage(monthlyWins, monthlyCompletedResults.length)}%`, icon: "◎", valueClass: "text-white" },
  ];
  const summaryCards = [
    { label: "Journal件数", value: summaryCounts.journals, icon: "▦", href: "/#journal-list" },
    { label: "Watchlist件数", value: summaryCounts.watchlist, icon: "☆", href: "/watchlist" },
    { label: "Paper Trade件数", value: summaryCounts.paperTrades, icon: "◫", href: "/paper-trade" },
  ];

  return (
    <section aria-labelledby="dashboard-title" className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Overview</p>
          <h2 id="dashboard-title" className="mt-1 text-xl font-semibold text-white sm:text-2xl">Dashboard</h2>
        </div>
        <Link
          href="/#new-entry"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-400/25 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060b16] sm:w-auto"
          aria-label="新しい取引記録を追加"
        >
          <span aria-hidden="true" className="text-lg leading-none">＋</span>
          クイック追加
        </Link>
      </div>

      <section aria-labelledby="global-search-title" className="ios-card rounded-2xl p-4 sm:p-5">
        <label
          id="global-search-title"
          htmlFor="global-search"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400"
        >
          Global Search
        </label>
        <div className="relative mt-3">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500"
          >
            ⌕
          </span>
          <input
            id="global-search"
            type="search"
            autoComplete="off"
            placeholder="Search..."
            value={globalSearch}
            onChange={(event) => {
              setGlobalSearchItems(getGlobalSearchItems());
              setGlobalSearch(event.target.value);
            }}
            className="min-h-12 w-full rounded-2xl border border-slate-700 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {normalizedGlobalSearch && (
          <div className="mt-4" aria-live="polite">
            {globalSearchResults.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                検索結果はありません
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs text-slate-500">
                  {globalSearchResults.length}件の検索結果
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {globalSearchResults.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                    >
                      <span className="inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-300">
                        {item.category}
                      </span>
                      <h3 className="mt-3 text-lg font-semibold tracking-wide text-white">
                        {item.ticker || "ティッカー未入力"}
                      </h3>
                      <p className="mt-0.5 text-sm text-slate-400">
                        {item.company || "企業名未入力"}
                      </p>
                      {(item.reason || item.tradeDate) && (
                        <div className="mt-3 border-t border-slate-800 pt-3 text-xs leading-5 text-slate-500">
                          {item.reason && (
                            <p className="line-clamp-2">
                              <span className="text-slate-400">理由：</span>
                              {item.reason}
                            </p>
                          )}
                          {item.tradeDate && (
                            <p className={item.reason ? "mt-1" : ""}>
                              <span className="text-slate-400">取引日：</span>
                              {item.tradeDate}
                            </p>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </section>

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
                : formatProfitUsd(monthlyProfit) ?? "$0.00"}
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

      <section aria-labelledby="recent-activity-title" className="ios-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Recent Activity</p>
            <h3 id="recent-activity-title" className="mt-1 text-lg font-semibold text-white">最近の活動</h3>
          </div>
          <p className="text-xs text-slate-500">最新5件</p>
        </div>

        {recentActivities.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
            まだ活動がありません。
          </p>
        ) : (
          <ul className="mt-5 overflow-hidden rounded-xl border border-slate-800">
            {recentActivities.map((activity) => {
              const meta = activityMeta[activity.type];
              return (
                <li
                  key={activity.id}
                  className="flex min-h-16 items-center gap-3 border-b border-slate-800 px-3.5 py-3 last:border-b-0 sm:px-4"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg font-semibold ${meta.iconClass}`}
                    aria-hidden="true"
                  >
                    {meta.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-100">
                      {activity.ticker} を{meta.label}へ追加
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      登録日 {formatActivityDate(activity.createdAt)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="ios-dashboard grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {summaryCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="ios-stat flex min-h-28 cursor-pointer flex-col justify-between rounded-2xl p-4 transition duration-200 hover:-translate-y-0.5 hover:border-blue-400/30 hover:bg-slate-800/70 focus:outline-none focus-visible:-translate-y-0.5 focus-visible:border-blue-400/40 focus-visible:ring-2 focus-visible:ring-blue-500/70 sm:min-h-32 sm:p-5"
            aria-label={`${card.label}：${card.value}件。ページへ移動`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">{card.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-lg font-semibold text-blue-400" aria-hidden="true">{card.icon}</span>
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{card.value}件</p>
          </Link>
        ))}
      </div>

      <section aria-labelledby="watching-items-title" className="ios-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">Watching</p>
            <h3 id="watching-items-title" className="mt-1 text-lg font-semibold text-white">監視銘柄</h3>
          </div>
          <p className="text-xs text-slate-500">最新3件</p>
        </div>

        {watchingItems.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
            現在、監視中の銘柄はありません
          </p>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {watchingItems.map((item) => (
              <article
                key={item.id}
                className="flex min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-950/45 p-4"
              >
                <div>
                  <h4 className="text-lg font-semibold tracking-wide text-white">{item.ticker}</h4>
                  <p className="mt-0.5 truncate text-sm text-slate-400">
                    {item.companyName || "銘柄名未入力"}
                  </p>
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-300">
                  <span className="font-medium text-slate-500">理由：</span>
                  {item.reason || "未入力"}
                </p>
                <p className="mt-4 border-t border-slate-800 pt-3 text-sm text-slate-400">
                  目標買値：
                  <span className="font-semibold text-amber-300">
                    {formatWatchlistPrice(item.targetPrice, item.currency)}
                  </span>
                </p>
              </article>
            ))}
          </div>
        )}

        <div className="mt-5 border-t border-slate-800 pt-4">
          <Link
            href="/watchlist"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-300 transition hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/70"
          >
            Watchlistをすべて見る →
          </Link>
        </div>
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
                  {formatProfitUsd(journal.profit) ?? "未入力"}
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
