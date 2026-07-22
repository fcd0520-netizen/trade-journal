"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import type { Value } from "react-calendar/dist/shared/types.js";
import Analytics from "./components/Analytics";
import Dashboard from "./components/Dashboard";
import Sidebar from "./components/Sidebar";
import TradeDetail from "./components/TradeDetail";
import { calculateInvestment, formatCurrency, formatYen, normalizeStoredMoney } from "./lib/currency";
import type { ActiveJournal, Currency, Journal, TradeCategory } from "./types/journal";

type StoredJournal = Omit<Partial<Journal>, "amount" | "profit"> & {
  amount?: unknown;
  profit?: unknown;
  createdAt?: string;
};

type CategoryFilter = "すべて" | TradeCategory;
type ResultFilter = "すべて" | "未確定" | "勝ち" | "負け";
type RuleFilter = "すべて" | "守った" | "守らなかった";

const STORAGE_KEY = "trade-journals";

const getToday = () => new Date().toISOString().split("T")[0];

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const isTradeCategory = (category: string): category is TradeCategory =>
  category === "株式" || category === "FX";

const categoryBadgeClass = (category: TradeCategory) => {
  if (category === "株式") return "border-blue-400/25 bg-blue-500/15 text-blue-300";
  return "border-violet-400/25 bg-violet-500/15 text-violet-300";
};

const resultBadgeClass = (result: string) => {
  if (result === "勝ち") return "border-emerald-400/25 bg-emerald-500/15 text-emerald-300";
  if (result === "負け") return "border-rose-400/25 bg-rose-500/15 text-rose-300";
  return "border-slate-500/25 bg-slate-500/15 text-slate-300";
};

