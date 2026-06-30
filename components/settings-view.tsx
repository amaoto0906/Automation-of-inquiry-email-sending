"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCircle2, Clock3, Database, Download, KeyRound, LockKeyhole, Mail, Save, Search, Send, Sheet, ShieldCheck, Trash2, X } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle } from "@/components/ui";

// API・連携の各セクション（Sidebarから個別に開く）
const INTEGRATION_TABS = ["search", "sheets", "sending", "smtp"] as const;

const TABS = [
  { id: "search", label: "検索（キーワード収集）", icon: Search, group: "API・連携" },
  { id: "sheets", label: "Googleスプレッドシート連携", icon: Sheet, group: "API・連携" },
  { id: "sending", label: "本番送信制御", icon: Send, group: "API・連携" },
  { id: "smtp", label: "メール送信（SMTP）", icon: Mail, group: "API・連携" },
  { id: "safety", label: "安全運用", icon: ShieldCheck, group: "ポリシー" },
  { id: "delivery", label: "送信制御", icon: Clock3, group: "ポリシー" },
  { id: "notification", label: "通知", icon: Bell, group: "ポリシー" },
  { id: "data", label: "データ管理", icon: Database, group: "ポリシー" },
  { id: "security", label: "セキュリティ", icon: LockKeyhole, group: "ポリシー" },
] as const;

