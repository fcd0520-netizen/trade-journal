export default function LocalStorageStatus() {
  return (
    <div className="mt-6 border-t border-slate-800 pt-5">
      <p className="text-xs font-medium text-emerald-300">この端末に保存</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        記録はこのブラウザに保存されます。端末間の同期はありません。
        ブラウザのデータを削除すると記録も消えます。
      </p>
    </div>
  );
}
