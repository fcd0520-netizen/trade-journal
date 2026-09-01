"use client";

import type { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

const STORAGE_KEYS = [
  "trade-journals",
  "trade-journal-watchlist",
  "paper-trades",
] as const;

async function syncInitialData(userId: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabaseが設定されていません。");

  const { data, error } = await supabase
    .from("app_data")
    .select("storage_key,payload")
    .eq("user_id", userId);

  if (error) throw error;
  const cloud = new Map((data ?? []).map((row) => [row.storage_key, row.payload]));

  for (const storageKey of STORAGE_KEYS) {
    if (cloud.has(storageKey)) {
      localStorage.setItem(storageKey, JSON.stringify(cloud.get(storageKey)));
      continue;
    }

    const saved = localStorage.getItem(storageKey);
    if (!saved) continue;

    let payload: unknown;
    try {
      payload = JSON.parse(saved);
    } catch {
      continue;
    }

    const { error: migrationError } = await supabase.from("app_data").upsert({
      user_id: userId,
      storage_key: storageKey,
      payload,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,storage_key" });
    if (migrationError) throw migrationError;
  }
}

function LoadingCard({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="ios-card w-full max-w-md rounded-2xl p-7 text-center">
        <p className="text-sm font-semibold text-blue-300">Trade Journal</p>
        <p className="mt-3 text-slate-300">{message}</p>
      </div>
    </main>
  );
}

export default function CloudDataProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured());
  const [dataReady, setDataReady] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setDataReady(false);
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    let active = true;
    void Promise.resolve()
      .then(() => {
        if (active) setMessage("");
        return syncInitialData(session.user.id);
      })
      .then(() => {
        if (active) setDataReady(true);
      })
      .catch(() => {
        if (active) setMessage("クラウド保存の初期設定を完了できませんでした。");
      });
    return () => { active = false; };
  }, [session]);

  const sendMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase || !email.trim()) return;

    setSending(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    setMessage(error ? "ログインメールを送信できませんでした。" : "ログイン用リンクをメールで送りました。");
  };

  if (!isSupabaseConfigured()) {
    return <LoadingCard message="クラウド保存の接続設定を確認しています。" />;
  }
  if (!authReady) return <LoadingCard message="ログイン状態を確認しています…" />;

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <section className="ios-card w-full max-w-md rounded-2xl p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">Trade Journal</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">ログイン</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">記録を安全にクラウドへ保存します。メールに届くリンクからログインしてください。</p>
          <form onSubmit={sendMagicLink} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="text-sm font-medium text-slate-300">メールアドレス</label>
              <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="mt-2 w-full" />
            </div>
            <button type="submit" disabled={sending} className="min-h-12 w-full rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
              {sending ? "送信中…" : "ログインリンクを送る"}
            </button>
          </form>
          {message && <p className="mt-4 text-sm text-blue-200" role="status">{message}</p>}
        </section>
      </main>
    );
  }

  if (!dataReady) return <LoadingCard message={message || "保存データを同期しています…"} />;
  return children;
}