export function SettingsView() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("search");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // API・連携設定（DBに保存される実設定）
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [secretSet, setSecretSet] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  const markDirty = useCallback(() => setDirty(true), []);

  const showToast = useCallback((msg: string, error = false) => {
    setToast({ msg, error });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  }, []);

  // 現在の設定値を読み込む（シークレットは設定済み有無のみ）
  useEffect(() => {
    fetch("/api/settings")
      .then(async (r) => {
        if (!r.ok) return;
        const d = await r.json();
        setCfg({ ...(d.values ?? {}), SERPAPI_API_KEY: "", GOOGLE_PRIVATE_KEY: "", SMTP_PASS: "" });
        setSecretSet(d.secrets ?? {});
      })
      .finally(() => setLoaded(true));
  }, []);

  const setField = useCallback((key: string, value: string) => {
    setCfg((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  // 設定キーの削除（DBから消去し env/既定値へ戻す）
  const deleteField = useCallback(async (key: string, label: string) => {
    try {
      const res = await fetch(`/api/settings?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "削除に失敗しました");
      setCfg({ ...(d.values ?? {}), SERPAPI_API_KEY: "", GOOGLE_PRIVATE_KEY: "", SMTP_PASS: "" });
      setSecretSet(d.secrets ?? {});
      showToast(`「${label}」を削除しました`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "削除に失敗しました", true);
    }
  }, [showToast]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: cfg }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "保存に失敗しました");
      // 再取得した値で更新し、シークレット入力欄はクリア
      setCfg({ ...(d.values ?? {}), SERPAPI_API_KEY: "", GOOGLE_PRIVATE_KEY: "", SMTP_PASS: "" });
      setSecretSet(d.secrets ?? {});
      setDirty(false);
      showToast("設定を保存しました");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "保存に失敗しました", true);
    } finally {
      setSaving(false);
    }
  }, [cfg, showToast]);

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
          {TABS.map((t, i) => {
            const Icon = t.icon;
            const showGroup = i === 0 || TABS[i - 1].group !== t.group;
            return (
              <div key={t.id} className="settings-nav-item">
                {showGroup && <p className="settings-nav-group">{t.group}</p>}
                <button type="button" className={tab === t.id ? "active" : ""} aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
                  <Icon size={18} />{t.label}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="settings-content" onChange={markDirty} onInput={markDirty}>
          {(INTEGRATION_TABS as readonly string[]).includes(tab) && (
            loaded
              ? <IntegrationSection section={tab as (typeof INTEGRATION_TABS)[number]} cfg={cfg} setField={setField} deleteField={deleteField} secretSet={secretSet} />
              : <article className="panel setting-section"><p className="empty-state">設定を読み込み中…</p></article>
          )}
          <div hidden={tab !== "safety"}><SafetySection /></div>
          <div hidden={tab !== "delivery"}><DeliverySection /></div>
          <div hidden={tab !== "notification"}><NotificationSection /></div>
          <div hidden={tab !== "data"}><DataSection /></div>
          <div hidden={tab !== "security"}><SecuritySection /></div>
        </div>
      </section>

      {/* 保存トースト */}
      {toast && (
        <div className={`toast ${toast.error ? "danger" : "success"}`} role="status">
          <span className="toast-icon">{toast.error ? <X size={20} /> : <CheckCircle2 size={20} />}</span>
          <div><strong>{toast.msg}</strong></div>
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

function IntegrationSection({ section, cfg, setField, deleteField, secretSet }: { section: (typeof INTEGRATION_TABS)[number]; cfg: Record<string, string>; setField: (k: string, v: string) => void; deleteField: (k: string, label: string) => void; secretSet: Record<string, boolean> }) {
  if (section === "search") {
    return (
      <article className="panel setting-section">
        <div className="setting-heading"><span><Search size={22} /></span><div><h2>検索（キーワード収集）</h2><p>Google検索結果の取得に使用するプロバイダとAPIキーを設定します。</p></div></div>
        <div className="field">
          <label htmlFor="s-provider">検索プロバイダ</label>
          <select id="s-provider" value={cfg.SEARCH_PROVIDER ?? "mock"} onChange={(e) => setField("SEARCH_PROVIDER", e.target.value)}>
            <option value="mock">モック（開発・動作確認用）</option>
            <option value="serpapi">SerpAPI（本番）</option>
          </select>
          <small>本番ではSerpAPIを選択し、下のAPIキーを設定してください。</small>
        </div>
        <SecretField id="s-serp" label="Google検索APIキー（SerpAPI）" placeholder="例: 0123abcd4567ef..." value={cfg.SERPAPI_API_KEY ?? ""} configured={!!secretSet.SERPAPI_API_KEY} onChange={(v) => setField("SERPAPI_API_KEY", v)} onDelete={() => deleteField("SERPAPI_API_KEY", "Google検索APIキー")} help="serpapi.com で発行したAPIキー。追加・更新・削除できます。" />
      </article>
    );
  }

  if (section === "sheets") {
    return (
      <article className="panel setting-section">
        <div className="setting-heading"><span><Sheet size={22} /></span><div><h2>Googleスプレッドシート連携</h2><p>送信結果の記録先と、連携用サービスアカウントを設定します。</p></div></div>
        <div className="field"><label htmlFor="g-sid">スプレッドシートID</label><input id="g-sid" value={cfg.GOOGLE_SHEETS_SPREADSHEET_ID ?? ""} onChange={(e) => setField("GOOGLE_SHEETS_SPREADSHEET_ID", e.target.value)} placeholder="1AbC...xyz" /><small>シートURLの /d/ と /edit の間の文字列です。</small></div>
        <div className="field"><label htmlFor="g-email">サービスアカウントのメール</label><input id="g-email" value={cfg.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? ""} onChange={(e) => setField("GOOGLE_SERVICE_ACCOUNT_EMAIL", e.target.value)} placeholder="xxxx@xxxx.iam.gserviceaccount.com" /><small>このアドレスに対象シートの「編集者」権限を付与してください。</small></div>
        <SecretField id="g-key" label="サービスアカウント秘密鍵" textarea placeholder={"-----BEGIN PRIVATE KEY-----\n..."} value={cfg.GOOGLE_PRIVATE_KEY ?? ""} configured={!!secretSet.GOOGLE_PRIVATE_KEY} onChange={(v) => setField("GOOGLE_PRIVATE_KEY", v)} onDelete={() => deleteField("GOOGLE_PRIVATE_KEY", "サービスアカウント秘密鍵")} help="Google CloudのJSONキー内 private_key の値。" />
      </article>
    );
  }

  if (section === "sending") {
    return (
      <article className="panel setting-section">
        <div className="setting-heading"><span><Send size={22} /></span><div><h2>本番送信制御</h2><p>本番送信の可否と送信レートを制御します。</p></div></div>
        <label className="setting-toggle">
          <div>
            <strong>本番送信を有効化{(cfg.ALLOW_LIVE_SEND ?? "false") !== "true" && <span className="dryrun-chip">現在 dry-run</span>}</strong>
            <p>オフの間は実送信せず、dry-run（テスト送信・ログのみ）として動作します。本番運用の準備が整ってからオンにしてください。</p>
          </div>
          <input type="checkbox" checked={(cfg.ALLOW_LIVE_SEND ?? "false") === "true"} onChange={(e) => setField("ALLOW_LIVE_SEND", e.target.checked ? "true" : "false")} />
          <span className="switch" />
        </label>
        <div className="form-row">
          <div className="field"><label htmlFor="m-max">1日の送信上限</label><div className="input-suffix"><input id="m-max" type="number" min={1} value={cfg.MAX_SENDS_PER_DAY ?? "50"} onChange={(e) => setField("MAX_SENDS_PER_DAY", e.target.value)} /><span>件</span></div><small>ユーザーごと・1日あたり</small></div>
          <div className="field"><label htmlFor="m-delay">送信間隔</label><div className="input-suffix"><input id="m-delay" type="number" min={0} value={cfg.DEFAULT_SEND_DELAY_SECONDS ?? "5"} onChange={(e) => setField("DEFAULT_SEND_DELAY_SECONDS", e.target.value)} /><span>秒</span></div><small>連続送信時の待機時間</small></div>
        </div>
      </article>
    );
  }

  // section === "smtp"
  return (
    <article className="panel setting-section">
      <div className="setting-heading"><span><Mail size={22} /></span><div><h2>メール送信（SMTP）</h2><p>確認コードや承認通知の実送信に使用します。未設定の場合はモック（画面表示）で動作します。</p></div></div>
      <div className="form-row">
        <div className="field"><label htmlFor="smtp-host">SMTPホスト</label><input id="smtp-host" value={cfg.SMTP_HOST ?? ""} onChange={(e) => setField("SMTP_HOST", e.target.value)} placeholder="smtp.example.com" /><small>設定すると確認コードを実際にメール送信します。</small></div>
        <div className="field"><label htmlFor="smtp-port">SMTPポート</label><input id="smtp-port" type="number" min={1} value={cfg.SMTP_PORT ?? "587"} onChange={(e) => setField("SMTP_PORT", e.target.value)} /><small>587（STARTTLS）/ 465（TLS）</small></div>
      </div>
      <div className="field"><label htmlFor="smtp-user">SMTPユーザー</label><input id="smtp-user" value={cfg.SMTP_USER ?? ""} onChange={(e) => setField("SMTP_USER", e.target.value)} placeholder="user@example.com" /></div>
      <SecretField id="smtp-pass" label="SMTPパスワード" placeholder="アプリパスワード等" value={cfg.SMTP_PASS ?? ""} configured={!!secretSet.SMTP_PASS} onChange={(v) => setField("SMTP_PASS", v)} onDelete={() => deleteField("SMTP_PASS", "SMTPパスワード")} help="SMTP認証のパスワード。" />
      <label className="setting-toggle">
        <div><strong>SSL/TLS を使用</strong><p>ポート465など暗黙のTLSを使う場合はオン。587（STARTTLS）はオフ。</p></div>
        <input type="checkbox" checked={(cfg.SMTP_SECURE ?? "false") === "true"} onChange={(e) => setField("SMTP_SECURE", e.target.checked ? "true" : "false")} />
        <span className="switch" />
      </label>
      <div className="field"><label htmlFor="mail-from">差出人（From）</label><input id="mail-from" value={cfg.MAIL_FROM ?? ""} onChange={(e) => setField("MAIL_FROM", e.target.value)} placeholder="Outreach Hub <no-reply@example.jp>" /></div>
    </article>
  );
}

function SecretField({ id, label, value, configured, onChange, onDelete, placeholder, help, textarea = false }: { id: string; label: string; value: string; configured: boolean; onChange: (v: string) => void; onDelete?: () => void; placeholder?: string; help?: string; textarea?: boolean }) {
  const ph = configured ? "（設定済み。変更する場合のみ入力）" : placeholder;
  return (
    <div className="field">
      <label htmlFor={id}>
        <KeyRound size={13} />{label}
        {configured ? <span className="secret-chip set">設定済み</span> : <span className="secret-chip unset">未設定</span>}
        {configured && onDelete && (
          <button type="button" className="secret-delete" onClick={onDelete} aria-label={`${label}を削除`}><Trash2 size={12} />削除</button>
        )}
      </label>
      {textarea
        ? <textarea id={id} rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} />
        : <input id={id} type="password" autoComplete="new-password" value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} />}
      <small>{help}{configured ? " 空のまま保存すると現在の値を保持します。" : ""}</small>
    </div>
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
