"use client";

import { useEffect, useRef, useState } from "react";
import { prepareReview, readSavedReview, reviewResponseSchema, type SavedReview } from "../lib/ai-review";
import type { ActiveJournal } from "../types/journal";

const button = "min-h-12 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50";

export default function AiTradeReview({ journal, onSave }: {
  journal: ActiveJournal; onSave: (id: number, review: SavedReview) => void;
}) {
  const source = JSON.stringify(prepareReview(journal));
  // Changing the source cancels any request for the previous record.
  return <ReviewPanel key={`${journal.id}:${source}`} journal={journal} source={source} onSave={onSave} />;
}

function ReviewPanel({ journal, source, onSave }: {
  journal: ActiveJournal; source: string; onSave: (id: number, review: SavedReview) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [consent, setConsent] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(() => readSavedReview(journal.aiReview));
  const activeRequest = useRef<AbortController | null>(null);
  const stale = saved && saved.source !== source;
  const input = JSON.parse(source) as ReturnType<typeof prepareReview>;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ai-review", { signal: controller.signal, cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(value => { if (!controller.signal.aborted) setEnabled(value?.enabled === true); })
      .catch(() => { if (!controller.signal.aborted) setEnabled(false); });
    return () => { controller.abort(); activeRequest.current?.abort(); };
  }, []);

  async function generate() {
    if (!consent || busy || activeRequest.current || !enabled) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/ai-review", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: source,
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(35_000)]),
      });
      const value: unknown = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        const reason = value && typeof value === "object" && "error" in value && typeof value.error === "string" ? value.error : "AIの応答を取得できませんでした。";
        throw new Error(reason);
      }
      const result: SavedReview = { ...reviewResponseSchema.parse(value), version: 1, source };
      setSaved(result); setExpanded(false); setConsent(false);
      try { onSave(journal.id, result); }
      catch { setMessage("コメントを表示しましたが、端末に保存できませんでした。必要な内容を控えてください。"); }
    } catch (cause) {
      if (!controller.signal.aborted) setMessage(cause instanceof Error && cause.name === "TimeoutError" ? "応答に時間がかかっています。時間をおいてお試しください。" : cause instanceof Error ? cause.message : "通信できませんでした。");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      activeRequest.current = null;
    }
  }

  return <section aria-labelledby="ai-review-title" className="min-w-0 rounded-2xl border border-blue-400/20 bg-blue-500/5 p-4 sm:p-6">
    <h3 id="ai-review-title" className="text-base font-semibold text-slate-100">AIで振り返る</h3>
    <p className="mt-2 text-sm leading-6 text-slate-400">この取引の判断・ルール・次の一歩を短く振り返ります。</p>
    {saved && <div className="mt-4 space-y-4">
      {stale && <p className="text-sm text-amber-200">記録が変更されています。以下は変更前の内容へのコメントです。</p>}
      {([["judgment", "判断の振り返り"], ["discipline", "ルールの確認"], ["nextStep", "次に意識すること"]] as const).map(([key, title]) => <div key={key}>
        <h4 className="text-sm font-semibold text-blue-200">{title}</h4><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">{saved.review[key]}</p>
      </div>)}
      <p className="break-words text-xs text-slate-500">{new Date(saved.createdAt).toLocaleString("ja-JP")} · {saved.model}</p>
      <p className="text-xs leading-5 text-slate-500">AIのコメントには誤りが含まれることがあります。記録と照らして振り返りに使ってください。</p>
    </div>}
    {enabled === false && <p role="status" className="mt-4 text-sm leading-6 text-slate-400">AI振り返りは準備中です。保存済みのコメントは読み返せます。</p>}
    {!expanded && <button type="button" className={`${button} mt-4`} disabled={!enabled} onClick={() => setExpanded(true)}>{saved ? "もう一度振り返る" : "送る内容を確認する"}</button>}
    {expanded && <div className="mt-4 space-y-4">
      <p className="text-sm leading-6 text-slate-300">表示した1件をVercel AI Gateway経由でOpenAIへ送信します。数量・価格・口座残高は送信しません。自由記入欄に個人情報がないか確認してください。</p>
      <details className="min-w-0 rounded-xl border border-slate-700 p-3">
        <summary className="cursor-pointer text-sm text-blue-200">送信する記録：{input.target || "名称未入力"}</summary>
        <dl className="mt-3 space-y-3 text-sm">
          {[["取引", `${input.category} / ${input.decision} / ${input.tradeDate}`], ["状態・結果", `${input.status} / ${input.result}`], ["市場環境・テーマ・イベント", `${input.marketEnvironment} / ${input.marketTheme} / ${input.majorEvent}`], ["売買理由", input.reason], ["感情", input.emotion], ["ルールを守れた（自己申告）", input.ruleFollowed ? "はい" : "いいえ"], ["振り返り", input.review]].map(([label, value]) => <div key={label}><dt className="text-slate-400">{label}</dt><dd className="whitespace-pre-wrap break-words text-slate-200">{value || "未入力"}</dd></div>)}
          <div><dt className="text-slate-400">直近の決済（最大3件）</dt><dd className="space-y-2 whitespace-pre-wrap break-words text-slate-200">{input.recentSettlements.length ? input.recentSettlements.map((s, i) => <p key={i}>{s.date} / {s.outcome}<br />理由：{s.reason || "未入力"}<br />感情：{s.emotion || "未入力"}<br />振り返り：{s.review || "未入力"}</p>) : "なし"}</dd></div>
        </dl>
      </details>
      <p className="text-xs leading-5 text-slate-500">理由と振り返りは各1,000文字、決済の文章は各300文字まで送信します。省略する過去の決済：{input.omittedSettlements}件。送信は自動では行いません。</p>
      <label className="flex min-h-12 items-center gap-3 text-sm text-slate-200"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} className="h-5 w-5 shrink-0" />この内容をAIへ送ることを確認しました</label>
      <div className="flex flex-wrap gap-3"><button type="button" className={button} disabled={!consent || busy || !enabled} onClick={() => void generate()}>{busy ? "振り返りを作成中…" : "AIへ送って振り返る"}</button><button type="button" disabled={busy} className="min-h-12 rounded-xl border border-slate-700 px-4 text-sm text-slate-300" onClick={() => { setExpanded(false); setConsent(false); }}>キャンセル</button></div>
      <p className="text-xs leading-5 text-slate-500">利用回数には上限があります。失敗時は自動で再送しません。</p>
    </div>}
    <p role="status" aria-live="polite" className="mt-3 text-sm leading-6 text-amber-200">{message}</p>
  </section>;
}
