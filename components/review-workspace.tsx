"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ActionButton } from "./action-button";
import { StatusBadge } from "./ui";

const fields = [
  ["会社名", "株式会社オルタナティブ"],
  ["お名前", "佐藤 美咲"],
  ["メールアドレス", "misaki.sato@example.jp"],
  ["電話番号", "03-1234-5678"],
  ["件名", "業務効率化のご提案について"],
];

const DEFAULT_MESSAGE = `株式会社ネクサス
ご担当者様

突然のご連絡失礼いたします。株式会社オルタナティブの佐藤と申します。

貴社のWebサイトを拝見し、弊社の業務自動化支援がお役に立てるのではないかと思い、ご連絡いたしました。

弊社では、日々の定型業務を安全に効率化するシステムの設計・開発を行っております。ご関心がございましたら、15分ほどオンラインでご説明の機会をいただけますと幸いです。

何卒よろしくお願いいたします。

株式会社オルタナティブ
佐藤 美咲
03-1234-5678`;

export function ReviewWorkspace({ targetId }: { targetId: string }) {
  const hasCaptcha = targetId.includes("captcha") || targetId.endsWith("2");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [sending, setSending] = useState(false);
  const [completed, setCompleted] = useState<"sent" | "manual" | "excluded" | null>(null);
  const canSend = confirmed && !hasCaptcha && !sending && !completed;
  const safetyItems = useMemo(() => [
    { label: "除外ルール", detail: "該当なし", ok: true },
    { label: "営業禁止文言", detail: "検出なし", ok: true },
    { label: "過去90日の送信", detail: "履歴なし", ok: true },
    { label: "CAPTCHA", detail: hasCaptcha ? "検出あり" : "検出なし", ok: !hasCaptcha },
  ], [hasCaptcha]);

  async function send() {
    if (!canSend) return;
    setSending(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setCompleted("sent");
    setSending(false);
  }

  if (completed) {
    const copy = {
      sent: ["送信処理を受け付けました", "送信結果は履歴とGoogleスプレッドシートへ記録されます。"],
      manual: ["手動確認リストへ移動しました", "担当者が内容を確認できるよう、理由と解析結果を保存しました。"],
      excluded: ["この対象を除外しました", "同一ドメインは今後の検索・送信候補から除外されます。"],
    }[completed];
    return (
      <div className="completion-card enter">
        <span><CheckCircle2 size={36} /></span><p className="eyebrow">ACTION COMPLETED</p><h1>{copy[0]}</h1><p>{copy[1]}</p>
        <div className="button-row"><ActionButton href="/contact-pages">次の対象を確認</ActionButton><ActionButton href="/send-logs" variant="secondary">履歴を確認</ActionButton></div>
      </div>
    );
  }

  return (
    <>
      <Link href="/contact-pages" className="back-link"><ArrowLeft size={16} />フォーム検出一覧へ戻る</Link>
      <div className="review-heading">
        <div><p className="eyebrow">PRE-SEND REVIEW</p><h1>送信前確認</h1><p>対象サイトと送信内容を確認し、安全チェック完了後に送信してください。</p></div>
        <StatusBadge status={hasCaptcha ? "captcha_detected" : "pending"} />
        <Image className="review-heading-art" src="/assets/generated/webp/review-screen-visual.webp" alt="" width={180} height={120} sizes="180px" />
      </div>

      {hasCaptcha && (
        <div className="review-alert danger" role="alert">
          <ShieldAlert size={25} />
          <div><strong>CAPTCHAが検出されたため、自動送信は行いません</strong><p>内容を確認し、「手動確認にする」を選択してください。CAPTCHAを回避する処理は実行されません。</p></div>
        </div>
      )}

      <section className="review-grid">
        <div className="review-main">
          <article className="panel target-card">
            <div className="section-header"><div><p className="eyebrow">TARGET WEBSITE</p><h2>送信先情報</h2></div><a href="https://nexus-example.jp/contact" className="text-link">サイトを開く<ExternalLink size={14} /></a></div>
            <div className="target-profile">
              <span className="company-logo">N</span>
              <div><h3>株式会社ネクサス</h3><a href="https://nexus-example.jp">nexus-example.jp</a></div>
            </div>
            <dl className="target-details"><div><dt>問い合わせページ</dt><dd>/contact</dd></div><div><dt>検索キーワード</dt><dd>東京 Web制作会社</dd></div><div><dt>検出日時</dt><dd>2026/06/29 13:37</dd></div></dl>
          </article>

          <article className="panel">
            <div className="section-header"><div><p className="eyebrow">FORM PREVIEW</p><h2>入力予定内容</h2></div><span className="detected-label"><Check size={14} /> 7項目を検出</span></div>
            <div className="field-preview-grid">
              {fields.map(([label, value]) => <div className="preview-field" key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          </article>

          <article className="panel message-panel">
            <div className="section-header">
              <div><p className="eyebrow">MESSAGE</p><h2>問い合わせ文面</h2></div>
              <div className="message-tools">
                <span className="template-chip"><FileText size={14} />標準営業テンプレート v2</span>
                <button type="button" className="text-link" onClick={() => setMessage(DEFAULT_MESSAGE)} disabled={message === DEFAULT_MESSAGE}><RotateCcw size={13} />元に戻す</button>
              </div>
            </div>
            <textarea
              className="message-editor"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={14}
              spellCheck={false}
              aria-label="問い合わせ文面"
            />
            <p className="message-edit-hint"><Pencil size={12} />送信前に文面を直接編集できます。{`${message.length}`}文字</p>
          </article>
        </div>

        <aside className="review-side">
          <article className="panel safety-check-panel">
            <div className="safety-title"><span><ShieldCheck size={22} /></span><div><h2>安全チェック</h2><p>送信前の自動検証結果</p></div></div>
            <ul>
              {safetyItems.map((item) => <li key={item.label} className={item.ok ? "" : "unsafe"}><span>{item.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</span><div><strong>{item.label}</strong><small>{item.detail}</small></div></li>)}
            </ul>
            <div className={`safety-result ${hasCaptcha ? "blocked" : ""}`}><strong>{hasCaptcha ? "自動送信できません" : "安全チェック完了"}</strong><span>{hasCaptcha ? "手動確認が必要です" : "すべての確認項目を通過しました"}</span></div>
          </article>

          <article className="panel approval-panel">
            <label className={`confirm-check ${hasCaptcha ? "disabled" : ""}`}>
              <input type="checkbox" checked={confirmed} disabled={hasCaptcha} onChange={(event) => setConfirmed(event.target.checked)} />
              <span><Check size={15} /></span>
              <p><strong>送信内容を確認しました</strong><small>対象・文面・安全チェックを確認済みです</small></p>
            </label>
            <ActionButton onClick={send} disabled={!canSend} loading={sending} icon={sending ? <LoaderCircle size={17} /> : <Send size={17} />}>{sending ? "安全に送信しています…" : "この内容で送信する"}</ActionButton>
            <div className="secure-note"><LockKeyhole size={14} />確認チェック後に送信できます</div>
            <div className="divider"><span>または</span></div>
            <ActionButton variant="secondary" onClick={() => setCompleted("manual")} icon={<UserRound size={16} />}>手動確認にする</ActionButton>
            <ActionButton variant="ghost" onClick={() => setCompleted("excluded")} icon={<Ban size={16} />}>この対象を除外する</ActionButton>
          </article>
        </aside>
      </section>
    </>
  );
}
