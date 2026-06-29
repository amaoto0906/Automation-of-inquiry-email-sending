"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.jp");
  const [password, setPassword] = useState("Outreach2026!");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
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
          <button type="button" className="link-button">パスワードをお忘れですか？</button>
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
  );
}
