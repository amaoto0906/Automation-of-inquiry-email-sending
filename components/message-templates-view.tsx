"use client";

import { useCallback, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, FileText, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle } from "@/components/ui";

interface Template {
  id: string;
  title: string;
  version: number;
  active: boolean;
  updated: string;
  subject: string;
  body: string;
}

const todayStr = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "/");

const INITIAL: Template[] = [
  {
    id: "t1", title: "標準営業テンプレート", version: 2, active: true, updated: "10分前",
    subject: "業務効率化のご提案について",
    body: "{{company_name}}\nご担当者様\n\n突然のご連絡失礼いたします。\n株式会社オルタナティブの{{sender_name}}と申します。\n\n貴社のWebサイトを拝見し、弊社の業務自動化支援がお役に立てるのではないかと思い、ご連絡いたしました。",
  },
  {
    id: "t2", title: "Web制作会社向け", version: 1, active: false, updated: "2026/06/24",
    subject: "弊社サービスとの連携について",
    body: "{{company_name}}\nご担当者様\n\n貴社の制作実績を拝見し、弊社サービスとの連携についてご提案させていただきたく、ご連絡いたしました。",
  },
  {
    id: "t3", title: "SaaS企業向け", version: 3, active: false, updated: "2026/06/20",
    subject: "導入支援のご提案について",
    body: "{{company_name}}\nご担当者様\n\n貴社サービスの導入支援に関して、ご提案がございます。\nぜひ一度ご検討いただけますと幸いです。",
  },
];

let nextId = 4;
function genId() { return `t${nextId++}`; }

function preview(body: string) {
  const line = body.split("\n").find((l) => l.trim()) ?? "";
  return line.length > 35 ? line.slice(0, 35) + "…" : line;
}

