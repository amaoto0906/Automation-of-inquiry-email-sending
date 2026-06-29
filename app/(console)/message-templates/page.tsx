import { Copy, FileText, MoreHorizontal, Plus } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "文面テンプレート" };

const templates = [
  { title: "標準営業テンプレート", version: "v2", active: true, updated: "10分前", preview: "突然のご連絡失礼いたします。株式会社オルタナティブの…" },
  { title: "Web制作会社向け", version: "v1", active: false, updated: "2026/06/24", preview: "貴社の制作実績を拝見し、弊社サービスとの連携について…" },
  { title: "SaaS企業向け", version: "v3", active: false, updated: "2026/06/20", preview: "貴社サービスの導入支援に関して、ご提案がございます…" },
];

export default function MessageTemplatesPage() {
  return (
    <>
      <PageTitle eyebrow="MESSAGE LIBRARY" title="文面テンプレート" description="問い合わせフォームへ入力する文面を編集・管理します。" action={<ActionButton icon={<Plus size={17} />}>テンプレートを作成</ActionButton>} />
      <section className="template-layout">
        <div className="template-list">
          {templates.map((template) => <article className={`panel template-card ${template.active ? "selected" : ""}`} key={template.title}><div className="template-card-header"><span className="template-icon"><FileText size={20} /></span><div><h3>{template.title}</h3><p>{template.version}・更新 {template.updated}</p></div>{template.active && <b>使用中</b>}<button aria-label={`${template.title}の操作`}><MoreHorizontal size={18} /></button></div><p className="template-preview">{template.preview}</p><footer><button><Copy size={15} />複製</button><button>編集</button></footer></article>)}
        </div>
        <aside className="panel editor-card">
          <p className="eyebrow">LIVE PREVIEW</p><h2>標準営業テンプレート</h2>
          <div className="field"><label>テンプレート名</label><input defaultValue="標準営業テンプレート" /></div>
          <div className="field"><label>件名</label><input defaultValue="業務効率化のご提案について" /></div>
          <div className="field"><label>本文</label><textarea rows={10} defaultValue={"{{company_name}}\nご担当者様\n\n突然のご連絡失礼いたします。\n株式会社オルタナティブの{{sender_name}}と申します。\n\n貴社のWebサイトを拝見し、弊社の業務自動化支援がお役に立てるのではないかと思い、ご連絡いたしました。"} /></div>
          <p className="helper-text">利用可能な変数：{"{{company_name}} {{sender_name}}"}</p>
          <ActionButton>変更を保存</ActionButton>
        </aside>
      </section>
    </>
  );
}
