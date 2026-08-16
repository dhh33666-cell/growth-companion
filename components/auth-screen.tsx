"use client";

import { ArrowUpRight, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export function AuthScreen({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else { setSent(true); setMessage("确认邮件已发送。请点击邮件里的 Confirm email address 链接完成登录。"); }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card panel">
        <div className="brand-mark"><div className="brand-orbit">✦</div><div><div className="brand-title">成长秘书</div><div className="brand-subtitle">REAL LIFE RPG / PRIVATE ACCESS</div></div></div>
        <div className="eyebrow">AUTHENTICATION</div>
        <h1>进入你的任务世界</h1>
        <p className="topbar-copy">使用邮箱验证码登录，所有成长数据只属于你。</p>
        <form onSubmit={sendCode} className="auth-form">
          <label className="field"><span>邮箱地址</span><div className="input-with-icon"><Mail size={15} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div></label>
          {!sent && <button className="btn primary auth-submit" disabled={busy}>{busy ? "发送中..." : "发送确认邮件"}</button>}
        </form>
        {message && <div className="auth-message"><ShieldCheck size={14} /> {message}</div>}
        {sent && <div className="auth-next"><ArrowUpRight size={15} /><span>完成确认后，浏览器会自动返回成长秘书。</span><button className="btn ghost" onClick={() => { setSent(false); setMessage(""); }}>重新发送</button></div>}
      </section>
    </main>
  );
}
