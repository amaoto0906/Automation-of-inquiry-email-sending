"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, CheckCircle2, Eye, EyeOff, LoaderCircle, Mail, ShieldCheck, User,
} from "lucide-react";

type Step = "form" | "verify" | "done";

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

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

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
    setStep("verify");
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
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
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "再送信に失敗しました。"); return; }
    setDevCode(data.devCode ?? null);
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
        <button type="button" className="register-back" onClick={() => setStep("form")}>
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
            className="otp-input" placeholder="000000"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required
          />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="login-button" disabled={loading || code.length !== 6}>
          {loading ? <LoaderCircle className="spin" size={19} /> : <ShieldCheck size={18} />}
          {loading ? "確認しています…" : "認証して申請する"}
        </button>
        <button type="button" className="link-button register-resend" onClick={resend} disabled={loading}>
          コードを再送信する
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
      <p className="demo-note">登録ボタンを押すとメールに6桁の確認コードが送信されます。</p>
      <p className="register-switch">すでにアカウントをお持ちですか？ <Link href="/login">ログイン</Link></p>
    </form>
  );
}
