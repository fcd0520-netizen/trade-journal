"use client";

import { useEffect, useState } from "react";

const KEY = "trade-journal-margin-risk-v1";
type Fields = { yen: string; usdCollateralYen: string; positionsUsd: string; marketValueUsd: string; fx: string; maintenance: string; newMargin: string };
const initial: Fields = { yen: "", usdCollateralYen: "", positionsUsd: "", marketValueUsd: "", fx: "", maintenance: "", newMargin: "" };
const names: {key:keyof Fields; label:string}[] = [
  {key:"yen",label:"円貨保証金（円）"}, {key:"usdCollateralYen",label:"外貨保証金の円換算額（円）"},
  {key:"positionsUsd",label:"信用買建額（USD）"}, {key:"marketValueUsd",label:"現在の建玉評価額（USD）"},
  {key:"fx",label:"ドル円（円/USD）"}, {key:"maintenance",label:"追証判定用保証金率（%）"},
  {key:"newMargin",label:"新規建保証金率（%）"},
];
const number = (s:string) => s.trim() === "" ? NaN : Number(s.replaceAll(",",""));
const yenFormat = (n:number) => Math.round(n).toLocaleString("ja-JP") + "円";
export default function MarginRiskCard() {
  const [fields,setFields] = useState<Fields>(initial);
  const [loaded,setLoaded] = useState(false);
  const [drop,setDrop] = useState(20);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const saved = parsed as Record<string,unknown>;
          const safe = {...initial};
          for (const {key} of names) if (typeof saved[key] === "string") safe[key] = saved[key] as string;
          setFields(safe);
        }
      }
    } catch { /* Invalid saved data: leave inputs blank. */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY,JSON.stringify(fields)); },[fields,loaded]);
  const collateral = number(fields.yen)+number(fields.usdCollateralYen);
  const exposure = number(fields.marketValueUsd)*number(fields.fx);
  const principal = number(fields.positionsUsd)*number(fields.fx);
  const valid = Number.isFinite(collateral) && collateral > 0 && Number.isFinite(exposure) && exposure >= 0 && Number.isFinite(principal) && principal >= 0 && number(fields.fx)>0;
  const loss = valid ? exposure*drop/100 : 0;
  const leverage = valid ? exposure/collateral : 0;
  const change = (key:keyof Fields,value:string) => setFields(old=>({...old,[key]:value}));
  return <section aria-labelledby="margin-risk-title" className="ios-card rounded-2xl p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Risk Monitor</p><h3 id="margin-risk-title" className="mt-1 text-lg font-semibold text-white">米国株信用リスク管理</h3></div>
      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">手入力・端末保存</span>
    </div>
    <p className="mt-2 text-xs leading-5 text-slate-400">楽天証券の表示値を入力してください。リアルタイム連携はありません。外貨保証金は画面に表示された円換算額を入力します。</p>
    <div className="mt-4 grid grid-cols-2 gap-3">
      {names.map(({key,label})=><label key={key} className={key==="marketValueUsd"?"col-span-2 sm:col-span-1":""}>
        <span className="mb-1 block text-xs text-slate-300">{label}</span>
        <input type="number" inputMode="decimal" min="0" step="any" value={fields[key]} onChange={e=>change(key,e.target.value)} placeholder="未入力" className="min-h-11 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-white outline-none focus:border-sky-400" />
      </label>)}
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-900/80 p-3">
      <div><p className="text-xs text-slate-400">現金保証金</p><p className="mt-1 text-lg font-semibold text-white">{Number.isFinite(collateral)?yenFormat(collateral):"—"}</p></div>
      <div><p className="text-xs text-slate-400">建玉時価 / 保証金</p><p className="mt-1 text-lg font-semibold text-white">{valid?leverage.toFixed(2)+"倍":"—"}</p></div>
      <div><p className="text-xs text-slate-400">追証判定用保証金率</p><p className="mt-1 text-xl font-semibold text-sky-300">{Number.isFinite(number(fields.maintenance))?fields.maintenance+"%":"—"}</p></div>
      <div><p className="text-xs text-slate-400">新規建保証金率</p><p className="mt-1 text-xl font-semibold text-white">{Number.isFinite(number(fields.newMargin))?fields.newMargin+"%":"—"}</p></div>
    </div>
    <div className="mt-5 border-t border-slate-800 pt-4">
      <div className="flex items-center justify-between"><h4 className="font-semibold text-white">一律下落シミュレーション</h4><span className="font-semibold text-rose-300">−{drop}%</span></div>
      <input aria-label="株価下落率" className="mt-4 w-full accent-sky-500" type="range" min="0" max="50" step="5" value={drop} onChange={e=>setDrop(Number(e.target.value))} />
      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-xs text-slate-400">想定追加損失（現在時価から）</p>
        <p className="mt-1 text-2xl font-semibold text-rose-300">{valid?"−"+yenFormat(loss):"必要な金額を入力"}</p>
        <p className="mt-1 text-xs text-slate-400">現金保証金比 {valid?(loss/collateral*100).toFixed(1)+"%":"—"}</p>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">簡易試算です。為替固定・全建玉同率下落を仮定。実際の追証発生率や維持率を予測するものではありません。信用金利・諸費用・保証金の拘束や証券会社の評価ルールは含みません。</p>
    </div>
  </section>;
}
