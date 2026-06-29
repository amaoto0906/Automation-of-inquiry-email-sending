import { Ban, Building2, Globe2, Plus, Search, Tags } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "除外ルール" };

const rules = [
  { type: "ドメイン", value: "example-competitor.jp", reason: "競合企業", icon: Globe2, count: 12, date: "2026/06/21" },
  { type: "企業名", value: "株式会社サンプルワークス", reason: "既存取引先", icon: Building2, count: 4, date: "2026/06/18" },
  { type: "業種", value: "医療・病院", reason: "営業対象外", icon: Tags, count: 28, date: "2026/06/10" },
  { type: "禁止文言", value: "営業目的の連絡はお断り", reason: "サイト内文言", icon: Ban, count: 43, date: "2026/06/01" },
];

export default function ExcludeRulesPage() {
  return (
    <>
      <PageTitle eyebrow="EXCLUSION POLICY" title="除外ルール" description="送信対象外とする企業・業種・ドメイン・禁止文言を管理します。" action={<ActionButton icon={<Plus size={17} />}>除外ルールを追加</ActionButton>} />
      <section className="policy-banner"><span><Ban size={22} /></span><div><strong>除外ルールは送信前に必ず評価されます</strong><p>該当した対象は承認・送信できず、理由とともに履歴へ記録されます。</p></div><b>保護中</b></section>
      <article className="panel">
        <div className="table-toolbar"><div className="search-input"><Search size={17} /><input placeholder="ルールを検索" aria-label="除外ルールを検索" /></div><div className="filter-chips compact"><button className="active">すべて</button><button>ドメイン</button><button>企業名</button><button>業種</button><button>禁止文言</button></div></div>
        <div className="rule-grid">
          {rules.map((rule) => { const Icon = rule.icon; return <article className="rule-card" key={rule.value}><div className="rule-card-top"><span><Icon size={19} /></span><small>{rule.type}</small><button aria-label={`${rule.value}を編集`}>編集</button></div><h3>{rule.value}</h3><p>{rule.reason}</p><footer><span>該当 {rule.count}件</span><span>追加日 {rule.date}</span></footer></article>; })}
        </div>
      </article>
    </>
  );
}
