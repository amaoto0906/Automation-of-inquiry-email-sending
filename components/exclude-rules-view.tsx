"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Building2, CheckCircle2, Globe2, Pencil, Plus, Search, Tags, Trash2, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle } from "@/components/ui";

interface Rule {
  id: string;
  ruleType: string;
  value: string;
  memo: string | null;
  isActive: boolean;
  createdAt: string;
}

// 表示カテゴリー（スキーマの ruleType をUI上の4区分へ正規化）
type Category = "domain" | "company" | "industry" | "ng";

const CATEGORIES: { id: Category; label: string; icon: LucideIcon; ruleType: string }[] = [
  { id: "domain", label: "ドメイン", icon: Globe2, ruleType: "domain" },
  { id: "company", label: "企業名", icon: Building2, ruleType: "company" },
  { id: "industry", label: "業種", icon: Tags, ruleType: "industry" },
  { id: "ng", label: "禁止文言", icon: Ban, ruleType: "no_solicitation" },
];

function categoryOf(ruleType: string): Category {
  if (ruleType === "domain") return "domain";
  if (ruleType === "company") return "company";
  if (ruleType === "industry") return "industry";
  return "ng"; // no_solicitation / keyword など
}
const META: Record<Category, { label: string; icon: LucideIcon }> = {
  domain: { label: "ドメイン", icon: Globe2 },
  company: { label: "企業名", icon: Building2 },
  industry: { label: "業種", icon: Tags },
  ng: { label: "禁止文言", icon: Ban },
};

type FormState = { ruleType: string; value: string; memo: string };
const EMPTY_FORM: FormState = { ruleType: "domain", value: "", memo: "" };

