import Link from "next/link";
import { ArrowLeft, CalendarDays, FileSearch, Globe2, Pause, Play, Send } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, StatCard, StatusBadge } from "@/components/ui";
import { searchResults } from "@/lib/mock-data";

export const metadata = { title: "キーワード詳細" };

export default async function KeywordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Link href="/keywords" className="back-link"><ArrowLeft size={16} />キーワード一覧へ戻る</Link>
      <PageTitle
        eyebrow={`KEYWORD ID: ${id.toUpperCase()}`}
        title="東京 Web制作会社"
        description="検索結果の収集状況とフォーム検出結果を確認できます。"
        action={<div className="button-row"><ActionButton variant="secondary" icon={<Pause size={16} />}>一時停止</ActionButton><ActionButton icon={<Play size={16} />}>再検索</ActionButton></div>}
      />
      <section className="stats-grid three">
        <StatCard label="検出URL" value="128" note="重複除外後の件数" icon={Globe2} />
        <StatCard label="フォーム検出" value="84" note="検出率 65.6%" icon={FileSearch} tone="indigo" />
        <StatCard label="送信済み" value="42" note="成功率 95.4%" icon={Send} tone="emerald" />
      </section>
      <section className="detail-grid">
        <article className="panel">
          <div className="section-header"><div><h2>最近の検索結果</h2><p>このキーワードで検出された対象</p></div><Link href="/search-results" className="text-link">すべて表示</Link></div>
          <div className="table-wrap">
            <table><thead><tr><th>企業・URL</th><th>検出日時</th><th>状態</th></tr></thead>
              <tbody>{searchResults.slice(0, 4).map((result) => <tr key={result.url}><td><div className="primary-cell"><strong>{result.company}</strong><span>{result.url}</span></div></td><td>{result.found}</td><td><StatusBadge status={result.status} /></td></tr>)}</tbody>
            </table>
          </div>
        </article>
        <aside className="panel keyword-settings">
          <h2>検索設定</h2>
          <dl>
            <div><dt><CalendarDays size={16} />登録日</dt><dd>2026/06/01</dd></div>
            <div><dt><Globe2 size={16} />対象地域</dt><dd>日本</dd></div>
            <div><dt><FileSearch size={16} />検索上限</dt><dd>150件 / 回</dd></div>
          </dl>
          <div className="info-box">次回の自動検索は設定されていません。必要なタイミングで手動実行してください。</div>
        </aside>
      </section>
    </>
  );
}
