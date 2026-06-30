"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Mail, X } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.jp");
  const [password, setPassword] = useState("Outreach2026!");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // パスワードリセット申請モーダル
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotErr, setForgotErr] = useState("");

  function openForgot() {
    setForgotEmail(email);
    setForgotMsg("");
    setForgotErr("");
    setForgotOpen(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message);
      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ログインに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function submitForgot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForgotLoading(true);
    setForgotErr("");
    setForgotMsg("");
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message);
      setForgotMsg(data.message ?? "パスワードリセットの依頼を受け付けました。");
    } catch (caught) {
      setForgotErr(caught instanceof Error ? caught.message : "申請に失敗しました。");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <>
      <form className="login-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="email">メールアドレス</label>
          <div className="input-with-icon">
            <Mail size={18} />
            <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
        </div>
        <div className="field">
          <div className="label-row">
            <label htmlFor="password">パスワード</label>
            <button type="button" className="link-button" onClick={openForgot}>パスワードをお忘れですか？</button>
          </div>
          <div className="input-with-icon">
            <LockKeyhole size={18} />
            <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
            <button type="button" className="reveal" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="login-button" disabled={loading}>
          {loading ? <LoaderCircle className="spin" size={19} /> : <LockKeyhole size={18} />}
          {loading ? "確認しています…" : "安全にログイン"}
        </button>
        <p className="demo-note">デモ環境：入力済みの認証情報でログインできます</p>
        <p className="register-switch">アカウントをお持ちでない方は <Link href="/register">新規登録</Link></p>
      </form>

      {forgotOpen && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setForgotOpen(false); }}>
          <div className="modal-box panel">
            <div className="modal-header">
              <h2>パスワードの再設定を依頼</h2>
              <button type="button" onClick={() => setForgotOpen(false)} className="icon-btn" aria-label="閉じる"><X size={18} /></button>
            </div>
            {forgotMsg ? (
              <div className="modal-form">
                <div className="reset-done">
                  <span className="reset-done-icon"><CheckCircle2 size={26} /></span>
                  <p>{forgotMsg}</p>
                </div>
                <div className="modal-actions">
                  <button type="button" className="button button-primary" onClick={() => setForgotOpen(false)}>閉じる</button>
                </div>
              </div>
            ) : (
              <form className="modal-form" onSubmit={submitForgot}>
                <p className="action-description">登録済みのメールアドレスを入力してください。管理者が内容を確認のうえ、パスワードを再設定します。</p>
                <div className="field">
                  <label htmlFor="forgot-email">メールアドレス</label>
                  <div className="input-with-icon">
                    <Mail size={17} />
                    <input id="forgot-email" type="email" autoComplete="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.jp" />
                  </div>
                </div>
                {forgotErr && <p className="form-error" role="alert">{forgotErr}</p>}
                <div className="modal-actions">
                  <button type="submit" className="button button-primary" disabled={forgotLoading}>
                    {forgotLoading ? <LoaderCircle className="spin" size={16} /> : <KeyRound size={16} />}
                    リセットを依頼
                  </button>
                  <button type="button" className="button button-secondary" onClick={() => setForgotOpen(false)}>キャンセル</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
