"use client";

import { useEffect, useState } from "react";

type Journal = {
  id: number;
  category: string;
  target: string;
  marketEnvironment: string;
  amount: string;
  profit: string;
  decision: string;
  reason: string;
  emotion: string;
  result: string;
  review: string;
  ruleFollowed: boolean;
  createdAt: string;
};

export default function Home() {
  const [category, setCategory] = useState("株式");
  const [marketEnvironment, setMarketEnvironment] =
  useState("未選択");
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [profit, setProfit] = useState("");
  const [decision, setDecision] = useState("買い");
  const [reason, setReason] = useState("");
  const [emotion, setEmotion] = useState("冷静");
  const [result, setResult] = useState("未確定");
  const [review, setReview] = useState("");
  const [ruleFollowed, setRuleFollowed] = useState(false);
  const [tradeDate, setTradeDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [message, setMessage] = useState("");
  const [journals, setJournals] = useState<Journal[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("trade-journals");
    if (saved) setJournals(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("trade-journals", JSON.stringify(journals));
  }, [journals]);

  const handleSave = () => {
    if (!target.trim()) {
      setMessage("対象を入力してください");
      return;
    }

    const newJournal: Journal = {
      id: Date.now(),
      category,
      target,
      marketEnvironment,
      amount,
      profit,
      decision,
      reason,
      emotion,
      result,
      review,
      ruleFollowed,
      createdAt: tradeDate,
    };

    setJournals([newJournal, ...journals]);
    setTarget("");
    setMarketEnvironment("未選択");
    setAmount("");
    setProfit("");
    setReason("");
    setReview("");
    setResult("未確定");
    setRuleFollowed(false);
    setMessage("保存しました！");
  };

  const handleDelete = (id: number) => {
    setJournals(journals.filter((journal) => journal.id !== id));
  };

  const filteredJournals = journals.filter((journal) =>
    `${journal.category} ${journal.target} ${journal.decision} ${journal.reason} ${journal.review}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalAmount = journals.reduce((sum, journal) => {
    const num = Number(journal.amount);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const totalProfit = journals.reduce((sum, journal) => {
    const num = Number(journal.profit);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-xl bg-white p-6 shadow">
          <h1 className="text-3xl font-bold">Trade Journal</h1>
          <p className="mt-2 text-gray-600">
            利益ではなく、良い意思決定を積み重ねる
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">記録数</p>
            <p className="text-2xl font-bold">{journals.length}件</p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">投資金額合計</p>
            <p className="text-2xl font-bold">
              {totalAmount.toLocaleString()}円
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">損益合計</p>
            <p className="text-2xl font-bold">
              {totalProfit.toLocaleString()}円
            </p>
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">新規記録</h2>

          <div className="mt-5 space-y-4">
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
              <label className="block font-medium">投資金額</label>
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ruleFollowed}
                onChange={(e) => setRuleFollowed(e.target.checked)}
              />
              <label className="font-medium">ルールを守れた</label>
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

            <div>
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

            <div>
              <label className="block font-medium">振り返り</label>
              <textarea
                className="mt-1 w-full rounded border p-2"
                rows={3}
                placeholder="例：利確、損切り、的中、不的中、見送りで正解など"
                value={review}
                onChange={(e) => setReview(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="rounded bg-blue-600 px-4 py-2 font-bold text-white"
            >
              保存
            </button>

            {message && <p className="font-bold text-green-600">{message}</p>}
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">記録一覧</h2>

          <input
            className="mt-4 w-full rounded border p-2"
            placeholder="検索：TEAM、競馬、買い など"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {filteredJournals.length === 0 ? (
            <p className="mt-4 text-gray-500">記録がありません。</p>
          ) : (
            <div className="mt-4 space-y-4">
              {filteredJournals.map((journal) => (
                <div key={journal.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold">
                        {journal.category}｜{journal.target}
                      </p>
                      <p className="text-sm text-gray-500">
                        {journal.createdAt}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDelete(journal.id)}
                      className="rounded bg-red-500 px-3 py-1 text-sm font-bold text-white"
                    >
                      削除
                    </button>
                  </div>

                  <div className="mt-3 space-y-1 text-sm">
                    <p>投資金額：{journal.amount || "未入力"}</p>
                    <p>損益：{journal.profit || "未入力"}</p>
                    <p>勝敗：{journal.result || "未確定"}</p>
                    <p>
                      ルール：
                      {journal.ruleFollowed ? "⭕ 守れた" : "❌ 守れなかった"}
                    </p>
                    <p>
  市場環境：{journal.marketEnvironment || "未選択"}
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