export function ExcludeRulesView() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");

  const [editing, setEditing] = useState<Rule | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // カード単位の削除確認（モーダル編集を経由せず、各カードから直接削除する）
  const [confirmDelete, setConfirmDelete] = useState<Rule | null>(null);
  const [cardDeleting, setCardDeleting] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  async function fetchRules() {
    const res = await fetch("/api/exclude-rules");
    if (res.ok) setRules(await res.json());
    setLoading(false);
  }
  useEffect(() => {
    fetchRules();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rules.filter((r) => {
      if (filter !== "all" && categoryOf(r.ruleType) !== filter) return false;
      if (q && !`${r.value} ${r.memo ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rules, filter, query]);

  function openNew() {
    setForm(EMPTY_FORM);
    setError("");
    setEditing("new");
  }
  function openEdit(rule: Rule) {
    setForm({ ruleType: rule.ruleType, value: rule.value, memo: rule.memo ?? "" });
    setError("");
    setEditing(rule);
  }
  function closeModal() {
    setEditing(null);
    setError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.value.trim()) {
      setError("値を入力してください。");
      return;
    }
    setSaving(true);
    setError("");
    const payload = { ruleType: form.ruleType, value: form.value.trim(), memo: form.memo.trim() || null };
    try {
      if (editing === "new") {
        const res = await fetch("/api/exclude-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "保存に失敗しました");
        const created: Rule = await res.json();
        setRules((prev) => [created, ...prev]);
        showToast("除外ルールを追加しました");
      } else if (editing) {
        const res = await fetch(`/api/exclude-rules/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("更新に失敗しました");
        const updated: Rule = await res.json();
        setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        showToast("除外ルールを更新しました");
      }
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  // 実際の削除処理（API呼び出し＋状態更新）。成否を返す。
  async function deleteRuleById(id: string): Promise<boolean> {
    const res = await fetch(`/api/exclude-rules/${id}`, { method: "DELETE" });
    if (!res.ok) return false;
    setRules((prev) => prev.filter((r) => r.id !== id));
    return true;
  }

  // 編集モーダル内からの削除
  async function remove() {
    if (editing === "new" || !editing) return;
    setDeleting(true);
    try {
      if (!(await deleteRuleById(editing.id))) throw new Error();
      showToast("除外ルールを削除しました");
      closeModal();
    } catch {
      setError("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  }

  // カードの削除ボタン → 確認ダイアログからの削除
  async function confirmRemoveCard() {
    if (!confirmDelete) return;
    setCardDeleting(true);
    const name = confirmDelete.value;
    const ok = await deleteRuleById(confirmDelete.id);
    setCardDeleting(false);
    if (ok) {
      setConfirmDelete(null);
      showToast(`「${name}」を削除しました`);
    } else {
      showToast("削除に失敗しました");
    }
  }

  const isNew = editing === "new";

  return (
    <>
      <PageTitle
        eyebrow="EXCLUSION POLICY"
        title="除外ルール"
        description="送信対象外とする企業・業種・ドメイン・禁止文言を管理します。"
        action={<ActionButton icon={<Plus size={17} />} onClick={openNew}>除外ルールを追加</ActionButton>}
      />

      <section className="policy-banner">
        <span><Ban size={22} /></span>
        <div><strong>除外ルールは送信前に必ず評価されます</strong><p>該当した対象は承認・送信できず、理由とともに履歴へ記録されます。</p></div>
        <b>保護中</b>
      </section>

      <article className="panel">
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input placeholder="ルールを検索" aria-label="除外ルールを検索" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="filter-chips compact" role="tablist" aria-label="種別で絞り込み">
            <button type="button" className={filter === "all" ? "active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>すべて</button>
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" className={filter === c.id ? "active" : ""} aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>{c.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="empty-state">読み込み中…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">{rules.length === 0 ? "除外ルールはまだ登録されていません。「除外ルールを追加」から登録してください。" : "条件に一致する除外ルールがありません。"}</p>
        ) : (
          <div className="rule-grid">
            {filtered.map((rule) => {
              const meta = META[categoryOf(rule.ruleType)];
              const Icon = meta.icon;
              return (
                <article className="rule-card" key={rule.id}>
                  <div className="rule-card-top">
                    <span><Icon size={19} /></span>
                    <small>{meta.label}</small>
                    <button type="button" onClick={() => openEdit(rule)} aria-label={`${rule.value}を編集`}><Pencil size={13} />編集</button>
                    <button type="button" className="rule-card-del" onClick={() => setConfirmDelete(rule)} aria-label={`${rule.value}を削除`}><Trash2 size={13} />削除</button>
                  </div>
                  <h3>{rule.value}</h3>
                  <p>{rule.memo ?? "—"}</p>
                  <footer>
                    <span className={`rule-state ${rule.isActive ? "on" : "off"}`}>{rule.isActive ? "有効" : "無効"}</span>
                    <span>追加日 {new Date(rule.createdAt).toLocaleDateString("ja-JP")}</span>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </article>

      {/* 追加 / 編集モーダル */}
      {editing && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-box panel">
            <div className="modal-header">
              <h2>{isNew ? "除外ルールを追加" : "除外ルールを編集"}</h2>
              <button type="button" onClick={closeModal} className="icon-btn" aria-label="閉じる"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="modal-form">
              <div className="field">
                <label htmlFor="rule-type">種別</label>
                <select id="rule-type" value={form.ruleType} onChange={(e) => setForm((f) => ({ ...f, ruleType: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.ruleType}>{c.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="rule-value">値</label>
                <input id="rule-value" required autoFocus value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="例：example-competitor.jp / 株式会社サンプル / 医療・病院" />
              </div>
              <div className="field">
                <label htmlFor="rule-memo">理由・メモ（任意）</label>
                <input id="rule-memo" value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} placeholder="例：競合企業 / 既存取引先" />
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="modal-actions">
                {!isNew && (
                  <ActionButton type="button" variant="danger" icon={<Trash2 size={15} />} loading={deleting} onClick={remove} className="modal-action-left">削除</ActionButton>
                )}
                <ActionButton type="button" variant="ghost" onClick={closeModal}>キャンセル</ActionButton>
                <ActionButton type="submit" loading={saving} icon={<Plus size={15} />}>{isNew ? "追加" : "保存"}</ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* カード削除の確認ダイアログ */}
      {confirmDelete && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !cardDeleting) setConfirmDelete(null); }}>
          <div className="modal-box panel">
            <div className="modal-header">
              <h2>除外ルールを削除</h2>
              <button type="button" onClick={() => setConfirmDelete(null)} className="icon-btn" aria-label="閉じる" disabled={cardDeleting}><X size={18} /></button>
            </div>
            <div className="modal-form">
              <div className="delete-confirm">
                <span className="delete-confirm-icon"><Trash2 size={22} /></span>
                <p>「<strong>{confirmDelete.value}</strong>」を削除します。この操作は取り消せません。</p>
              </div>
              <div className="modal-actions">
                <ActionButton type="button" variant="danger" icon={<Trash2 size={15} />} loading={cardDeleting} onClick={confirmRemoveCard}>削除する</ActionButton>
                <ActionButton type="button" variant="ghost" onClick={() => setConfirmDelete(null)} disabled={cardDeleting}>キャンセル</ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* トースト */}
      {toast && (
        <div className="toast success" role="status">
          <span className="toast-icon"><CheckCircle2 size={20} /></span>
          <div><strong>{toast}</strong></div>
        </div>
      )}
    </>
  );
}
