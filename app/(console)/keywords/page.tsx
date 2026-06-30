import Link from "next/link";
import { MoreHorizontal, Play, Plus, Search } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "検索キーワード" };

function fmtDateTime(date: Date): string {
  return date.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function KeywordsPage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [keywords, formRows, sentRows, monthUrlCount] = await Promise.all([
    prisma.keyword.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { searchResults: true } } },
    }),
    prisma.contactPage.findMany({ where: { hasForm: true }, select: { searchResult: { select: { keywordId: true } } } }),
    prisma.sendLog.findMany({ where: { status: "success" }, select: { contactPage: { select: { searchResult: { select: { keywordId: true } } } } } }),
    prisma.searchResult.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  // キーワードIDごとに「フォーム検出数」「送信済み数」を集計
  const formCounts = new Map<string, number>();
  for (const r of formRows) {
    const k = r.searchResult?.keywordId;
    if (k) formCounts.set(k, (formCounts.get(k) ?? 0) + 1);
  }
  const sentCounts = new Map<string, number>();
  for (const r of sentRows) {
    const k = r.contactPage?.searchResult?.keywordId;
    if (k) sentCounts.set(k, (sentCounts.get(k) ?? 0) + 1);
  }

  const total = keywords.length;
  const activeCount = keywords.filter((k) => k.isActive).length;
  const activeRate = total > 0 ? Math.round((activeCount / total) * 100) : 0;

  return (
    <>
      <PageTitle
        eyebrow="LEAD DISCOVERY"
        title="検索キーワード"
        description="問い合わせ先候補の収集に使用するキーワードを管理します。"
        action={<ActionButton icon={<Plus size={17} />}>キーワードを追加</ActionButton>}
      />
      <div className="summary-strip">
        <div><span>登録済み</span><strong>{total}</strong><small>キーワード総数</small></div>
        <div><span>有効</span><strong>{activeCount}</strong><small>現在収集中</small></div>
        <div><span>今月の検出URL</span><strong>{monthUrlCount.toLocaleString()}</strong><small>今月の新規</small></div>
        <div className="summary-progress"><span>稼働中の割合</span><div className="progress-track"><i style={{ width: `${activeRate}%` }} /></div><small>{activeRate}%</small></div>
      </div>
      <article className="panel">
        <div className="table-toolbar">
          <div className="search-input"><Search size={17} /><input aria-label="キーワードを検索" placeholder="キーワードを検索" /></div>
          <div className="toolbar-actions">
            <select aria-label="状態で絞り込む" defaultValue="all"><option value="all">すべての状態</option><option>有効</option><option>停止中</option></select>
            <ActionButton variant="secondary" icon={<Play size={16} />}>有効な検索を実行</ActionButton>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>キーワード</th><th>検出URL</th><th>フォーム</th><th>送信済み</th><th>状態</th><th>最終更新</th><th><span className="sr-only">操作</span></th></tr></thead>
            <tbody>
              {keywords.length === 0 ? (
                <tr><td colSpan={7}><p className="empty-state">登録済みのキーワードはありません。</p></td></tr>
              ) : keywords.map((keyword) => (
                <tr key={keyword.id}>
                  <td><Link className="primary-link" href={`/keywords/${keyword.id}`}>{keyword.name}</Link></td>
                  <td>{keyword._count.searchResults}</td>
                  <td>{formCounts.get(keyword.id) ?? 0}</td>
                  <td>{sentCounts.get(keyword.id) ?? 0}</td>
                  <td><span className={`toggle-status ${keyword.isActive ? "on" : ""}`}><i />{keyword.isActive ? "有効" : "停止中"}</span></td>
                  <td className="muted-cell">{fmtDateTime(new Date(keyword.updatedAt))}</td>
                  <td><button className="row-action" aria-label={`${keyword.name}の操作`}><MoreHorizontal size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>全 {total} 件を表示</span></div>
      </article>
    </>
  );
}
