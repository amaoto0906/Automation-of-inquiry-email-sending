"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Filter, Search, Trash2, X } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, StatusBadge } from "@/components/ui";
import { statusLabels } from "@/lib/types";
import type { OutreachStatus } from "@/lib/types";
import { asOutreachStatus } from "@/lib/status-display";

interface ApiSearchResult {
  id: string;
  url: string;
  domain: string;
  title: string | null;
  status: string;
  createdAt: string;
  keyword: { query: string; name: string } | null;
  _count: { contactPages: number };
}

interface Result {
  id: string;
  company: string;
  url: string;
  keyword: string;
  found: string;
  status: OutreachStatus;
  hasContactPage: boolean;
}

type FilterId = "all" | "form" | "review" | "excluded";

const STATUS_FILTERS: { id: FilterId; label: string; match: (s: OutreachStatus) => boolean }[] = [
  { id: "all", label: "すべて", match: () => true },
  { id: "form", label: "フォーム検出", match: (s) => s === "form_found" },
  { id: "review", label: "確認待ち", match: (s) => ["contact_page_found", "captcha_detected", "manual_check", "pending"].includes(s) },
  { id: "excluded", label: "除外", match: (s) => s === "excluded" },
];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function toResult(r: ApiSearchResult): Result {
  return {
    id: r.id,
    company: r.title?.trim() || r.domain,
    url: r.url,
    keyword: r.keyword?.name || r.keyword?.query || "—",
    found: fmtTime(r.createdAt),
    status: asOutreachStatus(r.status),
    hasContactPage: r._count.contactPages > 0,
  };
}

function buildCsv(rows: Result[]): string {
  const header = ["企業名", "URL", "検索キーワード", "検出", "ステータス"];
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [header.map(esc).join(",")];
  for (const r of rows) {
    lines.push([r.company, r.url, r.keyword, r.found, statusLabels[r.status]].map(esc).join(","));
  }
  // 先頭にBOMを付与し、ExcelでUTF-8日本語が文字化けしないようにする
  return "﻿" + lines.join("\r\n");
}

export function SearchResultsView() {
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [keyword, setKeyword] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
      const res = await fetch("/api/search-results?limit=500", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setResults((data.results as ApiSearchResult[]).map(toResult));
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

  const keywords = useMemo(() => [...new Set(results.map((r) => r.keyword))], [results]);

  // 検索語・キーワードで絞り込んだ母集合（ステータスチップの件数算出に使用）
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return results.filter((r) => {
      if (keyword !== "all" && r.keyword !== keyword) return false;
      if (q && !`${r.company} ${r.url}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [results, query, keyword]);

  const filtered = useMemo(() => {
    const f = STATUS_FILTERS.find((x) => x.id === filter)!;
    return base.filter((r) => f.match(r.status));
  }, [base, filter]);

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = { all: 0, form: 0, review: 0, excluded: 0 };
    for (const f of STATUS_FILTERS) c[f.id] = base.filter((r) => f.match(r.status)).length;
    return c;
  }, [base]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((r) => next.delete(r.id));
      else filtered.forEach((r) => next.add(r.id));
      return next;
    });
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function doDelete() {
    if (!confirm || busy) return;
    const payload = confirm === "all" ? { all: true } : confirm === "selected" ? { ids: [...selected] } : { ids: [confirm.id] };
    setBusy(true);
    try {
      const res = await fetch("/api/search-results", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const n = data.deleted as number;
      if (confirm === "all") showToast(`検索結果 ${n} 件をすべて削除しました`);
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

  function exportCsv() {
    // 選択行があれば選択行のみ、なければフィルタ条件に従って出力
    const useSelection = selected.size > 0;
    const rows = useSelection ? results.filter((r) => selected.has(r.id)) : filtered;
    if (rows.length === 0) {
      showToast("出力対象がありません");
      return;
    }
    const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `search-results-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(useSelection ? `選択した ${rows.length} 件をCSV出力しました` : `絞り込み結果 ${rows.length} 件をCSV出力しました`);
  }

  const confirmTitle = !confirm ? "" : confirm === "all" ? "検索結果をすべて削除" : confirm === "selected" ? "選択した項目を削除" : `「${confirm.company}」を削除`;
  const confirmBody = !confirm ? null : confirm === "all"
    ? <>検索結果 <strong>{total} 件</strong>をすべて削除します。この操作は取り消せません。</>
    : confirm === "selected"
    ? <>選択した <strong>{selected.size} 件</strong>を削除します。この操作は取り消せません。</>
    : <>「<strong>{confirm.company}</strong>」を削除します。この操作は取り消せません。</>;

  return (
    <>
      <PageTitle
        eyebrow="DISCOVERED TARGETS"
        title="検索結果"
        description="キーワード検索で検出した企業・Webサイトを確認します。"
        action={<ActionButton variant="secondary" icon={<Download size={16} />} onClick={exportCsv}>CSV出力{selected.size > 0 ? `（${selected.size}件）` : ""}</ActionButton>}
      />
      <article className="panel">
        <div className="table-toolbar">
          <div className="search-input wide"><Search size={17} /><input aria-label="企業名またはURLで検索" placeholder="企業名またはURLで検索" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <div className="toolbar-actions">
            <select aria-label="キーワード" value={keyword} onChange={(e) => setKeyword(e.target.value)}>
              <option value="all">すべてのキーワード</option>
              {keywords.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <button className="filter-button" type="button"><Filter size={16} />詳細フィルター</button>
          </div>
        </div>
        <div className="filter-chips">
          {STATUS_FILTERS.map((f) => (
            <button key={f.id} type="button" className={filter === f.id ? "active" : ""} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label} <b>{counts[f.id]}</b>
            </button>
          ))}
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
            <thead><tr><th><input type="checkbox" aria-label="すべて選択" checked={allSelected} onChange={toggleAll} disabled={loading || filtered.length === 0} /></th><th>企業・サイト</th><th>検索キーワード</th><th>検出</th><th>ステータス</th><th>操作</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}><p className="empty-state">読み込み中…</p></td></tr>
              ) : error ? (
                <tr><td colSpan={6}><p className="empty-state">データの取得に失敗しました。再読み込みしてください。</p></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6}><p className="empty-state">{results.length === 0 ? "検索結果はありません。" : "条件に一致する検索結果がありません。"}</p></td></tr>
              ) : filtered.map((result) => (
                <tr key={result.id} className={selected.has(result.id) ? "row-selected" : ""}>
                  <td><input type="checkbox" aria-label={`${result.company}を選択`} checked={selected.has(result.id)} onChange={() => toggleOne(result.id)} /></td>
                  <td><div className="primary-cell"><strong>{result.company}</strong><a href={result.url} target="_blank" rel="noreferrer">{result.url}</a></div></td>
                  <td>{result.keyword}</td>
                  <td>{result.found}</td>
                  <td><StatusBadge status={result.status} /></td>
                  <td>
                    <div className="cell-actions">
                      <ActionButton href="/contact-pages" variant="ghost">詳細</ActionButton>
                      <button type="button" className="row-delete" aria-label={`${result.company}を削除`} onClick={() => setConfirm({ id: result.id, company: result.company })}><Trash2 size={15} />削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>{selected.size > 0 ? `${selected.size} 件を選択中・` : ""}全 {filtered.length} 件を表示</span>
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
