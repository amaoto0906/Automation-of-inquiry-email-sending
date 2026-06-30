import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, FileSearch, Globe2, Pause, Play, Send } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, StatCard, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { asOutreachStatus } from "@/lib/status-display";

export const metadata = { title: "キーワード詳細" };

function fmtDate(date: Date): string {
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function fmtDateTime(date: Date): string {
  return date.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fmtTime(date: Date): string {
  return date.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function KeywordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [keyword, urlCount, formCount, sentCount, failedCount, recent] = await Promise.all([
    prisma.keyword.findUnique({ where: { id } }),
    prisma.searchResult.count({ where: { keywordId: id } }),
    prisma.contactPage.count({ where: { hasForm: true, searchResult: { keywordId: id } } }),
    prisma.sendLog.count({ where: { status: "success", contactPage: { searchResult: { keywordId: id } } } }),
    prisma.sendLog.count({ where: { status: "failed", contactPage: { searchResult: { keywordId: id } } } }),
    prisma.searchResult.findMany({ where: { keywordId: id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  if (!keyword) notFound();

  const detectionRate = urlCount > 0 ? Math.round((formCount / urlCount) * 1000) / 10 : 0;
  const sendDenom = sentCount + failedCount;
  const successRate = sendDenom > 0 ? Math.round((sentCount / sendDenom) * 1000) / 10 : null;

  return (
    <>
      <Link href="/keywords" className="back-link"><ArrowLeft size={16} />キーワード一覧へ戻る</Link>
      <PageTitle
        eyebrow={`検索クエリ: ${keyword.query}`}
        title={keyword.name}
        description="検索結果の収集状況とフォーム検出結果を確認できます。"
        action={<div className="button-row"><ActionButton variant="secondary" icon={<Pause size={16} />}>一時停止</ActionButton><ActionButton icon={<Play size={16} />}>再検索</ActionButton></div>}
      />
      <section className="stats-grid three">
        <StatCard label="検出URL" value={urlCount.toLocaleString()} note="重複除外後の件数" icon={Globe2} />
        <StatCard label="フォーム検出" value={formCount.toLocaleString()} note={`検出率 ${detectionRate}%`} icon={FileSearch} tone="indigo" />
        <StatCard label="送信済み" value={sentCount.toLocaleString()} note={successRate == null ? "送信実績なし" : `成功率 ${successRate}%`} icon={Send} tone="emerald" />
      </section>
      <section className="detail-grid">
        <article className="panel">
          <div className="section-header"><div><h2>最近の検索結果</h2><p>このキーワードで検出された対象</p></div><Link href={`/search-results?keyword=${encodeURIComponent(keyword.name)}`} className="text-link">すべて表示</Link></div>
          <div className="table-wrap">
            <table><thead><tr><th>企業・URL</th><th>検出日時</th><th>状態</th></tr></thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr><td colSpan={3}><p className="empty-state">まだ検索結果がありません。</p></td></tr>
                ) : recent.map((result) => (
                  <tr key={result.id}><td><div className="primary-cell"><strong>{result.title?.trim() || result.domain}</strong><span>{result.url}</span></div></td><td>{fmtTime(new Date(result.createdAt))}</td><td><StatusBadge status={asOutreachStatus(result.status)} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <aside className="panel keyword-settings">
          <h2>検索設定</h2>
          <dl>
            <div><dt><CalendarDays size={16} />登録日</dt><dd>{fmtDate(new Date(keyword.createdAt))}</dd></div>
            <div><dt><Globe2 size={16} />対象地域</dt><dd>{keyword.region?.trim() || "指定なし"}</dd></div>
            <div><dt><Clock3 size={16} />最終実行</dt><dd>{keyword.lastExecutedAt ? fmtDateTime(new Date(keyword.lastExecutedAt)) : "未実行"}</dd></div>
          </dl>
          <div className="info-box">次回の自動検索は設定されていません。必要なタイミングで手動実行してください。</div>
        </aside>
      </section>
    </>
  );
}
