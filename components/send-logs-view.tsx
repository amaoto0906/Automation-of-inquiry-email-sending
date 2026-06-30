"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Search, Send, Trash2, X } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, StatusBadge, UserAvatar } from "@/components/ui";
import { statusLabels } from "@/lib/types";
import type { OutreachStatus } from "@/lib/types";
import { sendLogStatus } from "@/lib/status-display";

interface ApiSendLog {
  id: string;
  status: string;
  sentAt: string;
  sheetSynced: boolean;
  user: { name: string } | null;
  contactPage: {
    contactUrl: string;
    estimatedCompanyName: string | null;
    searchResult: { domain: string } | null;
  } | null;
}

interface Stats {
  sent: number;
  failed: number;
  manualCheck: number;
  successRate: number | null;
}

interface LogRow {
  id: string;
  company: string;
  domain: string;
  user: string;
  date: string;
  sentAtMs: number;
  status: OutreachStatus;
  sheetSynced: boolean;
}

const STATUS_OPTIONS: { v: string; label: string }[] = [
  { v: "all", label: "すべての状態" },
  { v: "sent", label: "送信成功" },
  { v: "failed", label: "送信失敗" },
  { v: "manual_check", label: "手動確認" },
];

function domainOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function toRow(l: ApiSendLog): LogRow {
  const domain = l.contactPage?.searchResult?.domain || (l.contactPage ? domainOf(l.contactPage.contactUrl) : "—");
  const ms = new Date(l.sentAt).getTime();
  return {
    id: l.id,
    company: l.contactPage?.estimatedCompanyName?.trim() || domain,
    domain,
    user: l.user?.name || "—",
    date: fmtTime(l.sentAt),
    sentAtMs: Number.isNaN(ms) ? 0 : ms,
    status: sendLogStatus(l.status),
    sheetSynced: l.sheetSynced,
  };
}

function buildCsv(rows: LogRow[]): string {
  const header = ["送信先", "ドメイン", "担当者", "送信日時", "送信状態"];
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [header.map(esc).join(",")];
  for (const r of rows) lines.push([r.company, r.domain, r.user, r.date, statusLabels[r.status]].map(esc).join(","));
  return "﻿" + lines.join("\r\n");
}

export function SendLogsView() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [stats, setStats] = useState<Stats>({ sent: 0, failed: 0, manualCheck: 0, successRate: null });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [confirm, setConfirm] = useState<"selected" | "all" | null>(null);
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
      const res = await fetch("/api/send-logs?limit=500", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setLogs((data.logs as ApiSendLog[]).map(toRow));
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
    const fromMs = fromDate ? new Date(fromDate).getTime() : null;
    return logs.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (fromMs != null && l.sentAtMs < fromMs) return false;
      if (q && !`${l.company} ${l.domain}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logs, query, status, fromDate]);

  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((l) => next.delete(l.id));
      else filtered.forEach((l) => next.add(l.id));
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
    const payload = confirm === "all" ? { all: true } : { ids: [...selected] };
    setBusy(true);
    try {
      const res = await fetch("/api/send-logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const n = data.deleted as number;
      showToast(confirm === "all" ? `送信履歴 ${n} 件をすべて削除しました` : `選択した ${n} 件を削除しました`);
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
    const rows = selected.size > 0 ? logs.filter((l) => selected.has(l.id)) : filtered;
    if (rows.length === 0) { showToast("出力対象がありません"); return; }
    const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `send-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast(`${rows.length} 件をCSV出力しました`);
  }

  const successRateLabel = stats.successRate == null ? "—" : `${stats.successRate}%`;

  return (
    <>
      <PageTitle
        eyebrow="DELIVERY HISTORY"
        title="送信履歴"
        description="送信結果・担当者・同期状態を時系列で確認できます。"
        action={<ActionButton variant="secondary" icon={<Download size={16} />} onClick={exportCsv}>履歴をCSV出力</ActionButton>}
      />
      <section className="mini-stats">
        <div><span className="mini-icon green"><Send size={18} /></span><p>送信成功<strong>{stats.sent}</strong></p></div>
        <div><span className="mini-icon red">!</span><p>送信失敗<strong>{stats.failed}</strong></p></div>
        <div><span className="mini-icon amber">?</span><p>手動確認<strong>{stats.manualCheck}</strong></p></div>
        <div><span className="mini-icon blue">✓</span><p>成功率<strong>{successRateLabel}</strong></p></div>
      </section>
      <article className="panel">
        <div className="table-toolbar">
          <div className="search-input"><Search size={17} /><input placeholder="企業名・ドメインを検索" aria-label="送信履歴を検索" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <div className="toolbar-actions">
            <input type="date" aria-label="開始日" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <select aria-label="送信状態" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
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
            <thead><tr><th><input type="checkbox" aria-label="すべて選択" checked={allSelected} onChange={toggleAll} disabled={loading || filtered.length === 0} /></th><th>送信先</th><th>担当者</th><th>送信日時</th><th>送信状態</th><th>シート同期</th><th>操作</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><p className="empty-state">読み込み中…</p></td></tr>
              ) : error ? (
                <tr><td colSpan={7}><p className="empty-state">データの取得に失敗しました。再読み込みしてください。</p></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}><p className="empty-state">{logs.length === 0 ? "送信履歴はありません。" : "条件に一致する送信履歴がありません。"}</p></td></tr>
              ) : filtered.map((log) => (
                <tr key={log.id} className={selected.has(log.id) ? "row-selected" : ""}>
                  <td><input type="checkbox" aria-label={`${log.company}を選択`} checked={selected.has(log.id)} onChange={() => toggleOne(log.id)} /></td>
                  <td><div className="primary-cell"><strong>{log.company}</strong><span>{log.domain}</span></div></td>
                  <td><div className="person-cell"><UserAvatar initials={log.user.slice(0, 1)} size="sm" />{log.user}</div></td>
                  <td>{log.date}</td>
                  <td><StatusBadge status={log.status} /></td>
                  <td><StatusBadge status={log.sheetSynced ? "sheet_synced" : log.status === "failed" ? "sheet_sync_failed" : "pending"} /></td>
                  <td><button className="text-link" type="button">詳細</button></td>
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
            <div className="modal-header"><h2>{confirm === "all" ? "送信履歴をすべて削除" : "選択した履歴を削除"}</h2><button type="button" onClick={() => setConfirm(null)} className="icon-btn" aria-label="閉じる"><X size={18} /></button></div>
            <div className="modal-form">
              <div className="delete-confirm">
                <span className="delete-confirm-icon"><AlertTriangle size={22} /></span>
                <p>{confirm === "all"
                  ? <>送信履歴 <strong>{total} 件</strong>をすべて削除します。この操作は取り消せません。</>
                  : <>選択した <strong>{selected.size} 件</strong>の送信履歴を削除します。この操作は取り消せません。</>}</p>
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