export function MessageTemplatesView() {
  const [templates, setTemplates] = useState<Template[]>(INITIAL);
  const [selectedId, setSelectedId] = useState<string>("t1");
  const [form, setForm] = useState<{ title: string; subject: string; body: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  function showToast(msg: string, error = false) {
    setToast({ msg, error });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  const selected = templates.find((t) => t.id === selectedId) ?? templates[0] ?? null;

  function selectTemplate(id: string) {
    if (form) {
      // 未保存の変更があれば破棄して切り替え
      setForm(null);
    }
    setSelectedId(id);
    setOpenMenu(null);
  }

  function startEdit() {
    if (!selected) return;
    setForm({ title: selected.title, subject: selected.subject, body: selected.body });
    setOpenMenu(null);
  }

  function cancelEdit() { setForm(null); }

  function saveEdit() {
    if (!form || !selected) return;
    setTemplates((prev) => prev.map((t) => t.id === selected.id
      ? { ...t, title: form.title, subject: form.subject, body: form.body, version: t.version + 1, updated: "たった今" }
      : t
    ));
    setForm(null);
    showToast("テンプレートを保存しました");
  }

  function duplicateTemplate(t: Template) {
    const copy: Template = { ...t, id: genId(), title: `${t.title}（コピー）`, active: false, version: 1, updated: "たった今" };
    setTemplates((prev) => [...prev, copy]);
    setSelectedId(copy.id);
    showToast(`「${t.title}」を複製しました`);
    setOpenMenu(null);
  }

  function setActive(id: string) {
    setTemplates((prev) => prev.map((t) => ({ ...t, active: t.id === id })));
    showToast("使用するテンプレートを変更しました");
    setOpenMenu(null);
  }

  function createTemplate() {
    const t: Template = {
      id: genId(), title: "新しいテンプレート", version: 1, active: false,
      updated: "たった今", subject: "", body: "",
    };
    setTemplates((prev) => [...prev, t]);
    setSelectedId(t.id);
    setForm({ title: t.title, subject: t.subject, body: t.body });
  }

  function confirmDelete(t: Template) { setDeleteTarget(t); setOpenMenu(null); }

  function doDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.title;
    const wasSelected = deleteTarget.id === selectedId;
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== deleteTarget.id);
      if (wasSelected && next.length > 0) setSelectedId(next[0].id);
      return next;
    });
    setForm(null);
    setDeleteTarget(null);
    showToast(`「${name}」を削除しました`);
  }

  const setField = useCallback((k: "title" | "subject" | "body", v: string) => {
    setForm((prev) => prev ? { ...prev, [k]: v } : prev);
  }, []);

  const editorTitle = form ? (selectedId && templates.find(t => t.id === selectedId)?.title !== form.title ? form.title || "新しいテンプレート" : form.title) : selected?.title ?? "";

  return (
    <>
      <PageTitle
        eyebrow="MESSAGE LIBRARY"
        title="文面テンプレート"
        description="問い合わせフォームへ入力する文面を編集・管理します。"
        action={<ActionButton icon={<Plus size={17} />} onClick={createTemplate}>テンプレートを作成</ActionButton>}
      />

      <section className="template-layout" onClick={() => setOpenMenu(null)}>
        {/* ── 左: テンプレート一覧 ── */}
        <div className="template-list">
          {templates.length === 0 && <p className="empty-state">テンプレートがありません。新規作成してください。</p>}
          {templates.map((t) => (
            <article
              key={t.id}
              className={`panel template-card${t.id === selectedId ? " selected" : ""}`}
              onClick={() => selectTemplate(t.id)}
            >
              <div className="template-card-header">
                <span className="template-icon"><FileText size={20} /></span>
                <div><h3>{t.title}</h3><p>v{t.version}・更新 {t.updated}</p></div>
                {t.active && <b>使用中</b>}
                <div className="template-menu-wrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="template-menu-btn"
                    aria-label={`${t.title}の操作`}
                    aria-expanded={openMenu === t.id}
                    onClick={() => setOpenMenu((prev) => prev === t.id ? null : t.id)}
                  ><MoreHorizontal size={18} /></button>
                  {openMenu === t.id && (
                    <div className="template-dropdown">
                      {!t.active && <button type="button" onClick={() => setActive(t.id)}>使用するテンプレートに設定</button>}
                      <button type="button" onClick={() => { selectTemplate(t.id); startEdit(); }}>編集</button>
                      <button type="button" onClick={() => duplicateTemplate(t)}>複製</button>
                      <button type="button" className="danger" onClick={() => confirmDelete(t)}>削除</button>
                    </div>
                  )}
                </div>
              </div>
              <p className="template-preview">{preview(t.body) || "（本文なし）"}</p>
              <footer onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => duplicateTemplate(t)}><Copy size={15} />複製</button>
                <button type="button" onClick={() => { selectTemplate(t.id); startEdit(); }}>編集</button>
                <button type="button" className="danger-link" onClick={() => confirmDelete(t)}><Trash2 size={14} />削除</button>
              </footer>
            </article>
          ))}
        </div>

        {/* ── 右: ライブプレビュー / エディタ ── */}
        <aside className="panel editor-card" onClick={(e) => e.stopPropagation()}>
          {!selected ? (
            <p className="empty-state">テンプレートを選択してください。</p>
          ) : form ? (
            /* 編集モード */
            <>
              <p className="eyebrow">EDIT TEMPLATE</p>
              <h2>{form.title || "（タイトル未入力）"}</h2>
              <div className="field"><label htmlFor="e-title">テンプレート名</label><input id="e-title" value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="テンプレート名を入力" /></div>
              <div className="field"><label htmlFor="e-subj">件名</label><input id="e-subj" value={form.subject} onChange={(e) => setField("subject", e.target.value)} placeholder="件名を入力" /></div>
              <div className="field"><label htmlFor="e-body">本文</label><textarea id="e-body" rows={10} value={form.body} onChange={(e) => setField("body", e.target.value)} placeholder="本文を入力&#10;変数: {{company_name}} {{sender_name}}" /></div>
              <p className="helper-text">利用可能な変数：{"{{company_name}} {{sender_name}}"}</p>
              <div className="template-edit-actions">
                <ActionButton onClick={saveEdit} icon={<CheckCircle2 size={16} />}>変更を保存</ActionButton>
                <ActionButton variant="secondary" onClick={cancelEdit}>キャンセル</ActionButton>
              </div>
            </>
          ) : (
            /* プレビューモード */
            <>
              <p className="eyebrow">LIVE PREVIEW</p>
              <h2>{selected.title}</h2>
              <div className="field"><label>テンプレート名</label><input value={selected.title} readOnly /></div>
              <div className="field"><label>件名</label><input value={selected.subject} readOnly /></div>
              <div className="field"><label>本文</label><textarea rows={10} value={selected.body} readOnly /></div>
              <p className="helper-text">利用可能な変数：{"{{company_name}} {{sender_name}}"}</p>
              <div className="template-edit-actions">
                <ActionButton onClick={startEdit}>編集する</ActionButton>
                {!selected.active && <ActionButton variant="secondary" onClick={() => setActive(selected.id)}>使用するテンプレートに設定</ActionButton>}
              </div>
            </>
          )}
        </aside>
      </section>

      {/* 削除確認 */}
      {deleteTarget && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="modal-box panel">
            <div className="modal-header"><h2>テンプレートを削除</h2><button type="button" onClick={() => setDeleteTarget(null)} className="icon-btn" aria-label="閉じる"><X size={18} /></button></div>
            <div className="modal-form">
              <div className="delete-confirm">
                <span className="delete-confirm-icon"><AlertTriangle size={22} /></span>
                <p>「<strong>{deleteTarget.title}</strong>」を削除します。この操作は取り消せません。</p>
              </div>
              <div className="modal-actions">
                <ActionButton variant="danger" icon={<Trash2 size={15} />} onClick={doDelete}>削除する</ActionButton>
                <ActionButton type="button" variant="secondary" onClick={() => setDeleteTarget(null)}>キャンセル</ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.error ? "danger" : "success"}`} role="status">
          <span className="toast-icon">{toast.error ? <X size={20} /> : <CheckCircle2 size={20} />}</span>
          <div><strong>{toast.msg}</strong></div>
        </div>
      )}
    </>
  );
}
