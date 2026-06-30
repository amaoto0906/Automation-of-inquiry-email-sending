"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, UserAvatar } from "@/components/ui";
import { manualChecks } from "@/lib/mock-data";
import { usePersistentState } from "@/lib/hooks/use-persistent-state";

interface CheckItem {
  id: string;
  company: string;
  reason: string;
  owner: string;
  date: string;
  priority: string;
  done: boolean;
}

const INITIAL: CheckItem[] = manualChecks.map((c, i) => ({ ...c, id: `mc-${i}`, done: false }));

export function ManualChecksView() {
  // ページ遷移・リロードを跨いで削除状態を保持
  const [items, setItems] = usePersistentState<CheckItem[]>("manual-checks", INITIAL);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [confirm, setConfirm] = useState<"selected" | "all" | { id: string; company: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (tab === "pending" && c.done) return false;
      if (tab === "done" && !c.done) return false;
      if (q && !`${c.company} ${c.reason}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, tab]);

  const pendingCount = useMemo(() => items.filter((c) => !c.done).length, [items]);
  const doneCount = useMemo(() => items.filter((c) => c.done).length, [items]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((c) => next.delete(c.id));
      else filtered.forEach((c) => next.add(c.id));
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

  function doDelete() {
    if (!confirm) return;
    if (confirm === "all") {
      const n = items.length;
      setItems([]);
      setSelected(new Set());
      showToast(`手動確認リスト ${n} 件をすべて削除しました`);
    } else if (confirm === "selected") {
      const n = selected.size;
      setItems((prev) => prev.filter((c) => !selected.has(c.id)));
      setSelected(new Set());
      showToast(`選択した ${n} 件を削除しました`);
    } else {
      const name = confirm.company;
      setItems((prev) => prev.filter((c) => c.id !== confirm.id));
      setSelected((prev) => { const next = new Set(prev); next.delete(confirm.id); return next; });
      showToast(`「${name}」を削除しました`);
    }
    setConfirm(null);
  }

  const confirmTitle = !confirm ? "" : confirm === "all" ? "手動確認リストをすべて削除" : confirm === "selected" ? "選択した項目を削除" : `「${confirm.company}」を削除`;
  const confirmBody = !confirm ? null : confirm === "all"
    ? <><strong>{items.length} 件</strong>の手動確認リストをすべて削除します。この操作は取り消せません。</>
    : confirm === "selected"
    ? <><strong>{selected.size} 件</strong>の項目を削除します。この操作は取り消せません。</>
    : <>「<strong>{confirm.company}</strong>」を削除します。この操作は取り消せません。</>;

  return (
    <>
      <PageTitle eyebrow="HUMAN REVIEW" title="手動確認" description="自動処理できなかった対象を、人の判断で安全に確認します。" />

      {pendingCount > 0 && (
        <div className="review-alert warning">
          <AlertTriangle size={23} />
          <div><strong>{pendingCount} 件の確認が必要です</strong><p>CAPTCHAや重複履歴がある対象は、自動送信されません。内容を確認して対応を選択してください。</p></div>
        </div>
      )}

      <article className="panel">
        <div className="table-toolbar">
          <div className="search-input"><Search size={17} /><input placeholder="企業名・理由を検索" aria-label="手動確認を検索" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <div className="filter-chips compact">
            <button type="button" className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")}>未対応 {pendingCount}</button>
            <button type="button" className={tab === "done" ? "active" : ""} onClick={() => setTab("done")}>対応済み {doneCount}</button>
          </div>
        </div>

        <div className="bulk-bar">
          <label className="bulk-select-all">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={filtered.length === 0} aria-label="すべて選択" />
            <span className="bulk-info">{selected.size > 0 ? `${selected.size} 件を選択中` : `${filtered.length} 件`}</span>
          </label>
          <div className="bulk-actions">
            {selected.size > 0 && (
              <ActionButton variant="danger" icon={<Trash2 size={15} />} onClick={() => setConfirm("selected")}>選択削除（{selected.size}）</ActionButton>
            )}
            <ActionButton variant="secondary" icon={<Trash2 size={15} />} disabled={items.length === 0} onClick={() => setConfirm("all")}>すべて削除</ActionButton>
          </div>
        </div>

        <div className="manual-list">
          {filtered.length === 0 ? (
            <p className="empty-state">{items.length === 0 ? "手動確認リストはありません。" : "条件に一致する項目がありません。"}</p>
          ) : filtered.map((item, index) => (
            <div className={`manual-item${selected.has(item.id) ? " row-selected" : ""}`} key={item.id}>
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleOne(item.id)} aria-label={`${item.company}を選択`} className="manual-item-check" />
              <span className={`priority priority-${item.priority === "高" ? "high" : "medium"}`}>{item.priority}</span>
              <div className="manual-copy"><h3>{item.company}</h3><p><ShieldCheck size={15} />{item.reason}</p><small>検出：{item.date}</small></div>
              <div className="assigned"><span>担当者</span><div>{item.owner !== "未割当" && <UserAvatar initials={item.owner.slice(0, 1)} size="sm" />}{item.owner}</div></div>
              <ActionButton href={`/review/${index === 0 && tab === "pending" ? "captcha-001" : `manual-${index + 1}`}`} variant="primary">内容を確認</ActionButton>
              <button type="button" className="manual-item-del" aria-label={`${item.company}を削除`} onClick={() => setConfirm({ id: item.id, company: item.company })}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </article>

      {/* 削除確認ダイアログ */}
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
                <ActionButton variant="danger" icon={<Trash2 size={15} />} onClick={doDelete}>削除する</ActionButton>
                <ActionButton type="button" variant="secondary" onClick={() => setConfirm(null)}>キャンセル</ActionButton>
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
