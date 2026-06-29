import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CircleCheckBig, LockKeyhole, ScanSearch, Search, ShieldCheck, Sparkles } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export const metadata = { title: "ログイン" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="login-page">
      <ThemeToggle className="login-theme-toggle" />

      <div className="auth-card">
        <aside className="auth-aside">
          <div className="login-brand">
            <Logo size={44} />
            <strong>Outreach Hub</strong>
          </div>

          <div className="auth-copy">
            <span className="showcase-label"><Sparkles size={14} /> Intelligent Outreach Control Center</span>
            <h1>見込み企業との接点を、<br />3ステップで見つける。</h1>
            <p>キーワード検索からフォーム検出、送信前確認まで。Outreach Hubなら、問い合わせ業務を安全にひとつの流れへまとめられます。</p>

            <section className="login-walkthrough" aria-label="Outreach Hubの利用方法">
              <div className="walkthrough-slides">
                <article className="walkthrough-stage walkthrough-stage-1">
                  <div className="walkthrough-visual">
                    <Image
                      src="/assets/generated/webp/login-step-google-search.webp"
                      alt="Googleで「製造業 東京」と検索し、候補企業を探している画面"
                      width={960}
                      height={720}
                      preload
                      sizes="(max-width: 820px) calc(100vw - 88px), 430px"
                    />
                    <span className="walkthrough-sheen" aria-hidden="true" />
                  </div>
                  <div className="walkthrough-caption">
                    <span className="walkthrough-number">01</span>
                    <div>
                      <strong><Search size={16} />キーワードでGoogle検索</strong>
                      <p>業種や地域を入力して、見込み企業をまとめて探します。</p>
                    </div>
                  </div>
                </article>

                <article className="walkthrough-stage walkthrough-stage-2">
                  <div className="walkthrough-visual">
                    <Image
                      src="/assets/generated/webp/login-step-form-detection.webp"
                      alt="企業サイトを解析し、お問い合わせフォームを自動検出している画面"
                      width={960}
                      height={720}
                      loading="lazy"
                      sizes="(max-width: 820px) calc(100vw - 88px), 430px"
                    />
                    <span className="walkthrough-scan" aria-hidden="true" />
                  </div>
                  <div className="walkthrough-caption">
                    <span className="walkthrough-number">02</span>
                    <div>
                      <strong><ScanSearch size={16} />フォームを自動で発見</strong>
                      <p>候補サイトを巡回し、お問い合わせ窓口を見つけます。</p>
                    </div>
                  </div>
                </article>

                <article className="walkthrough-stage walkthrough-stage-3">
                  <div className="walkthrough-visual">
                    <Image
                      src="/assets/generated/webp/login-step-safe-send.webp"
                      alt="問い合わせ内容を確認して安全に送信し、結果を記録した画面"
                      width={960}
                      height={720}
                      loading="lazy"
                      sizes="(max-width: 820px) calc(100vw - 88px), 430px"
                    />
                    <span className="walkthrough-success-pulse" aria-hidden="true" />
                  </div>
                  <div className="walkthrough-caption">
                    <span className="walkthrough-number">03</span>
                    <div>
                      <strong><CircleCheckBig size={16} />確認して、安全に送信</strong>
                      <p>内容を承認してから送信し、結果を自動で記録します。</p>
                    </div>
                  </div>
                </article>
              </div>

              <div className="walkthrough-progress" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </section>
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
