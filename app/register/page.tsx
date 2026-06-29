import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { MousePointerClick, Search, Sheet, ShieldCheck, Sparkles } from "lucide-react";
import { RegisterForm } from "@/components/register-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export const metadata = { title: "新規登録" };

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="login-page">
      <ThemeToggle className="login-theme-toggle" />

      <div className="auth-card auth-card-wide">
        <aside className="auth-aside">
          <div className="login-brand">
            <Logo size={44} />
            <strong>Outreach Hub</strong>
          </div>

          <div className="auth-copy">
            <span className="showcase-label"><Sparkles size={14} /> Create your account</span>
            <h1>アカウントを作成して、<br />問い合わせ業務を始めましょう。</h1>
            <p>登録後、メールアドレスの確認と管理者の承認を経てご利用いただけます。会社情報は問い合わせ文面の差出人情報として利用されます。</p>
            <ul className="feature-list">
              <li><Search size={17} /><span>キーワードで問い合わせ先を自動収集</span></li>
              <li><ShieldCheck size={17} /><span>送信前確認で誤送信を防止</span></li>
              <li><MousePointerClick size={17} /><span>CAPTCHA検出時は手動確認へ</span></li>
              <li><Sheet size={17} /><span>送信結果をGoogleスプレッドシートへ同期</span></li>
            </ul>
          </div>

          <div className="showcase-security">
            <ShieldCheck size={16} />
            <span>2段階のメール認証と管理者承認で、安全に運用します。</span>
          </div>
        </aside>

        <section className="auth-form">
          <div className="login-card register-card">
            <p className="eyebrow">SIGN UP</p>
            <h2 className="register-title">新規登録</h2>
            <p className="login-description">必要な情報を入力してアカウントを申請します。</p>
            <RegisterForm />
          </div>
        </section>
      </div>
    </main>
  );
}
