import Link from "next/link";
import { MoreHorizontal, Play, Plus, Search } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle } from "@/components/ui";
import { keywords } from "@/lib/mock-data";

export const metadata = { title: "検索キーワード" };

export default function KeywordsPage() {
  return (
    <>
      <PageTitle
        eyebrow="LEAD DISCOVERY"
        title="検索キーワード"
        description="問い合わせ先候補の収集に使用するキーワードを管理します。"
        action={<ActionButton icon={<Plus size={17} />}>キーワードを追加</ActionButton>}
      />
      <div className="summary-strip">
        <div><span>登録済み</span><strong>10</strong><small>/ 月間上限 12</small></div>
        <div><span>有効</span><strong>8</strong><small>現在収集中</small></div>
        <div><span>今月の検出URL</span><strong>351</strong><small>重複除外後</small></div>
        <div className="summary-progress"><span>月間利用状況</span><div className="progress-track"><i style={{ width: "83%" }} /></div><small>83%</small></div>
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
              {keywords.map((keyword) => (
                <tr key={keyword.id}>
                  <td><Link className="primary-link" href={`/keywords/${keyword.id}`}>{keyword.name}</Link></td>
                  <td>{keyword.urls}</td><td>{keyword.forms}</td><td>{keyword.sent}</td>
                  <td><span className={`toggle-status ${keyword.active ? "on" : ""}`}><i />{keyword.active ? "有効" : "停止中"}</span></td>
                  <td className="muted-cell">{keyword.updated}</td>
                  <td><button className="row-action" aria-label={`${keyword.name}の操作`}><MoreHorizontal size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>全 10 件中 1〜4 件を表示</span><div className="pagination"><button disabled>前へ</button><button className="current">1</button><button>2</button><button>3</button><button>次へ</button></div></div>
      </article>
    </>
  );
}
