import Link from "next/link";
import Sidebar from "../components/Sidebar";

export default function InstallPage() {
  return (
    <>
      <Sidebar />
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-24 lg:ml-64 lg:px-10 lg:pt-12">
        <h1 className="text-3xl font-semibold">ホーム画面に追加</h1>
        <p className="mt-3 leading-7 text-slate-400">Trade Journalを、ホーム画面のアイコンから開けます。ログインやApp Storeでのダウンロードは不要です。</p>
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold">まず、記録をバックアップ</h2>
          <p className="mt-3 leading-7 text-slate-400">追加する前に、普段使っているSafariで記録を書き出してください。ホーム画面から開いたときに記録が表示されない場合は、そのファイルから復元できます。</p>
          <Link href="/backup" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-500">バックアップを開く</Link>
        </section>
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold">iPhoneでの追加手順</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-6 leading-7 text-slate-300">
            <li>Safariで、いつも使っているTrade JournalのURLを開きます。</li>
            <li>共有メニューを開き、「ホーム画面に追加」を選びます。見当たらない場合は、メニューを下へスクロールしてください。</li>
            <li>「Webアプリとして開く」が表示された場合はオンにして、「追加」を押します。</li>
            <li>ホーム画面のTrade Journalアイコンを押し、記録を確認します。記録がなければ、メニューの「バックアップ」から保存したファイルを復元してください。</li>
          </ol>
        </section>
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold">使い始めたら</h2>
          <p className="mt-3 leading-7 text-slate-400">普段の記録はホーム画面のアプリに揃えてください。Safariとホーム画面のアプリで記録が自動同期されるとは限りません。定期的なバックアップも続けてください。</p>
          <p className="mt-3 leading-7 text-slate-400">アプリの起動・ページの読み込み・株価取得にはインターネット接続が必要です。</p>
          <p className="mt-3 text-sm leading-7 text-slate-500">AndroidやPCでは、ブラウザのメニューに表示される「アプリをインストール」または「ホーム画面に追加」を利用してください。</p>
        </section>
      </main>
    </>
  );
}
