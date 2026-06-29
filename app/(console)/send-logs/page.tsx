import { Download, Search, Send } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, StatusBadge, UserAvatar } from "@/components/ui";
import { recentLogs } from "@/lib/mock-data";

export const metadata = { title: "送信履歴" };

export default function SendLogsPage() {
  const logs = [...recentLogs, { company: "株式会社ライトパス", domain: "lightpath.example", user: "山田 太郎", date: "昨日 16:08", status: "sent" as const }];
  return (
    <>
      <PageTitle eyebrow="DELIVERY HISTORY" title="送信履歴" description="送信結果・担当者・同期状態を時系列で確認できます。" action={<ActionButton variant="secondary" icon={<Download size={16} />}>履歴をCSV出力</ActionButton>} />
      <section className="mini-stats">
        <div><span className="mini-icon green"><Send size={18} /></span><p>送信成功<strong>98</strong></p></div>
        <div><span className="mini-icon red">!</span><p>送信失敗<strong>4</strong></p></div>
        <div><span className="mini-icon amber">?</span><p>手動確認<strong>12</strong></p></div>
        <div><span className="mini-icon blue">✓</span><p>成功率<strong>96.1%</strong></p></div>
      </section>
      <article className="panel">
        <div className="table-toolbar"><div className="search-input"><Search size={17} /><input placeholder="企業名・ドメインを検索" aria-label="送信履歴を検索" /></div><div className="toolbar-actions"><input type="date" aria-label="開始日" defaultValue="2026-06-01" /><select aria-label="送信状態"><option>すべての状態</option><option>送信成功</option><option>送信失敗</option><option>手動確認</option></select></div></div>
        <div className="table-wrap">
          <table><thead><tr><th>送信先</th><th>担当者</th><th>送信日時</th><th>送信状態</th><th>シート同期</th><th>操作</th></tr></thead>
            <tbody>{logs.map((log) => <tr key={`${log.domain}-${log.date}`}><td><div className="primary-cell"><strong>{log.company}</strong><span>{log.domain}</span></div></td><td><div className="person-cell"><UserAvatar initials={log.user.slice(0, 1)} size="sm" />{log.user}</div></td><td>{log.date}</td><td><StatusBadge status={log.status} /></td><td><StatusBadge status={log.status === "failed" ? "sheet_sync_failed" : "sheet_synced"} /></td><td><button className="text-link">詳細</button></td></tr>)}</tbody>
          </table>
        </div>
      </article>
    </>
  );
}
