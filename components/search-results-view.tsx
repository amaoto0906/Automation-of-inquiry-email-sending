"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Filter, Search } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, StatusBadge } from "@/components/ui";
import { searchResults } from "@/lib/mock-data";
import { statusLabels } from "@/lib/types";
import type { OutreachStatus } from "@/lib/types";

type FilterId = "all" | "form" | "review" | "excluded";

const STATUS_FILTERS: { id: FilterId; label: string; match: (s: OutreachStatus) => boolean }[] = [
  { id: "all", label: "すべて", match: () => true },
  { id: "form", label: "フォーム検出", match: (s) => s === "form_found" },
  { id: "review", label: "確認待ち", match: (s) => ["contact_page_found", "captcha_detected", "manual_check", "pending"].includes(s) },
  { id: "excluded", label: "除外", match: (s) => s === "excluded" },
];

function buildCsv(rows: typeof searchResults): string {
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
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [keyword, setKeyword] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keywords = useMemo(() => [...new Set(searchResults.map((r) => r.keyword))], []);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  // 検索語・キーワードで絞り込んだ母集合（ステータスチップの件数算出に使用）
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return searchResults.filter((r) => {
      if (keyword !== "all" && r.keyword !== keyword) return false;
      if (q && !`${r.company} ${r.url}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, keyword]);

  const filtered = useMemo(() => {
    const f = STATUS_FILTERS.find((x) => x.id === filter)!;
    return base.filter((r) => f.match(r.status));
  }, [base, filter]);

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = { all: 0, form: 0, review: 0, excluded: 0 };
    for (const f of STATUS_FILTERS) c[f.id] = base.filter((r) => f.match(r.status)).length;
    return c;
  }, [base]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.url));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((r) => next.delete(r.url));
      else filtered.forEach((r) => next.add(r.url));
      return next;
    });
  }
  function toggleOne(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function exportCsv() {
    // 選択行があれば選択行のみ、なければフィルタ条件に従って出力
    const useSelection = selected.size > 0;
    const rows = useSelection ? searchResults.filter((r) => selected.has(r.url)) : filtered;
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
        <div className="table-wrap">
          <table>
            <thead><tr><th><input type="checkbox" aria-label="すべて選択" checked={allSelected} onChange={toggleAll} /></th><th>企業・サイト</th><th>検索キーワード</th><th>検出</th><th>ステータス</th><th>操作</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><p className="empty-state">条件に一致する検索結果がありません。</p></td></tr>
              ) : filtered.map((result) => (
                <tr key={result.url} className={selected.has(result.url) ? "row-selected" : ""}>
                  <td><input type="checkbox" aria-label={`${result.company}を選択`} checked={selected.has(result.url)} onChange={() => toggleOne(result.url)} /></td>
                  <td><div className="primary-cell"><strong>{result.company}</strong><a href={result.url}>{result.url}</a></div></td>
                  <td>{result.keyword}</td>
                  <td>{result.found}</td>
                  <td><StatusBadge status={result.status} /></td>
                  <td><ActionButton href={result.status === "form_found" ? "/review/result-001" : "/contact-pages"} variant="ghost">詳細</ActionButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>{selected.size > 0 ? `${selected.size} 件を選択中・` : ""}全 {filtered.length} 件を表示</span>
        </div>
      </article>

      {toast && (
        <div className="toast success" role="status">
          <span className="toast-icon"><CheckCircle2 size={20} /></span>
          <div><strong>{toast}</strong></div>
        </div>
      )}
    </>
  );
}