export default function Home() {
  const [category, setCategory] = useState<TradeCategory>("株式");
  const [target, setTarget] = useState("");

  const [marketEnvironment, setMarketEnvironment] = useState("未選択");
  const [marketTheme, setMarketTheme] = useState("未選択");
  const [majorEvent, setMajorEvent] = useState("未選択");

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [shareCount, setShareCount] = useState("");
  const [acquisitionPrice, setAcquisitionPrice] = useState("");
  const [profit, setProfit] = useState("");
  const [decision, setDecision] = useState("買い");
  const [reason, setReason] = useState("");
  const [emotion, setEmotion] = useState("冷静");
  const [result, setResult] = useState("未確定");
  const [review, setReview] = useState("");
  const [ruleFollowed, setRuleFollowed] = useState(false);
  const [tradeDate, setTradeDate] = useState(getToday());

  const [message, setMessage] = useState("");
  const [journals, setJournals] = useState<Journal[]>([]);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("すべて");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("すべて");
  const [ruleFilter, setRuleFilter] = useState<RuleFilter>("すべて");
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StoredJournal[];

        const restored: Journal[] = parsed.map((journal) => ({
          id: journal.id ?? Date.now(),
          category: journal.category ?? "株式",
          target: journal.target ?? "",

          marketEnvironment: journal.marketEnvironment ?? "未選択",
          marketTheme: journal.marketTheme ?? "未選択",
          majorEvent: journal.majorEvent ?? "未選択",

          amount: normalizeStoredMoney(journal.amount),
          currency: journal.currency === "JPY" ? "JPY" : "USD",
          shareCount: normalizeStoredMoney(journal.shareCount),
          acquisitionPrice: normalizeStoredMoney(journal.acquisitionPrice),
          profit: normalizeStoredMoney(journal.profit),
          decision: journal.decision ?? "買い",
          reason: journal.reason ?? "",
          emotion: journal.emotion ?? "冷静",
          result: journal.result ?? "未確定",
          review: journal.review ?? "",
          ruleFollowed: journal.ruleFollowed ?? false,
          tradeDate: journal.tradeDate ?? journal.createdAt ?? getToday(),
        }));

        setJournals(restored);
      } catch {
        setMessage("保存データを読み込めませんでした。");
      }
    }

    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(journals));
  }, [journals, hasLoaded]);

  const resetForm = () => {
    setCategory("株式");
    setTarget("");

    setMarketEnvironment("未選択");
    setMarketTheme("未選択");
    setMajorEvent("未選択");

    setAmount("");
    setCurrency("USD");
    setShareCount("");
    setAcquisitionPrice("");
    setProfit("");
    setDecision("買い");
    setReason("");
    setEmotion("冷静");
    setResult("未確定");
    setReview("");
    setRuleFollowed(false);
    setTradeDate(getToday());

    setEditingId(null);
  };

  const isFormDirty =
    category !== "株式" ||
    target !== "" ||
    marketEnvironment !== "未選択" ||
    marketTheme !== "未選択" ||
    majorEvent !== "未選択" ||
    currency !== "USD" ||
    shareCount !== "" ||
    acquisitionPrice !== "" ||
    profit !== "" ||
    decision !== "買い" ||
    reason !== "" ||
    emotion !== "冷静" ||
    result !== "未確定" ||
    review !== "" ||
    ruleFollowed ||
    tradeDate !== getToday();

  const handleManualReset = () => {
    if (
      isFormDirty &&
      !window.confirm(
        "入力内容をリセットしますか？\n保存済みデータには影響しません。"
      )
    ) {
      return;
    }

    resetForm();
    setMessage("入力内容をリセットしました。");
  };

  const handleSave = () => {
    if (!target.trim()) {
      setMessage("対象を入力してください。");
      return;
    }

    const journalData: Journal = {
      id: editingId ?? Date.now(),
      category,
      target: target.trim(),

      marketEnvironment,
      marketTheme,
      majorEvent,

      amount,
      currency,
      shareCount,
      acquisitionPrice,
      profit,
      decision,
      reason,
      emotion,
      result,
      review,
      ruleFollowed,
      tradeDate,
    };

    if (editingId !== null) {
      setJournals((currentJournals) =>
        currentJournals.map((journal) =>
          journal.id === editingId ? journalData : journal
        )
      );

      setMessage("記録を更新しました！");
    } else {
      setJournals((currentJournals) => [
        journalData,
        ...currentJournals,
      ]);

      setMessage("保存しました！");
    }

    resetForm();
  };

  const handleEdit = (journal: ActiveJournal) => {
    setCategory(journal.category);
    setTarget(journal.target);

    setMarketEnvironment(journal.marketEnvironment || "未選択");
    setMarketTheme(journal.marketTheme || "未選択");
    setMajorEvent(journal.majorEvent || "未選択");

    setAmount(journal.amount ?? "");
    setCurrency(journal.currency);
    setShareCount(journal.shareCount);
    setAcquisitionPrice(journal.acquisitionPrice);
    setProfit(journal.profit);
    setDecision(journal.decision);
    setReason(journal.reason);
    setEmotion(journal.emotion);
    setResult(journal.result);
    setReview(journal.review);
    setRuleFollowed(journal.ruleFollowed);
    setTradeDate(journal.tradeDate);

    setEditingId(journal.id);
    setMessage("編集中です。内容を修正して「更新する」を押してください。");

    document.getElementById("new-entry")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleCancelEdit = () => {
    resetForm();
    setMessage("編集をキャンセルしました。");
  };

  const handleDelete = (id: number) => {
    setJournals((currentJournals) =>
      currentJournals.filter((journal) => journal.id !== id)
    );

    if (editingId === id) {
      resetForm();
    }

    setMessage("記録を削除しました。");
  };

  const activeJournals = journals.filter(
    (journal): journal is ActiveJournal => isTradeCategory(journal.category)
  );

  const journalDates = new Set(
    activeJournals.map((journal) => journal.tradeDate)
  );

  const filteredJournals = activeJournals.filter(
    (journal) =>
      (selectedDate === null || journal.tradeDate === selectedDate) &&
      (categoryFilter === "すべて" || journal.category === categoryFilter) &&
      (resultFilter === "すべて" || journal.result === resultFilter) &&
      (ruleFilter === "すべて" ||
        journal.ruleFollowed === (ruleFilter === "守った")) &&
      `
      ${journal.category}
      ${journal.target}
      ${journal.marketEnvironment}
      ${journal.marketTheme}
      ${journal.majorEvent}
      ${journal.decision}
      ${journal.reason}
      ${journal.review}
    `
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const selectedJournal = activeJournals.find(
    (journal) => journal.id === selectedTradeId
  );

  const hasActiveFilters =
    selectedDate !== null ||
    categoryFilter !== "すべて" ||
    resultFilter !== "すべて" ||
    ruleFilter !== "すべて";

  const handleClearFilters = () => {
    setCategoryFilter("すべて");
    setResultFilter("すべて");
    setRuleFilter("すべて");
    setSelectedDate(null);
  };

  const handleCalendarChange = (value: Value) => {
    if (value instanceof Date) {
      setSelectedDate(toDateKey(value));
    }
  };

  return (
    <main className="ios-app min-h-screen bg-[#060b16] px-4 py-20 sm:px-6 sm:py-12 lg:pl-[calc(16rem+1.5rem)]">
      <Sidebar />
      <div className="mx-auto max-w-6xl space-y-7 sm:space-y-9">
        <section className="ios-hero overflow-hidden rounded-2xl p-6 sm:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">Decision Performance</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Trade Journal</h1>

          <p className="mt-3 text-sm text-slate-400 sm:text-base">
            利益ではなく、良い意思決定を積み重ねる
          </p>
        </section>

        <div id="dashboard" className="scroll-mt-8">
          <Dashboard journals={activeJournals} onEdit={handleEdit} />
        </div>

        <Analytics journals={activeJournals} />

        <section id="new-entry" className="ios-card scroll-mt-8 rounded-2xl p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">
              {editingId !== null ? "記録を編集" : "新規記録"}
            </h2>

            <button
              type="button"
              onClick={handleManualReset}
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-transparent px-3.5 py-2 text-sm font-semibold text-slate-400 transition hover:border-slate-600 hover:bg-slate-800/60 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              aria-label="新規記録フォームをリセット"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              リセット
            </button>
          </div>

          {editingId !== null && (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-medium text-amber-300">
              編集モードです。修正後に「更新する」を押してください。
            </p>
          )}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block font-medium">種別</label>

              <select
                className="mt-1 w-full rounded border p-2"
                value={category}
                onChange={(e) => setCategory(e.target.value as TradeCategory)}
              >
                <option>株式</option>
                <option>FX</option>
              </select>
            </div>

            <div>
              <label className="block font-medium">日付</label>

              <input
                type="date"
                className="mt-1 w-full rounded border p-2"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium">対象</label>

              <input
                className="mt-1 w-full rounded border p-2"
                placeholder="例：TEAM、MSFT、USD/JPY"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium">市場環境</label>

              <select
                className="mt-1 w-full rounded border p-2"
                value={marketEnvironment}
                onChange={(e) => setMarketEnvironment(e.target.value)}
              >
                <option>未選択</option>
                <option>強気相場</option>
                <option>弱気相場</option>
                <option>暴落</option>
                <option>高ボラティリティ</option>
                <option>レンジ相場</option>
              </select>
            </div>

            <div>
              <label className="block font-medium">市場テーマ</label>

              <select
                className="mt-1 w-full rounded border p-2"
                value={marketTheme}
                onChange={(e) => setMarketTheme(e.target.value)}
              >
                <option>未選択</option>
                <option>AI</option>
                <option>半導体</option>
                <option>SaaS</option>
                <option>IPO</option>
                <option>宇宙</option>
                <option>防衛</option>
                <option>バイオ</option>
                <option>高配当</option>
                <option>エネルギー</option>
                <option>その他</option>
              </select>
            </div>

            <div>
              <label className="block font-medium">重要イベント</label>

              <select
                className="mt-1 w-full rounded border p-2"
                value={majorEvent}
                onChange={(e) => setMajorEvent(e.target.value)}
              >
                <option>未選択</option>
                <option>FOMC</option>
                <option>日銀会合</option>
                <option>CPI</option>
                <option>雇用統計</option>
                <option>決算</option>
                <option>選挙</option>
                <option>その他</option>
              </select>
            </div>

            <div>
              <label className="block font-medium">通貨</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                <option value="USD">USD</option>
                <option value="JPY">JPY</option>
              </select>
            </div>

            <div>
              <label className="block font-medium">株数</label>
              <input type="number" inputMode="decimal" min="0" step="any" placeholder="15" value={shareCount} onChange={(e) => setShareCount(e.target.value)} />
            </div>

            <div>
              <label className="block font-medium">取得単価</label>
              <input type="number" inputMode="decimal" min="0" step="0.01" placeholder={currency === "USD" ? "70.20" : "1500"} value={acquisitionPrice} onChange={(e) => setAcquisitionPrice(e.target.value)} />
            </div>

            <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-3">
              <p className="text-xs font-medium text-slate-400">投資額（株数 × 取得単価）</p>
              <p className="mt-1 text-xl font-semibold text-blue-200">{formatCurrency(calculateInvestment(shareCount, acquisitionPrice), currency) ?? "—"}</p>
            </div>

            <div>
              <label className="block font-medium">損益（円）</label>

              <input
                type="number"
                inputMode="numeric"
                step="1"
                className="mt-1 w-full rounded border p-2"
                placeholder="利益 10000 / 損失 -3500"
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium">勝敗</label>

              <select
                className="mt-1 w-full rounded border p-2"
                value={result}
                onChange={(e) => setResult(e.target.value)}
              >
                <option>未確定</option>
                <option>勝ち</option>
                <option>負け</option>
                <option>引き分け</option>
              </select>
            </div>

            <div className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/60 px-3">
              <input
                id="rule-followed"
                className="h-4 w-4 accent-sky-500"
                type="checkbox"
                checked={ruleFollowed}
                onChange={(e) => setRuleFollowed(e.target.checked)}
              />

              <label htmlFor="rule-followed" className="text-sm font-medium text-slate-300">
                ルールを守れた
              </label>
            </div>

            <div>
              <label className="block font-medium">判断</label>

              <select
                className="mt-1 w-full rounded border p-2"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
              >
                <option>買い</option>
                <option>売り</option>
                <option>見送り</option>
                <option>予想</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium">理由</label>

              <textarea
                className="mt-1 w-full rounded border p-2"
                rows={4}
                placeholder="なぜその判断をしたか"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium">心理状態</label>

              <select
                className="mt-1 w-full rounded border p-2"
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
              >
                <option>冷静</option>
                <option>様子見</option>
                <option>飛びつき</option>
                <option>不安</option>
                <option>自信あり</option>
                <option>リベンジ</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium">振り返り</label>

              <textarea
                className="mt-1 w-full rounded border p-2"
                rows={3}
                placeholder="例：利確、損切り、見送りで正解など"
                value={review}
                onChange={(e) => setReview(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button
                type="button"
                onClick={handleSave}
                className="min-h-11 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                {editingId !== null ? "更新する" : "保存"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="min-h-11 rounded-lg border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  編集をキャンセル
                </button>
              )}
            </div>

            {message && (
              <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 sm:col-span-2">{message}</p>
            )}
          </div>
        </section>

        <section id="calendar" className="ios-card scroll-mt-8 rounded-2xl p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">月間カレンダー</h2>
              <p className="mt-1 text-sm text-slate-500">
                印のある日には取引記録があります。
              </p>
            </div>

            {selectedDate !== null && (
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="min-h-10 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                すべて表示
              </button>
            )}
          </div>

          <div className="mt-5 flex justify-center rounded-xl border border-slate-800 bg-slate-950/50 p-2 sm:p-5">
            <Calendar
              locale="ja-JP"
              value={selectedDate ? fromDateKey(selectedDate) : null}
              onChange={handleCalendarChange}
              calendarType="gregory"
              tileContent={({ date, view }) =>
                view === "month" && journalDates.has(toDateKey(date)) ? (
                  <span
                    className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-sky-400"
                    aria-label="記録あり"
                  />
                ) : null
              }
            />
          </div>
        </section>

        <section id="journal-list" className="ios-card scroll-mt-8 rounded-2xl p-5 sm:p-7">
          {selectedJournal ? (
            <TradeDetail
              journal={selectedJournal}
              onBack={() => setSelectedTradeId(null)}
              onEdit={(journal) => {
                setSelectedTradeId(null);
                handleEdit(journal);
              }}
            />
          ) : (
          <>
          <div>
            <div>
              <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">記録一覧</h2>
              <p className="mt-1 text-sm text-slate-500" aria-live="polite">
                {activeJournals.length}件中 {filteredJournals.length}件を表示
              </p>
            </div>
          </div>

          {selectedDate !== null && (
            <p className="mt-2 text-sm font-medium text-sky-400">
              {selectedDate} の記録を表示中
            </p>
          )}

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-100">記録を絞り込む</h3>
              <button
                type="button"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                className="min-h-10 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                フィルターをクリア
              </button>
            </div>

            <input
              className="mt-4 w-full"
              placeholder="検索：TEAM、AI、FOMC、買い など"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
              <label htmlFor="category-filter">カテゴリ</label>
              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              >
                <option>すべて</option>
                <option>株式</option>
                <option>FX</option>
              </select>
              </div>

              <div>
              <label htmlFor="result-filter">結果</label>
              <select
                id="result-filter"
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value as ResultFilter)}
              >
                <option>すべて</option>
                <option>未確定</option>
                <option>勝ち</option>
                <option>負け</option>
              </select>
              </div>

              <div>
              <label htmlFor="rule-filter">ルール順守</label>
              <select
                id="rule-filter"
                value={ruleFilter}
                onChange={(e) => setRuleFilter(e.target.value as RuleFilter)}
              >
                <option>すべて</option>
                <option>守った</option>
                <option>守らなかった</option>
              </select>
              </div>
            </div>
          </div>

          {filteredJournals.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-700 p-8 text-center">
              <p className="font-semibold text-slate-300">条件に一致する記録がありません</p>
              <p className="mt-1 text-sm text-slate-500">検索語やフィルター条件を変更してお試しください。</p>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
              {filteredJournals.map((journal) => (
                <div
                  key={journal.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${journal.tradeDate} ${journal.category} ${journal.target}の詳細を表示`}
                  onClick={() => setSelectedTradeId(journal.id)}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      setSelectedTradeId(journal.id);
                    }
                  }}
                  className="cursor-pointer border-b border-slate-800 p-4 transition last:border-b-0 hover:bg-slate-800/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:p-5"
                >
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${categoryBadgeClass(journal.category)}`}>{journal.category}</span>
                        <p className="font-semibold text-slate-100">{journal.target}</p>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${resultBadgeClass(journal.result)}`}>{journal.result || "未確定"}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${journal.ruleFollowed ? "border-emerald-400/25 bg-emerald-500/15 text-emerald-300" : "border-rose-400/25 bg-rose-500/15 text-rose-300"}`}>
                          {journal.ruleFollowed ? "守った" : "守らなかった"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {journal.tradeDate}
                      </p>
                    </div>

                    <div className="flex w-full gap-2 sm:w-auto">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEdit(journal);
                        }}
                        className="min-h-10 flex-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20 sm:flex-none"
                      >
                        編集
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(journal.id);
                        }}
                        className="min-h-10 flex-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 sm:flex-none"
                      >
                        削除
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-x-6 gap-y-2 border-t border-slate-800 pt-4 text-sm text-slate-300 sm:grid-cols-2">
                    <p>
                      市場環境：
                      {journal.marketEnvironment || "未選択"}
                    </p>

                    <p>
                      市場テーマ：
                      {journal.marketTheme || "未選択"}
                    </p>

                    <p>
                      重要イベント：
                      {journal.majorEvent || "未選択"}
                    </p>

                    <p>
                      株数：{journal.shareCount ? `${journal.shareCount}株` : "未入力"}
                    </p>

                    <p>
                      取得単価：{formatCurrency(journal.acquisitionPrice, journal.currency) ?? "未入力"}
                    </p>

                    <p>
                      投資額：
                      {formatCurrency(calculateInvestment(journal.shareCount, journal.acquisitionPrice), journal.currency) ?? (journal.amount ? formatYen(journal.amount) : "未入力")}
                    </p>

                    <p>
                      損益：
                      {formatYen(journal.profit) ?? "未入力"}
                    </p>

                    <p>勝敗：{journal.result || "未確定"}</p>

                    <p>
                      ルール：
                      {journal.ruleFollowed
                        ? "⭕ 守れた"
                        : "❌ 守れなかった"}
                    </p>

                    <p>判断：{journal.decision}</p>
                    <p>心理状態：{journal.emotion}</p>
                    <p>理由：{journal.reason || "未入力"}</p>
                    <p>振り返り：{journal.review || "未入力"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          </>
          )}
        </section>
      </div>
    </main>
  );
}
