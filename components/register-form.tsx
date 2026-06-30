"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, CheckCircle2, Clock, Eye, EyeOff, LoaderCircle, Mail, RefreshCw, ShieldCheck, User,
} from "lucide-react";

type Step = "form" | "verify" | "done";

// 有効期限まで残り（ミリ秒）を mm:ss に整形
function fmtRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

const RESEND_COOLDOWN_MS = 60_000;
const FALLBACK_TTL_MS = 10 * 60_000;

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", company: "", department: "", position: "", phone: "", email: "", password: "",
  });
  const [code, setCode] = useState("");

  // 確認コードの有効期限・再送信クールダウン（いずれもエポックms）
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowTs, setNowTs] = useState(() => Date.now());

  // verify ステップの間だけ1秒ごとに現在時刻を更新（カウントダウン駆動）
  useEffect(() => {
    if (step !== "verify") return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step]);

  const remainingMs = expiresAt != null ? Math.max(0, expiresAt - nowTs) : 0;
  const expired = expiresAt != null && remainingMs <= 0;
  const cooldownSec = Math.max(0, Math.ceil((cooldownUntil - nowTs) / 1000));

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // サーバーが返す expiresAt（ISO）を反映。無ければ既定の10分。
  function applyExpiry(iso?: string) {
    const ts = iso ? Date.parse(iso) : NaN;
    setExpiresAt(Number.isNaN(ts) ? Date.now() + FALLBACK_TTL_MS : ts);
    const now = Date.now();
    setNowTs(now);
    setCooldownUntil(now + RESEND_COOLDOWN_MS);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "登録に失敗しました。"); return; }
    setDevCode(data.devCode ?? null);
    setCode("");
    applyExpiry(data.expiresAt);
    setStep("verify");
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (expired) { setError("コードの有効期限が切れています。再送信してください。"); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, code }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "認証に失敗しました。"); return; }
    setStep("done");
  }

  async function resend() {
    if (cooldownSec > 0) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "再送信に失敗しました。");
      // サーバー側クールダウン（429）の場合は残り秒数を反映
      if (typeof data.retryAfter === "number") setCooldownUntil(Date.now() + data.retryAfter * 1000);
      return;
    }
    setDevCode(data.devCode ?? null);
    setCode("");
    applyExpiry(data.expiresAt);
  }

  function backToForm() {
    setStep("form");
    setError("");
    setCode("");
    setExpiresAt(null);
  }

  if (step === "done") {
    return (
      <div className="register-done">
        <span className="register-done-icon"><CheckCircle2 size={40} /></span>
        <h2>登録申請を受け付けました</h2>
        <p>メールアドレスの確認が完了しました。<br />管理者の承認後にログインいただけます。承認結果はメールでお知らせします。</p>
        <button className="login-button" onClick={() => router.push("/login")}>ログイン画面へ</button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <form className="login-form" onSubmit={submitCode}>
        <button type="button" className="register-back" onClick={backToForm}>
          <ArrowLeft size={15} /> 入力内容に戻る
        </button>
        <div className="register-verify-head">
          <span className="login-lock"><Mail size={22} /></span>
          <h2>確認コードを入力</h2>
          <p className="login-description"><strong>{form.email}</strong> 宛に6桁の確認コードを送信しました。</p>
        </div>
        {devCode && (
          <div className="dev-code-note">
            デモ環境のため、コードを画面に表示しています：<strong>{devCode}</strong>
          </div>
        )}
        <div className="field">
          <label htmlFor="code">確認コード（6桁）</label>
          <input
            id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            className="otp-input" placeholder="000000" disabled={expired}
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required
          />
        </div>
        {expired ? (
          <p className="verify-expired" role="alert">
            <Clock size={14} /> コードの有効期限が切れました。再送信してください。
          </p>
        ) : (
          <p className="verify-countdown">
            <Clock size={14} /> 有効期限まで <strong>{fmtRemaining(remainingMs)}</strong>
          </p>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="login-button" disabled={loading || code.length !== 6 || expired}>
          {loading ? <LoaderCircle className="spin" size={19} /> : <ShieldCheck size={18} />}
          {loading ? "確認しています…" : "認証して申請する"}
        </button>
        <button type="button" className="link-button register-resend" onClick={resend} disabled={loading || cooldownSec > 0}>
          <RefreshCw size={14} />
          {cooldownSec > 0 ? `再送信（${cooldownSec}秒後に可能）` : "コードを再送信する"}
        </button>
      </form>
    );
  }

  return (
    <form className="login-form register-fields" onSubmit={submitForm}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="r-name">氏名 <span className="req">必須</span></label>
          <div className="input-with-icon"><User size={17} />
            <input id="r-name" value={form.name} onChange={set("name")} placeholder="山田 太郎" required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="r-company">会社名 <span className="req">必須</span></label>
          <div className="input-with-icon"><Building2 size={17} />
            <input id="r-company" value={form.company} onChange={set("company")} placeholder="株式会社サンプル" required />
          </div>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="r-dept">部署</label>
          <input id="r-dept" value={form.department} onChange={set("department")} placeholder="営業部" />
        </div>
        <div className="field">
          <label htmlFor="r-pos">役職</label>
          <input id="r-pos" value={form.position} onChange={set("position")} placeholder="主任" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="r-phone">電話番号</label>
        <input id="r-phone" value={form.phone} onChange={set("phone")} placeholder="03-1234-5678" />
      </div>
      <div className="field">
        <label htmlFor="r-email">メールアドレス <span className="req">必須</span></label>
        <div className="input-with-icon"><Mail size={17} />
          <input id="r-email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.jp" required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="r-pw">パスワード <span className="req">必須</span></label>
        <div className="input-with-icon"><ShieldCheck size={17} />
          <input id="r-pw" type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} minLength={8} placeholder="8文字以上" required />
          <button type="button" className="reveal" onClick={() => setShowPw((v) => !v)} aria-label="パスワード表示切替">
            {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="login-button" disabled={loading}>
        {loading ? <LoaderCircle className="spin" size={19} /> : <Mail size={18} />}
        {loading ? "送信しています…" : "確認コードを送信して登録"}
      </button>
      <p className="demo-note">登録ボタンを押すとメールに6桁の確認コードが送信されます（有効期限10分）。</p>
      <p className="register-switch">すでにアカウントをお持ちですか？ <Link href="/login">ログイン</Link></p>
    </form>
  );
}
