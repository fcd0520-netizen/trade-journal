"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import type { Value } from "react-calendar/dist/shared/types.js";
import Dashboard from "./components/Dashboard";

type Journal = {
  id: number;
  category: string;
  target: string;

  marketEnvironment: string;
  marketTheme: string;
  majorEvent: string;

  amount: string;
  profit: string;
  decision: string;
  reason: string;
  emotion: string;
  result: string;
  review: string;
  ruleFollowed: boolean;
  tradeDate: string;
};

type StoredJournal = Partial<Journal> & { createdAt?: string };

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

export default function Home() {
  const [category, setCategory] = useState("株式");
  const [target, setTarget] = useState("");

  const [marketEnvironment, setMarketEnvironment] = useState("未選択");
  const [marketTheme, setMarketTheme] = useState("未選択");
  const [majorEvent, setMajorEvent] = useState("未選択");

  const [amount, setAmount] = useState("");
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

          amount: journal.amount ?? "",
          profit: journal.profit ?? "",
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

  const handleEdit = (journal: Journal) => {
    setCategory(journal.category);
    setTarget(journal.target);

    setMarketEnvironment(journal.marketEnvironment || "未選択");
    setMarketTheme(journal.marketTheme || "未選択");
    setMajorEvent(journal.majorEvent || "未選択");

    setAmount(journal.amount);
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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
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

  const journalDates = new Set(journals.map((journal) => journal.tradeDate));

  const filteredJournals = journals.filter(
    (journal) =>
      (selectedDate === null || journal.tradeDate === selectedDate) &&
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

  const handleCalendarChange = (value: Value) => {
    if (value instanceof Date) {
      setSelectedDate(toDateKey(value));
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/60 p-6 shadow-2xl shadow-black/20 sm:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">Decision Performance</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Trade Journal</h1>

          <p className="mt-3 text-sm text-slate-400 sm:text-base">
            利益ではなく、良い意思決定を積み重ねる
          </p>
        </section>

        <Dashboard journals={journals} />

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10 sm:p-7">
          <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">
            {editingId !== null ? "記録を編集" : "新規記録"}
          </h2>

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
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>株式</option>
                <option>FX</option>
                <option>競馬</option>
                <option>その他</option>
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
                placeholder="例：TEAM、MSFT、函館記念"
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
              <label className="block font-medium">
                投資金額（任意）
              </label>

              <input
                className="mt-1 w-full rounded border p-2"
                placeholder="例：50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium">損益</label>

              <input
                className="mt-1 w-full rounded border p-2"
                placeholder="例：10000 または -3500"
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

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10 sm:p-7">
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

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10 sm:p-7">
          <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">記録一覧</h2>

          {selectedDate !== null && (
            <p className="mt-2 text-sm font-medium text-sky-400">
              {selectedDate} の記録を表示中
            </p>
          )}

          <input
            className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            placeholder="検索：TEAM、AI、FOMC、買い など"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {filteredJournals.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">記録がありません。</p>
          ) : (
            <div className="mt-4 space-y-4">
              {filteredJournals.map((journal) => (
                <div
                  key={journal.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 sm:p-5"
                >
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                    <div>
                      <p className="font-semibold text-slate-100">
                        {journal.category}｜{journal.target}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {journal.tradeDate}
                      </p>
                    </div>

                    <div className="flex w-full gap-2 sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleEdit(journal)}
                        className="min-h-10 flex-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20 sm:flex-none"
                      >
                        編集
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(journal.id)}
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
                      投資金額：
                      {journal.amount
                        ? `${journal.amount}円`
                        : "未入力"}
                    </p>

                    <p>
                      損益：
                      {journal.profit
                        ? `${journal.profit}円`
                        : "未入力"}
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
        </section>
      </div>
    </main>
  );
}
