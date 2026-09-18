"use client";

import { useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import { createBackup, parseBackup, RECOVERY_KEY, restoreBackup, STORAGE_KEYS, type Backup } from "../lib/backup";

const labels = ["取引記録", "監視リスト", "仮想売買"];
const buttonClass = "min-h-12 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-500 disabled:opacity-50";

async function saveFile(backup: Backup, prefix = "trade-journal") {
  const file = new File([JSON.stringify(backup, null, 2)], `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "Trade Journal バックアップ" });
    return "共有メニューを閉じました。「ファイル」アプリなどの保存先にファイルがあることを確認してください。";
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "ダウンロードを開始しました。保存先にファイルがあることを確認してください。";
}

export default function BackupPage() {
  const [pending, setPending] = useState<Backup | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function exportData(recovery = false) {
    setBusy(true);
    setMessage("");
    try {
      const saved = recovery ? localStorage.getItem(RECOVERY_KEY) : null;
      if (recovery && !saved) throw new Error("復元前の退避データはまだありません。");
      setMessage(await saveFile(saved ? parseBackup(saved) : createBackup(localStorage), recovery ? "trade-journal-before-restore" : "trade-journal"));
    } catch (error) {
      setMessage(error instanceof Error && error.name === "AbortError" ? "書き出しをキャンセルしました。" : error instanceof Error ? error.message : "書き出しに失敗しました。");
    } finally { setBusy(false); }
  }

  async function selectFile(file?: File) {
    setPending(null);
    setConfirmed(false);
    setMessage("");
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("ファイルが大きすぎます。20MB以下のバックアップを選んでください。");
      setPending(parseBackup(await file.text()));
    } catch (error) { setMessage(error instanceof Error ? error.message : "ファイルを読み込めませんでした。"); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  function restore() {
    if (!pending || !confirmed) return;
    setBusy(true);
    try {
      restoreBackup(localStorage, pending);
      setPending(null);
      setConfirmed(false);
      setMessage("復元しました。メニューから記録を確認できます。復元前の記録も、この端末に1回分退避しています。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "復元できませんでした。端末の空き容量や保存設定を確認してください。"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <Sidebar />
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-24 lg:ml-64 lg:px-10 lg:pt-12">
        <h1 className="text-3xl font-semibold">バックアップ</h1>
        <p className="mt-3 leading-7 text-slate-400">この端末の取引記録・監視リスト・仮想売買を、まとめてファイルに保存します。</p>
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold">記録を書き出す</h2>
          <p className="mb-5 mt-3 leading-7 text-slate-400">iPhoneでは共有メニューの「ファイルに保存」から、iCloud Driveなどへ保存してください。自動バックアップではないため、定期的に書き出してください。</p>
          <button className={buttonClass} disabled={busy} onClick={() => void exportData()}>バックアップを書き出す</button>
        </section>
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold">ファイルから復元する</h2>
          <p className="mb-5 mt-3 leading-7 text-slate-400">このアプリで書き出したJSONファイルを選択してください。内容の確認後に復元します。</p>
          <label htmlFor="backup-file" className="mb-2 block text-sm text-slate-300">バックアップファイル</label>
          <input ref={fileInput} id="backup-file" type="file" accept=".json,application/json" disabled={busy} onChange={e => void selectFile(e.target.files?.[0])} className="block w-full min-w-0 text-sm text-slate-300 file:mr-3 file:min-h-12 file:rounded-xl file:border-0 file:bg-slate-700 file:px-4 file:text-white" />
          {pending && <div className="mt-6 rounded-xl border border-amber-500/40 p-4">
            <p className="break-words text-sm text-slate-300">書き出し日時：{new Date(pending.exportedAt).toLocaleString("ja-JP")}</p>
            <ul className="my-4 space-y-2">{STORAGE_KEYS.map((key, i) => <li key={key}>{labels[i]}：{pending.data[key].length}件</li>)}</ul>
            <p className="text-sm leading-6 text-amber-200">現在の3種類の記録を、ファイルの内容にすべて置き換えます。0件の項目は空になります。必要な記録は先に書き出してください。他のタブでこのアプリを開いている場合は閉じてください。</p>
            <label className="my-4 flex min-h-12 items-center gap-3"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="h-5 w-5 shrink-0" />現在の記録を置き換えることを確認しました</label>
            <div className="flex flex-wrap gap-3"><button className={buttonClass} disabled={busy || !confirmed} onClick={restore}>この内容で復元する</button><button className="min-h-12 rounded-xl border border-slate-600 px-5" disabled={busy} onClick={() => { setPending(null); setConfirmed(false); }}>キャンセル</button></div>
          </div>}
        </section>
        <p role="status" aria-live="polite" className="mt-5 whitespace-pre-wrap leading-7 text-blue-200">{message}</p>
        <button className="mt-4 min-h-12 text-sm text-slate-400 underline underline-offset-4" disabled={busy} onClick={() => void exportData(true)}>復元前の記録を書き出す</button>
        <p className="mt-2 text-xs leading-6 text-slate-500">退避は直前の1回分のみです。ブラウザのデータを消すと退避データも消えるため、外部のファイル保存も行ってください。</p>
      </main>
    </>
  );
}
