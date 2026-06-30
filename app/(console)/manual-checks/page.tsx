import { AlertTriangle, Search, ShieldCheck } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, UserAvatar } from "@/components/ui";
import { manualChecks } from "@/lib/mock-data";

export const metadata = { title: "手動確認" };

export default function ManualChecksPage() {
  return (
    <>
      <PageTitle eyebrow="HUMAN REVIEW" title="手動確認" description="自動処理できなかった対象を、人の判断で安全に確認します。" />
      <div className="review-alert warning"><AlertTriangle size={23} /><div><strong>3件の確認が必要です</strong><p>CAPTCHAや重複履歴がある対象は、自動送信されません。内容を確認して対応を選択してください。</p></div></div>
      <article className="panel">
        <div className="table-toolbar"><div className="search-input"><Search size={17} /><input placeholder="企業名・理由を検索" aria-label="手動確認を検索" /></div><div className="filter-chips compact"><button className="active">未対応 3</button><button>対応済み 26</button></div></div>
        <div className="manual-list">
          {manualChecks.map((item, index) => (
            <div className="manual-item" key={item.company}>
              <span className={`priority priority-${item.priority === "高" ? "high" : "medium"}`}>{item.priority}</span>
              <div className="manual-copy"><h3>{item.company}</h3><p><ShieldCheck size={15} />{item.reason}</p><small>検出：{item.date}</small></div>
              <div className="assigned"><span>担当者</span><div>{item.owner !== "未割当" && <UserAvatar initials={item.owner.slice(0, 1)} size="sm" />}{item.owner}</div></div>
              <ActionButton href={`/review/${index === 0 ? "captcha-001" : `manual-${index + 1}`}`} variant="primary">内容を確認</ActionButton>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}
