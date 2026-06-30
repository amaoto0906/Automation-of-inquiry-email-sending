"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle } from "@/components/ui";

interface ApiKeyword {
  id: string;
  name: string;
  query: string;
  region: string | null;
  memo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  urlCount: number;
  formCount: number;
  sentCount: number;
}

interface Stats {
  total: number;
  active: number;
  activeRate: number;
  monthUrlCount: number;
}

type FormState = { name: string; query: string; region: string; memo: string };
const EMPTY_FORM: FormState = { name: "", query: "", region: "", memo: "" };

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function KeywordsView() {
  const [rows, setRows] = useState<ApiKeyword[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, activeRate: 0, monthUrlCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  // 追加モーダル
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // 削除確認（"selected" | "all" | 単一行）
  const [confirm, setConfirm] = useState<"selected" | "all" | { id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/keywords", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setRows(data.keywords as ApiKeyword[]);
      setStats(data.stats as Stats);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((k) => {
      if (status === "active" && !k.isActive) return false;
      if (status === "inactive" && k.isActive) return false;
      if (q && !`${k.name} ${k.query}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, status]);

  const allSelected = filtered.length > 0 && filtered.every((k) => selected.has(k.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((k) => next.delete(k.id));
      else filtered.forEach((k) => next.add(k.id));
      return next;
    });
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // 追加
  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError("");
    setAdding(true);
  }
  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.query.trim()) {
      setFormError("キーワード名と検索クエリは必須です。");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          query: form.query.trim(),
          region: form.region.trim() || null,
          memo: form.memo.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "登録に失敗しました");
      setAdding(false);
      showToast(`キーワード「${form.name.trim()}」を追加しました`);
      await load(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  // 削除
  async function doDelete() {
    if (!confirm || busy) return;
    const payload = confirm === "all" ? { all: true } : confirm === "selected" ? { ids: [...selected] } : { ids: [confirm.id] };
    setBusy(true);
    try {
      const res = await fetch("/api/keywords", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const n = data.deleted as number;
      if (confirm === "all") showToast(`キーワード ${n} 件をすべて削除しました`);
      else if (confirm === "selected") showToast(`選択した ${n} 件を削除しました`);
      else showToast(`「${confirm.name}」を削除しました`);
      setSelected(new Set());
      setConfirm(null);
      await load(true);
    } catch {
      showToast("削除に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  const confirmTitle = !confirm ? "" : confirm === "all" ? "キーワードをすべて削除" : confirm === "selected" ? "選択した項目を削除" : `「${confirm.name}」を削除`;
  const confirmBody = !confirm ? null : confirm === "all"
    ? <>登録済みのキーワード <strong>{stats.total} 件</strong>をすべて削除します。関連する検索結果・検出フォーム・送信履歴も削除され、この操作は取り消せません。</>
    : confirm === "selected"
    ? <>選択した <strong>{selected.size} 件</strong>を削除します。関連する検索結果・検出フォーム・送信履歴も削除され、この操作は取り消せません。</>
    : <>「<strong>{confirm.name}</strong>」を削除します。関連する検索結果・検出フォーム・送信履歴も削除され、この操作は取り消せません。</>;

  return (
    <>
      <PageTitle
        eyebrow="LEAD DISCOVERY"
        title="検索キーワード"
        description="問い合わせ先候補の収集に使用するキーワードを管理します。"
        action={<ActionButton icon={<Plus size={17} />} onClick={openAdd}>キーワードを追加</ActionButton>}
      />

      <div className="summary-strip">
        <div><span>登録済み</span><strong>{stats.total}</strong><small>キーワード総数</small></div>
        <div><span>有効</span><strong>{stats.active}</strong><small>現在収集中</small></div>
        <div><span>今月の検出URL</span><strong>{stats.monthUrlCount.toLocaleString()}</strong><small>今月の新規</small></div>
        <div className="summary-progress"><span>稼働中の割合</span><div className="progress-track"><i style={{ width: `${stats.activeRate}%` }} /></div><small>{stats.activeRate}%</small></div>
      </div>

      <article className="panel">
        <div className="table-toolbar">
          <div className="search-input"><Search size={17} /><input aria-label="キーワードを検索" placeholder="キーワード名・クエリで検索" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <div className="toolbar-actions">
            <select aria-label="状態で絞り込む" value={status} onChange={(e) => setStatus(e.target.value as "all" | "active" | "inactive")}>
              <option value="all">すべての状態</option>
              <option value="active">有効</option>
              <option value="inactive">停止中</option>
            </select>
            <ActionButton variant="secondary" icon={<RefreshCw size={16} />} onClick={() => load()}>更新</ActionButton>
          </div>
        </div>

        <div className="bulk-bar">
          <span className="bulk-info">{loading ? "読み込み中…" : selected.size > 0 ? `${selected.size} 件を選択中` : `全 ${filtered.length} 件`}</span>
          <div className="bulk-actions">
            <ActionButton variant="danger" icon={<Trash2 size={15} />} onClick={() => setConfirm("selected")} className={selected.size === 0 ? "slot-reserved" : ""} disabled={selected.size === 0} aria-hidden={selected.size === 0} tabIndex={selected.size === 0 ? -1 : undefined}>選択削除（{selected.size}）</ActionButton>
            <ActionButton variant="secondary" icon={<Trash2 size={15} />} disabled={loading || stats.total === 0} onClick={() => setConfirm("all")}>すべて削除</ActionButton>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="すべて選択" checked={allSelected} onChange={toggleAll} disabled={loading || filtered.length === 0} /></th>
                <th>キーワード</th><th>検出URL</th><th>フォーム</th><th>送信済み</th><th>状態</th><th>最終更新</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><p className="empty-state">読み込み中…</p></td></tr>
              ) : error ? (
                <tr><td colSpan={8}><p className="empty-state">データの取得に失敗しました。再読み込みしてください。</p></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}><p className="empty-state">{rows.length === 0 ? "登録済みのキーワードはありません。「キーワードを追加」から登録してください。" : "条件に一致するキーワードがありません。"}</p></td></tr>
              ) : filtered.map((keyword) => (
                <tr key={keyword.id} className={selected.has(keyword.id) ? "row-selected" : ""}>
                  <td><input type="checkbox" aria-label={`${keyword.name}を選択`} checked={selected.has(keyword.id)} onChange={() => toggleOne(keyword.id)} /></td>
                  <td><a className="primary-link" href={`/keywords/${keyword.id}`}>{keyword.name}</a></td>
                  <td>{keyword.urlCount}</td>
                  <td>{keyword.formCount}</td>
                  <td>{keyword.sentCount}</td>
                  <td><span className={`toggle-status ${keyword.isActive ? "on" : ""}`}><i />{keyword.isActive ? "有効" : "停止中"}</span></td>
                  <td className="muted-cell">{fmtDateTime(keyword.updatedAt)}</td>
                  <td>
                    <div className="cell-actions">
                      <button type="button" className="row-delete" aria-label={`${keyword.name}を削除`} onClick={() => setConfirm({ id: keyword.id, name: keyword.name })}><Trash2 size={15} />削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>全 {filtered.length} 件を表示</span></div>
      </article>

      {/* 追加モーダル */}
      {adding && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setAdding(false); }}>
          <div className="modal-box panel">
            <div className="modal-header">
              <h2>キーワードを追加</h2>
              <button type="button" onClick={() => setAdding(false)} className="icon-btn" aria-label="閉じる" disabled={saving}><X size={18} /></button>
            </div>
            <form onSubmit={submitAdd} className="modal-form">
              <div className="field">
                <label htmlFor="kw-name">キーワード名</label>
                <input id="kw-name" required autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="例：東京 Web制作会社" />
              </div>
              <div className="field">
                <label htmlFor="kw-query">検索クエリ</label>
                <input id="kw-query" required value={form.query} onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))} placeholder="例：東京 Web制作会社 問い合わせ" />
              </div>
              <div className="field">
                <label htmlFor="kw-region">対象地域（任意）</label>
                <input id="kw-region" value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} placeholder="例：jp / 東京" />
              </div>
              <div className="field">
                <label htmlFor="kw-memo">メモ（任意）</label>
                <input id="kw-memo" value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} placeholder="例：今期の重点ターゲット" />
              </div>
              {formError && <p className="form-error">{formError}</p>}
              <div className="modal-actions">
                <ActionButton type="button" variant="ghost" onClick={() => setAdding(false)} disabled={saving}>キャンセル</ActionButton>
                <ActionButton type="submit" loading={saving} icon={<Plus size={15} />}>追加</ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 削除確認 */}
      {confirm && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setConfirm(null); }}>
          <div className="modal-box panel">
            <div className="modal-header"><h2>{confirmTitle}</h2><button type="button" onClick={() => setConfirm(null)} className="icon-btn" aria-label="閉じる" disabled={busy}><X size={18} /></button></div>
            <div className="modal-form">
              <div className="delete-confirm">
                <span className="delete-confirm-icon"><AlertTriangle size={22} /></span>
                <p>{confirmBody}</p>
              </div>
              <div className="modal-actions">
                <ActionButton variant="danger" icon={<Trash2 size={15} />} onClick={doDelete} loading={busy}>削除する</ActionButton>
                <ActionButton type="button" variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>キャンセル</ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast success" role="status">
          <span className="toast-icon"><CheckCircle2 size={20} /></span>
          <div><strong>{toast}</strong></div>
        </div>
      )}
    </>
  );
}
