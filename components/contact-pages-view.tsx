"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, RefreshCw, Search, Trash2, X } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, StatusBadge } from "@/components/ui";
import { statusLabels } from "@/lib/types";
import type { OutreachStatus } from "@/lib/types";
import { contactPageStatus } from "@/lib/status-display";

interface ApiContactPage {
  id: string;
  contactUrl: string;
  estimatedCompanyName: string | null;
  hasForm: boolean;
  requiresManualCheck: boolean;
  status: string;
  updatedAt: string;
  searchResult: { domain: string } | null;
  formFields: unknown[];
}

interface Stats {
  formFound: number;
  manualCheck: number;
  approved: number;
  noForm: number;
}

interface Row {
  id: string;
  company: string;
  url: string;
  path: string;
  fields: number;
  checked: string;
  status: OutreachStatus;
}

const STATUS_OPTIONS: { v: string; label: string }[] = [
  { v: "all", label: "すべての解析状態" },
  { v: "form_found", label: statusLabels.form_found },
  { v: "manual_check", label: statusLabels.manual_check },
  { v: "approved", label: statusLabels.approved },
  { v: "no_form", label: statusLabels.no_form },
];

function pathOf(url: string): string {
  try {
    return new URL(url).pathname || url;
  } catch {
    return url;
  }
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function toRow(p: ApiContactPage): Row {
  return {
    id: p.id,
    company: p.estimatedCompanyName?.trim() || p.searchResult?.domain || "（企業名未取得）",
    url: p.contactUrl,
    path: pathOf(p.contactUrl),
    fields: Array.isArray(p.formFields) ? p.formFields.length : 0,
    checked: fmtTime(p.updatedAt),
    status: contactPageStatus({ status: p.status, hasForm: p.hasForm, requiresManualCheck: p.requiresManualCheck }),
  };
}

export function ContactPagesView() {
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats>({ formFound: 0, manualCheck: 0, approved: 0, noForm: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [confirm, setConfirm] = useState<"selected" | "all" | { id: string; company: string } | null>(null);
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
      const res = await fetch("/api/contact-pages?limit=500", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setRows((data.pages as ApiContactPage[]).map(toRow));
      setStats(data.stats as Stats);
      setTotal(data.total as number);
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
    return rows.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (q && !`${p.company} ${p.path} ${p.url}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, status]);

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((p) => next.delete(p.id));
      else filtered.forEach((p) => next.add(p.id));
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

  async function doDelete() {
    if (!confirm || busy) return;
    const payload = confirm === "all" ? { all: true } : confirm === "selected" ? { ids: [...selected] } : { ids: [confirm.id] };
    setBusy(true);
    try {
      const res = await fetch("/api/contact-pages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const n = data.deleted as number;
      if (confirm === "all") showToast(`検出結果 ${n} 件をすべて削除しました`);
      else if (confirm === "selected") showToast(`選択した ${n} 件を削除しました`);
      else showToast(`「${confirm.company}」を削除しました`);
      setSelected(new Set());
      setConfirm(null);
      await load(true);
    } catch {
      showToast("削除に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  const confirmTitle = !confirm ? "" : confirm === "all" ? "検出結果をすべて削除" : confirm === "selected" ? "選択した項目を削除" : `「${confirm.company}」を削除`;
  const confirmBody = !confirm ? null : confirm === "all"
    ? <>検出された問い合わせフォーム <strong>{total} 件</strong>をすべて削除します。この操作は取り消せません。</>
    : confirm === "selected"
    ? <>選択した <strong>{selected.size} 件</strong>を削除します。この操作は取り消せません。</>
    : <>「<strong>{confirm.company}</strong>」を削除します。この操作は取り消せません。</>;

  return (
    <>
      <PageTitle eyebrow="FORM DETECTION" title="問い合わせフォーム検出" description="検出された問い合わせページと入力項目の解析状態を管理します。" action={<ActionButton icon={<RefreshCw size={16} />} onClick={() => load()}>最新の状態に更新</ActionButton>} />
      <section className="mini-stats">
        <div><span className="mini-icon blue"><FileSearch size={19} /></span><p>フォーム検出<strong>{stats.formFound}</strong></p></div>
        <div><span className="mini-icon amber">!</span><p>手動確認<strong>{stats.manualCheck}</strong></p></div>
        <div><span className="mini-icon green">✓</span><p>承認済み<strong>{stats.approved}</strong></p></div>
        <div><span className="mini-icon gray">—</span><p>フォームなし<strong>{stats.noForm}</strong></p></div>
      </section>
      <article className="panel">
        <div className="table-toolbar">
          <div className="search-input"><Search size={17} /><input placeholder="企業名・URLを検索" aria-label="企業名・URLを検索" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <select aria-label="解析状態" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </div>

        <div className="bulk-bar">
          <span className="bulk-info">{loading ? "読み込み中…" : selected.size > 0 ? `${selected.size} 件を選択中` : `全 ${filtered.length} 件`}</span>
          <div className="bulk-actions">
            {/* 未選択時も領域を確保（選択でレイアウトが動かない＝画面が揺れない） */}
            <ActionButton variant="danger" icon={<Trash2 size={15} />} onClick={() => setConfirm("selected")} className={selected.size === 0 ? "slot-reserved" : ""} disabled={selected.size === 0} aria-hidden={selected.size === 0} tabIndex={selected.size === 0 ? -1 : undefined}>選択削除（{selected.size}）</ActionButton>
            <ActionButton variant="secondary" icon={<Trash2 size={15} />} disabled={loading || total === 0} onClick={() => setConfirm("all")}>すべて削除</ActionButton>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th><input type="checkbox" aria-label="すべて選択" checked={allSelected} onChange={toggleAll} disabled={loading || filtered.length === 0} /></th><th>企業</th><th>問い合わせページ</th><th>検出項目</th><th>最終解析</th><th>状態</th><th>操作</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><p className="empty-state">読み込み中…</p></td></tr>
              ) : error ? (
                <tr><td colSpan={7}><p className="empty-state">データの取得に失敗しました。再読み込みしてください。</p></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}><p className="empty-state">{rows.length === 0 ? "検出されたフォームはありません。" : "条件に一致するフォームがありません。"}</p></td></tr>
              ) : filtered.map((page) => (
                <tr key={page.id} className={selected.has(page.id) ? "row-selected" : ""}>
                  <td><input type="checkbox" aria-label={`${page.company}を選択`} checked={selected.has(page.id)} onChange={() => toggleOne(page.id)} /></td>
                  <td><strong>{page.company}</strong></td>
                  <td><a className="mono-link" href={page.url} target="_blank" rel="noreferrer">{page.path}</a></td>
                  <td>{page.fields} 項目</td>
                  <td>{page.checked}</td>
                  <td><StatusBadge status={page.status} /></td>
                  <td>
                    <div className="cell-actions">
                      <ActionButton href={`/review/${page.id}`} variant={page.status === "approved" ? "secondary" : "ghost"}>{page.status === "approved" ? "確認済み" : "確認する"}</ActionButton>
                      <button type="button" className="row-delete" aria-label={`${page.company}を削除`} onClick={() => setConfirm({ id: page.id, company: page.company })}><Trash2 size={15} />削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {/* 削除確認 */}
      {confirm && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}>
          <div className="modal-box panel">
            <div className="modal-header"><h2>{confirmTitle}</h2><button type="button" onClick={() => setConfirm(null)} className="icon-btn" aria-label="閉じる"><X size={18} /></button></div>
            <div className="modal-form">
              <div className="delete-confirm">
                <span className="delete-confirm-icon"><AlertTriangle size={22} /></span>
                <p>{confirmBody}</p>
              </div>
              <div className="modal-actions">
                <ActionButton variant="danger" icon={<Trash2 size={15} />} onClick={doDelete} disabled={busy}>{busy ? "削除中…" : "削除する"}</ActionButton>
                <ActionButton type="button" variant="secondary" onClick={() => setConfirm(null)} disabled={busy}>キャンセル</ActionButton>
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
