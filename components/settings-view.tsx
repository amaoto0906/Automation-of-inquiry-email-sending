"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCircle2, Clock3, Database, Download, LockKeyhole, Save, Send, ShieldCheck } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle } from "@/components/ui";

const TABS = [
  { id: "safety", label: "安全運用", icon: ShieldCheck },
  { id: "delivery", label: "送信制御", icon: Send },
  { id: "notification", label: "通知", icon: Bell },
  { id: "data", label: "データ管理", icon: Database },
  { id: "security", label: "セキュリティ", icon: LockKeyhole },
] as const;

export function SettingsView() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("safety");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markDirty = useCallback(() => setDirty(true), []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    // 設定の保存（デモ環境のため疑似的に処理）
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setDirty(false);
    showToast("設定を保存しました");
  }, [showToast]);

  // 未保存の変更がある状態での離脱をガード
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      // 別ページへの遷移を保留し、確認ダイアログを表示
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(url.pathname + url.search);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  function leaveTo(href: string) {
    setPendingHref(null);
    setDirty(false);
    router.push(href);
  }

  async function saveAndLeave() {
    const href = pendingHref;
    await save();
    if (href) {
      setPendingHref(null);
      router.push(href);
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="SYSTEM PREFERENCES"
        title="設定"
        description="安全運用、送信制御、通知、データ保持の設定を管理します。"
        action={
          <div className="settings-save-action">
            {dirty && <span className="unsaved-dot">未保存の変更</span>}
            <ActionButton onClick={save} loading={saving} icon={<Save size={16} />}>変更を保存</ActionButton>
          </div>
        }
      />

      <section className="settings-layout">
        <nav className="settings-nav panel" aria-label="設定カテゴリー">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" className={tab === t.id ? "active" : ""} aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
                <Icon size={18} />{t.label}
              </button>
            );
          })}
        </nav>

        <div className="settings-content" onChange={markDirty} onInput={markDirty}>
          <div hidden={tab !== "safety"}><SafetySection /></div>
          <div hidden={tab !== "delivery"}><DeliverySection /></div>
          <div hidden={tab !== "notification"}><NotificationSection /></div>
          <div hidden={tab !== "data"}><DataSection /></div>
          <div hidden={tab !== "security"}><SecuritySection /></div>
        </div>
      </section>

      {/* 保存成功トースト */}
      {toast && (
        <div className="toast success" role="status">
          <span className="toast-icon"><CheckCircle2 size={20} /></span>
          <div><strong>{toast}</strong></div>
        </div>
      )}

      {/* 未保存の変更がある状態での離脱確認 */}
      {pendingHref && (
        <div className="modal-backdrop">
          <div className="modal-box panel unsaved-dialog">
            <div className="modal-header"><h2>保存していない変更があります</h2></div>
            <div className="modal-form">
              <div className="delete-confirm">
                <span className="unsaved-dialog-icon"><AlertTriangle size={22} /></span>
                <p>変更した設定内容を保存しますか？保存せずに移動すると、変更は破棄されます。</p>
              </div>
              <div className="modal-actions">
                <ActionButton loading={saving} icon={<Save size={15} />} onClick={saveAndLeave}>保存して移動</ActionButton>
                <ActionButton variant="secondary" onClick={() => leaveTo(pendingHref)}>保存せず移動</ActionButton>
                <ActionButton variant="ghost" onClick={() => setPendingHref(null)}>キャンセル</ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SettingToggle({ title, description, checked = false, locked = false }: { title: string; description: string; checked?: boolean; locked?: boolean }) {
  return (
    <label className="setting-toggle">
      <div>
        <strong>{title}{locked && <span className="required-chip">必須</span>}</strong>
        <p>{description}</p>
      </div>
      <input type="checkbox" defaultChecked={checked} disabled={locked} />
      <span className="switch" />
    </label>
  );
}

function SafetySection() {
  return (
    <article className="panel setting-section">
      <div className="setting-heading"><span><ShieldCheck size={22} /></span><div><h2>安全運用</h2><p>誤送信や規約違反につながる操作を防止します。</p></div></div>
      <SettingToggle title="送信前確認を必須にする" description="承認チェックなしでは送信ボタンを有効にしません。" checked locked />
      <SettingToggle title="CAPTCHA検出時に自動送信を停止" description="手動確認リストへ移動し、自動操作を行いません。" checked locked />
      <SettingToggle title="営業禁止文言を検出" description="対象ページ内の禁止文言を確認して警告します。" checked />
      <SettingToggle title="除外ルールを送信直前に再評価" description="検出後に追加されたルールも反映します。" checked />
    </article>
  );
}

function DeliverySection() {
  return (
    <article className="panel setting-section">
      <div className="setting-heading"><span><Clock3 size={22} /></span><div><h2>送信制御</h2><p>送信件数と間隔を安全な範囲に制御します。</p></div></div>
      <div className="form-row">
        <div className="field"><label htmlFor="daily-limit">1日の送信上限</label><div className="input-suffix"><input id="daily-limit" type="number" defaultValue={50} min={1} /><span>件</span></div><small>チーム全体に適用されます</small></div>
        <div className="field"><label htmlFor="interval">最小送信間隔</label><div className="input-suffix"><input id="interval" type="number" defaultValue={5} min={1} /><span>分</span></div><small>同一ドメインへの連続送信は行いません</small></div>
      </div>
      <div className="field"><label htmlFor="duplicate-window">重複送信を防止する期間</label><select id="duplicate-window" defaultValue="90"><option value="30">30日</option><option value="60">60日</option><option value="90">90日</option><option value="365">1年</option></select></div>
    </article>
  );
}

function NotificationSection() {
  return (
    <article className="panel setting-section">
      <div className="setting-heading"><span><Bell size={22} /></span><div><h2>通知</h2><p>重要な処理結果をチームへ通知します。</p></div></div>
      <SettingToggle title="送信失敗を通知" description="送信エラー発生時に管理者へ通知します。" checked />
      <SettingToggle title="手動確認の追加を通知" description="新しい確認対象が追加されたときに通知します。" checked />
      <SettingToggle title="承認待ちの新規登録を通知" description="新規登録の承認依頼を管理者へ通知します。" checked />
      <SettingToggle title="日次レポート" description="毎日の送信結果をまとめて通知します。" />
    </article>
  );
}

function DataSection() {
  return (
    <article className="panel setting-section">
      <div className="setting-heading"><span><Database size={22} /></span><div><h2>データ管理</h2><p>履歴データの保持期間とエクスポートを管理します。</p></div></div>
      <div className="form-row">
        <div className="field"><label htmlFor="log-retention">送信ログの保持期間</label><select id="log-retention" defaultValue="365"><option value="90">90日</option><option value="180">180日</option><option value="365">1年</option><option value="0">無期限</option></select></div>
        <div className="field"><label htmlFor="audit-retention">監査ログの保持期間</label><select id="audit-retention" defaultValue="365"><option value="180">180日</option><option value="365">1年</option><option value="730">2年</option></select></div>
      </div>
      <SettingToggle title="保持期間を超えたデータを自動削除" description="設定した期間より古い履歴を毎日自動で削除します。" checked />
      <div className="settings-data-actions">
        <ActionButton variant="secondary" icon={<Download size={16} />}>全データをCSVエクスポート</ActionButton>
      </div>
    </article>
  );
}

function SecuritySection() {
  return (
    <article className="panel setting-section">
      <div className="setting-heading"><span><LockKeyhole size={22} /></span><div><h2>セキュリティ</h2><p>アカウントとアクセスの保護設定です。</p></div></div>
      <SettingToggle title="管理者の2段階認証を必須にする" description="管理者ログイン時にメール確認コードを要求します。" checked />
      <SettingToggle title="ログイン失敗時に一時ロック" description="連続して失敗した場合、一定時間ログインを制限します。" checked />
      <div className="form-row">
        <div className="field"><label htmlFor="session-ttl">セッション有効期限</label><select id="session-ttl" defaultValue="168"><option value="8">8時間</option><option value="24">24時間</option><option value="168">7日</option></select></div>
        <div className="field"><label htmlFor="pw-min">パスワード最小文字数</label><div className="input-suffix"><input id="pw-min" type="number" defaultValue={8} min={8} max={64} /><span>文字</span></div></div>
      </div>
    </article>
  );
}
