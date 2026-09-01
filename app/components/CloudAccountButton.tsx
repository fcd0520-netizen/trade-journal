"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";

export default function CloudAccountButton() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const signOut = async () => {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
  };

  return (
    <div className="mt-6 border-t border-slate-800 pt-5">
      <p className="truncate text-xs text-slate-500" title={email}>{email || "クラウド同期中"}</p>
      <button type="button" onClick={signOut} className="mt-3 min-h-11 w-full rounded-xl border border-slate-700 px-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">
        ログアウト
      </button>
    </div>
  );
}

