export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold">Trade Journal</h1>
        <p className="mt-2 text-gray-600">投資・競馬判断ログアプリ</p>

        <form className="mt-8 space-y-5">
          <div>
            <label className="block font-medium">種別</label>
            <select className="mt-1 w-full rounded border p-2">
              <option>株式</option>
              <option>FX</option>
              <option>競馬</option>
              <option>投資信託</option>
            </select>
          </div>

          <div>
            <label className="block font-medium">対象</label>
            <input
              className="mt-1 w-full rounded border p-2"
              placeholder="例：ALAB、TEAM、東京ダービー"
            />
          </div>

          <div>
            <label className="block font-medium">判断</label>
            <select className="mt-1 w-full rounded border p-2">
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
            />
          </div>

          <div>
            <label className="block font-medium">心理状態</label>
            <select className="mt-1 w-full rounded border p-2">
              <option>冷静</option>
              <option>少し焦り</option>
              <option>FOMO</option>
              <option>不安</option>
              <option>自信あり</option>
            </select>
          </div>

          <button
            type="button"
            className="rounded bg-blue-600 px-4 py-2 font-bold text-white"
          >
            保存
          </button>
        </form>
      </div>
    </main>
  );
}