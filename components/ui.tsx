import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowRight, Inbox, LoaderCircle } from "lucide-react";
import type { OutreachStatus } from "@/lib/types";
import { statusLabels, statusTone } from "@/lib/types";

const pageVisuals: Record<string, string> = {
  "検索キーワード": "/assets/generated/webp/search-keyword-visual.webp",
  "キーワード詳細": "/assets/generated/webp/search-keyword-visual.webp",
  "検索結果": "/assets/generated/webp/url-collection-visual.webp",
  "問い合わせフォーム検出": "/assets/generated/webp/contact-detection-visual.webp",
  "送信履歴": "/assets/generated/webp/activity-log-visual.webp",
  "手動確認": "/assets/generated/webp/captcha-manual-visual.webp",
  "除外ルール": "/assets/generated/webp/exclude-list-visual.webp",
  "文面テンプレート": "/assets/generated/webp/message-template-visual.webp",
  "ユーザー管理": "/assets/generated/webp/multi-user-visual.webp",
  "設定": "/assets/generated/webp/settings-visual.webp",
  "スプレッドシート同期": "/assets/generated/webp/google-sheets-sync-visual.webp",
};

export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const visual = pageVisuals[title];
  return (
    <div className="page-title">
      <div className="page-title-copy">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="page-action">{action}</div>}
      {visual && (
        <Image className="page-title-visual" src={visual} alt="" width={180} height={120} sizes="180px" quality={60} loading="lazy" />
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: OutreachStatus }) {
  return (
    <span className={`status-badge status-${statusTone[status]}`}>
      <span aria-hidden="true" className="status-dot" />
      {statusLabels[status]}
    </span>
  );
}

export function StatCard({
  label,
  value,
  note,
  trend,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  note: string;
  trend?: string;
  icon: LucideIcon;
  tone?: "blue" | "indigo" | "emerald" | "amber";
}) {
  return (
    <article className={`stat-card stat-${tone} enter`}>
      <div className="stat-top">
        <span className="stat-icon"><Icon size={20} aria-hidden="true" /></span>
        {trend && <span className="trend">{trend}</span>}
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

export function EmptyState({
  image,
  title,
  description,
  action,
}: {
  image?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      {image ? (
        <Image src={image} alt="" width={320} height={240} className="empty-image" />
      ) : (
        <span className="empty-icon"><Inbox size={30} /></span>
      )}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label = "処理しています" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={22} />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="inline-alert danger" role="alert">
      <AlertTriangle size={20} />
      <div><strong>{title}</strong><p>{detail}</p></div>
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  link,
}: {
  title: string;
  description?: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {link && (
        <Link href={link.href} className="text-link">
          {link.label}<ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

export function UserAvatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  return <span className={`avatar avatar-${size}`} aria-hidden="true">{initials}</span>;
}
