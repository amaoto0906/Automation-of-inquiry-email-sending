import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { FileText, LockKeyhole, MousePointerClick, Search, Sheet, ShieldCheck, Sparkles } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "ログイン" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="login-page">
      <ThemeToggle className="login-theme-toggle" />

      <div className="auth-card">
        <aside className="auth-aside">
          <Image
            className="auth-art"
            src="/assets/generated/webp/login-security-visual.webp"
            alt=""
            width={1200}
            height={800}
            loading="lazy"
            quality={55}
            sizes="(max-width: 820px) 0px, 30vw"
            aria-hidden="true"
          />

          <div className="login-brand">
            <span><FileText size={22} /></span>
            <strong>Outreach Hub</strong>
          </div>

          <div className="auth-copy">
            <span className="showcase-label"><Sparkles size={14} /> Intelligent Outreach Control Center</span>
            <h1>問い合わせ送信業務を、<br />安全に、スマートに。</h1>
            <p>キーワード検索から問い合わせフォームの検出、送信前の確認、履歴管理まで。営業の問い合わせ業務をひとつの画面で完結します。</p>
            <ul className="feature-list">
              <li><Search size={17} /><span>キーワードで問い合わせ先を自動収集</span></li>
              <li><ShieldCheck size={17} /><span>送信前確認を必須化し、誤送信を防止</span></li>
              <li><MousePointerClick size={17} /><span>CAPTCHA検出時は手動確認へ自動振り分け</span></li>
              <li><Sheet size={17} /><span>送信結果をGoogleスプレッドシートへ同期</span></li>
            </ul>
          </div>

          <div className="showcase-security">
            <ShieldCheck size={16} />
            <span>すべての送信は、承認後にのみ実行される安全設計です。</span>
          </div>
        </aside>

        <section className="auth-form">
          <div className="login-card">
            <span className="login-lock"><LockKeyhole size={22} /></span>
            <p className="eyebrow">WELCOME BACK</p>
            <h2>管理画面へログイン</h2>
            <p className="login-description">登録済みのアカウントでサインインしてください。</p>
            <LoginForm />
            <div className="login-footer"><ShieldCheck size={14} />通信は暗号化され、安全に保護されています</div>
          </div>
        </section>
      </div>
    </main>
  );
}
