import { FileSearch, RefreshCw, Search } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, StatusBadge } from "@/components/ui";
import { contactPages } from "@/lib/mock-data";

export const metadata = { title: "フォーム検出" };

export default function ContactPagesPage() {
  return (
    <>
      <PageTitle eyebrow="FORM DETECTION" title="問い合わせフォーム検出" description="検出された問い合わせページと入力項目の解析状態を管理します。" action={<ActionButton icon={<RefreshCw size={16} />}>未解析を処理</ActionButton>} />
      <section className="mini-stats">
        <div><span className="mini-icon blue"><FileSearch size={19} /></span><p>フォーム検出<strong>145</strong></p></div>
        <div><span className="mini-icon amber">!</span><p>手動確認<strong>12</strong></p></div>
        <div><span className="mini-icon green">✓</span><p>承認済み<strong>98</strong></p></div>
        <div><span className="mini-icon gray">—</span><p>フォームなし<strong>46</strong></p></div>
      </section>
      <article className="panel">
        <div className="table-toolbar"><div className="search-input"><Search size={17} /><input placeholder="企業名・URLを検索" aria-label="企業名・URLを検索" /></div><select aria-label="解析状態"><option>すべての解析状態</option><option>フォーム検出</option><option>手動確認</option></select></div>
        <div className="table-wrap">
          <table><thead><tr><th>企業</th><th>問い合わせページ</th><th>検出項目</th><th>最終解析</th><th>状態</th><th>操作</th></tr></thead>
            <tbody>{contactPages.map((page, index) => <tr key={page.company}><td><strong>{page.company}</strong></td><td><a className="mono-link" href={`https://example.jp${page.page}`}>{page.page}</a></td><td>{page.fields} 項目</td><td>{page.checked}</td><td><StatusBadge status={page.status} /></td><td><ActionButton href={`/review/contact-${index + 1}`} variant={page.status === "approved" ? "secondary" : "ghost"}>{page.status === "approved" ? "確認済み" : "確認する"}</ActionButton></td></tr>)}</tbody>
          </table>
        </div>
      </article>
    </>
  );
}
