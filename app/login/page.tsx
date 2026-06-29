import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CheckCircle2, FileText, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "ログイン" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="login-page">
      <ThemeToggle className="login-theme-toggle" />
      <section className="login-showcase">
        <div className="login-brand"><span><FileText size={23} /></span><strong>Outreach Hub</strong></div>
        <div className="showcase-copy">
          <span className="showcase-label"><Sparkles size={15} /> Intelligent Outreach Control Center</span>
          <h1>問い合わせ業務を、<br />もっと安全に、スマートに。</h1>
          <p>検索・フォーム検出・送信前確認・履歴管理をひとつのワークスペースで。</p>
          <div className="feature-list">
            <span><CheckCircle2 size={18} /> 送信前の安全チェック</span>
            <span><CheckCircle2 size={18} /> CAPTCHAは自動送信せず手動確認へ</span>
            <span><CheckCircle2 size={18} /> Googleスプレッドシート連携</span>
          </div>
        </div>
        <Image
          className="login-security-art"
          src="/assets/generated/webp/login-security-visual.webp"
          alt=""
          width={1200}
          height={800}
          loading="lazy"
          quality={55}
          sizes="(max-width: 900px) 0px, 42vw"
        />
        <div className="showcase-security"><ShieldCheck size={19} /><span><strong>安全設計</strong>すべての送信は承認後に実行されます</span></div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <span className="login-lock"><LockKeyhole size={23} /></span>
          <p className="eyebrow">WELCOME BACK</p>
          <h2>管理画面へログイン</h2>
          <p className="login-description">アカウント情報を入力してワークスペースを開きます。</p>
          <LoginForm />
          <div className="login-footer"><ShieldCheck size={15} />通信は暗号化され、安全に保護されています</div>
        </div>
      </section>
    </main>
  );
}
