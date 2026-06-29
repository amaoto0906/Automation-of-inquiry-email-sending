import { Bell, Clock3, Database, LockKeyhole, Save, Send, ShieldCheck } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "設定" };

export default function SettingsPage() {
  return (
    <>
      <PageTitle eyebrow="SYSTEM PREFERENCES" title="設定" description="安全運用、送信制御、通知、データ保持の設定を管理します。" action={<ActionButton icon={<Save size={16} />}>変更を保存</ActionButton>} />
      <section className="settings-layout">
        <nav className="settings-nav panel" aria-label="設定カテゴリー">
          <a href="#safety" className="active"><ShieldCheck size={18} />安全運用</a>
          <a href="#delivery"><Send size={18} />送信制御</a>
          <a href="#notification"><Bell size={18} />通知</a>
          <a href="#data"><Database size={18} />データ管理</a>
          <a href="#security"><LockKeyhole size={18} />セキュリティ</a>
        </nav>
        <div className="settings-content">
          <article className="panel setting-section" id="safety">
            <div className="setting-heading"><span><ShieldCheck size={22} /></span><div><h2>安全運用</h2><p>誤送信や規約違反につながる操作を防止します。</p></div></div>
            <SettingToggle title="送信前確認を必須にする" description="承認チェックなしでは送信ボタンを有効にしません。" checked locked />
            <SettingToggle title="CAPTCHA検出時に自動送信を停止" description="手動確認リストへ移動し、自動操作を行いません。" checked locked />
            <SettingToggle title="営業禁止文言を検出" description="対象ページ内の禁止文言を確認して警告します。" checked />
            <SettingToggle title="除外ルールを送信直前に再評価" description="検出後に追加されたルールも反映します。" checked />
          </article>
          <article className="panel setting-section" id="delivery">
            <div className="setting-heading"><span><Clock3 size={22} /></span><div><h2>送信制御</h2><p>送信件数と間隔を安全な範囲に制御します。</p></div></div>
            <div className="form-row"><div className="field"><label htmlFor="daily-limit">1日の送信上限</label><div className="input-suffix"><input id="daily-limit" type="number" defaultValue={50} min={1} /><span>件</span></div><small>チーム全体に適用されます</small></div><div className="field"><label htmlFor="interval">最小送信間隔</label><div className="input-suffix"><input id="interval" type="number" defaultValue={5} min={1} /><span>分</span></div><small>同一ドメインへの連続送信は行いません</small></div></div>
            <div className="field"><label htmlFor="duplicate-window">重複送信を防止する期間</label><select id="duplicate-window" defaultValue="90"><option value="30">30日</option><option value="60">60日</option><option value="90">90日</option><option value="365">1年</option></select></div>
          </article>
          <article className="panel setting-section" id="notification">
            <div className="setting-heading"><span><Bell size={22} /></span><div><h2>通知</h2><p>重要な処理結果をチームへ通知します。</p></div></div>
            <SettingToggle title="送信失敗を通知" description="送信エラー発生時に管理者へ通知します。" checked />
            <SettingToggle title="手動確認の追加を通知" description="新しい確認対象が追加されたときに通知します。" checked />
            <SettingToggle title="日次レポート" description="毎日の送信結果をまとめて通知します。" />
          </article>
        </div>
      </section>
    </>
  );
}

function SettingToggle({ title, description, checked = false, locked = false }: { title: string; description: string; checked?: boolean; locked?: boolean }) {
  return <label className="setting-toggle"><div><strong>{title}{locked && <span className="required-chip">必須</span>}</strong><p>{description}</p></div><input type="checkbox" defaultChecked={checked} disabled={locked} /><span className="switch" /></label>;
}
