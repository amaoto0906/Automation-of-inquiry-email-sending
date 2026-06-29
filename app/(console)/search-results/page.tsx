import { Download, Filter, Search } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, StatusBadge } from "@/components/ui";
import { searchResults } from "@/lib/mock-data";

export const metadata = { title: "検索結果" };

export default function SearchResultsPage() {
  return (
    <>
      <PageTitle eyebrow="DISCOVERED TARGETS" title="検索結果" description="キーワード検索で検出した企業・Webサイトを確認します。" action={<ActionButton variant="secondary" icon={<Download size={16} />}>CSV出力</ActionButton>} />
      <article className="panel">
        <div className="table-toolbar">
          <div className="search-input wide"><Search size={17} /><input aria-label="企業名またはURLで検索" placeholder="企業名またはURLで検索" /></div>
          <div className="toolbar-actions"><select aria-label="キーワード"><option>すべてのキーワード</option><option>東京 Web制作会社</option></select><button className="filter-button"><Filter size={16} />詳細フィルター</button></div>
        </div>
        <div className="filter-chips"><button className="active">すべて <b>224</b></button><button>フォーム検出 <b>145</b></button><button>確認待ち <b>12</b></button><button>除外 <b>21</b></button></div>
        <div className="table-wrap">
          <table><thead><tr><th><input type="checkbox" aria-label="すべて選択" /></th><th>企業・サイト</th><th>検索キーワード</th><th>検出</th><th>ステータス</th><th>操作</th></tr></thead>
            <tbody>{searchResults.map((result) => <tr key={result.url}><td><input type="checkbox" aria-label={`${result.company}を選択`} /></td><td><div className="primary-cell"><strong>{result.company}</strong><a href={result.url}>{result.url}</a></div></td><td>{result.keyword}</td><td>{result.found}</td><td><StatusBadge status={result.status} /></td><td><ActionButton href={result.status === "form_found" ? "/review/result-001" : "/contact-pages"} variant="ghost">詳細</ActionButton></td></tr>)}</tbody>
          </table>
        </div>
        <div className="table-footer"><span>全 224 件中 1〜5 件を表示</span><div className="pagination"><button disabled>前へ</button><button className="current">1</button><button>2</button><button>次へ</button></div></div>
      </article>
    </>
  );
}
