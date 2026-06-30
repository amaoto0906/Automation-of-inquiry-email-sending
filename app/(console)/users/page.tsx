"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, CheckCircle2, Clock, KeyRound, Mail, Plus, RotateCcw, ShieldCheck, Trash2, UserCheck, UsersRound, X, Eye, EyeOff } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, UserAvatar } from "@/components/ui";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  status: string;
  emailVerified: boolean;
  company: string | null;
  department: string | null;
  position: string | null;
  phone: string | null;
  createdAt: string;
}

interface ResetRequest {
  id: string;
  userId: string;
  name: string;
  email: string;
  company: string | null;
  createdAt: string;
}

interface EmailChangeRequest {
  id: string;
  userId: string;
  name: string;
  currentEmail: string;
  newEmail: string;
  company: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active: { label: "有効", cls: "status-success" },
  pending: { label: "承認待ち", cls: "status-warning" },
  pending_verification: { label: "メール認証待ち", cls: "status-info" },
  rejected: { label: "却下", cls: "status-danger" },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", password: "", role: "member" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteFor, setDeleteFor] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resets, setResets] = useState<ResetRequest[]>([]);
  const [emailChanges, setEmailChanges] = useState<EmailChangeRequest[]>([]);

  function showToast(msg: string, error = false) {
    setToast({ msg, error });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  async function fetchUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers((await res.json()).users ?? []);
    setLoading(false);
  }
  async function fetchResets() {
    const res = await fetch("/api/password-resets");
    if (res.ok) setResets((await res.json()).requests ?? []);
  }
  async function fetchEmailChanges() {
    const res = await fetch("/api/email-changes");
    if (res.ok) setEmailChanges((await res.json()).requests ?? []);
  }
  useEffect(() => {
    fetchUsers();
    fetchResets();
    fetchEmailChanges();
    fetch("/api/profile").then(async (r) => { if (r.ok) setMeId((await r.json()).user?.id ?? null); });
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/users", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowInvite(false);
      setForm({ name: "", email: "", company: "", password: "", role: "member" });
      fetchUsers();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "招待に失敗しました");
    }
    setSaving(false);
  }

  async function decide(id: string, action: "approve" | "reject" | "reconsider", reason?: string) {
    setBusyId(id);
    await fetch(`/api/users/${id}/approval`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }),
    });
    setBusyId(null);
    setRejectFor(null);
    setRejectReason("");
    fetchUsers();
  }

  async function deleteUser(id: string) {
    setBusyId(id);
    setDeleteError("");
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) {
      setDeleteFor(null);
      fetchUsers();
    } else {
      const d = await res.json().catch(() => ({}));
      setDeleteError(d.error ?? "削除に失敗しました。");
    }
  }

  async function toggleActive(u: User) {
    const next = !u.isActive;
    setBusyId(u.id);
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: next }),
    });
    setBusyId(null);
    if (res.ok) {
      setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, isActive: next } : x)));
      showToast(next ? `${u.name} を有効化しました` : `${u.name} を無効化しました`);
    } else {
      const d = await res.json().catch(() => ({}));
      showToast(d.error ?? "状態の更新に失敗しました", true);
    }
  }

  async function resetPassword(req: ResetRequest) {
    setBusyId(req.id);
    const res = await fetch(`/api/password-resets/${req.id}`, { method: "POST" });
    setBusyId(null);
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      setResets(prev => prev.filter(r => r.id !== req.id));
      showToast(`${req.name} のパスワードを「${d.tempPassword ?? "12345678"}」にリセットしました`);
    } else {
      const d = await res.json().catch(() => ({}));
      showToast(d.error ?? "リセットに失敗しました", true);
    }
  }

  async function dismissReset(req: ResetRequest) {
    setBusyId(req.id);
    const res = await fetch(`/api/password-resets/${req.id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) {
      setResets(prev => prev.filter(r => r.id !== req.id));
      showToast(`${req.name} のリセット申請を却下しました`);
    } else {
      showToast("却下に失敗しました", true);
    }
  }

  async function approveEmailChange(req: EmailChangeRequest) {
    setBusyId(req.id);
    const res = await fetch(`/api/email-changes/${req.id}`, { method: "POST" });
    setBusyId(null);
    if (res.ok) {
      setEmailChanges(prev => prev.filter(r => r.id !== req.id));
      showToast(`${req.name} のメールアドレスを ${req.newEmail} に変更しました`);
      fetchUsers();
    } else {
      const d = await res.json().catch(() => ({}));
      showToast(d.error ?? "承認に失敗しました", true);
    }
  }

  async function dismissEmailChange(req: EmailChangeRequest) {
    setBusyId(req.id);
    const res = await fetch(`/api/email-changes/${req.id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) {
      setEmailChanges(prev => prev.filter(r => r.id !== req.id));
      showToast(`${req.name} のメール変更申請を却下しました`);
    } else {
      showToast("却下に失敗しました", true);
    }
  }

  const pending = users.filter(u => u.status === "pending");
  const team = users.filter(u => u.status !== "pending");
  const adminCount = users.filter(u => u.role === "admin").length;
  const activeCount = users.filter(u => u.status === "active" && u.isActive).length;

  return (
    <>
      <PageTitle
        eyebrow="TEAM MANAGEMENT"
        title="ユーザー管理"
        description="新規登録の承認、メンバーの招待、権限を管理します。"
        action={<ActionButton icon={<Plus size={17} />} onClick={() => setShowInvite(true)}>メンバーを招待</ActionButton>}
      />

      <section className="mini-stats">
        <div><span className="mini-icon blue"><UsersRound size={19} /></span><p>登録ユーザー<strong>{users.length}</strong></p></div>
        <div><span className="mini-icon amber"><Clock size={19} /></span><p>承認待ち<strong>{pending.length}</strong></p></div>
        <div><span className="mini-icon green"><UserCheck size={19} /></span><p>有効<strong>{activeCount}</strong></p></div>
        <div><span className="mini-icon indigo"><ShieldCheck size={19} /></span><p>管理者<strong>{adminCount}</strong></p></div>
      </section>

      {/* 承認待ち */}
      {pending.length > 0 && (
        <article className="panel approval-section">
          <div className="section-header">
            <div><h2>承認待ちの新規登録（{pending.length}）</h2><p>内容を確認し、承認または却下してください</p></div>
          </div>
          <div className="approval-list">
            {pending.map(u => (
              <div className="approval-item" key={u.id}>
                <UserAvatar initials={u.name.slice(0, 2)} size="lg" />
                <div className="approval-info">
                  <strong>{u.name}</strong>
                  <span className="approval-meta"><Building2 size={13} />{u.company ?? "—"}{u.department ? ` / ${u.department}` : ""}{u.position ? ` / ${u.position}` : ""}</span>
                  <span className="approval-sub">{u.email}{u.phone ? `・${u.phone}` : ""}</span>
                  <span className="detected-label"><Check size={12} />メール認証済み</span>
                </div>
                <div className="approval-actions">
                  <ActionButton loading={busyId === u.id} onClick={() => decide(u.id, "approve")} icon={<Check size={15} />}>承認</ActionButton>
                  <ActionButton variant="secondary" onClick={() => setRejectFor(u)}>却下</ActionButton>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* パスワードリセット申請 */}
      {resets.length > 0 && (
        <article className="panel approval-section reset-section">
          <div className="section-header">
            <div><h2>パスワードリセット申請（{resets.length}）</h2><p>内容を確認し、リセットを実行してください。リセット後のパスワードは「12345678」です。</p></div>
          </div>
          <div className="approval-list">
            {resets.map(req => (
              <div className="approval-item" key={req.id}>
                <span className="reset-avatar"><KeyRound size={20} /></span>
                <div className="approval-info">
                  <strong>{req.name}</strong>
                  <span className="approval-sub">{req.email}{req.company ? `・${req.company}` : ""}</span>
                  <span className="detected-label reset"><Clock size={12} />{new Date(req.createdAt).toLocaleString("ja-JP")} に申請</span>
                </div>
                <div className="approval-actions">
                  <ActionButton loading={busyId === req.id} onClick={() => resetPassword(req)} icon={<KeyRound size={15} />}>パスワードリセット</ActionButton>
                  <ActionButton variant="secondary" disabled={busyId === req.id} onClick={() => dismissReset(req)}>却下</ActionButton>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* メールアドレス変更申請 */}
      {emailChanges.length > 0 && (
        <article className="panel approval-section email-section">
          <div className="section-header">
            <div><h2>メールアドレス変更申請（{emailChanges.length}）</h2><p>内容を確認し、承認するとユーザーのメールアドレスが更新されます。</p></div>
          </div>
          <div className="approval-list">
            {emailChanges.map(req => (
              <div className="approval-item" key={req.id}>
                <span className="email-avatar"><Mail size={20} /></span>
                <div className="approval-info">
                  <strong>{req.name}{req.company ? `（${req.company}）` : ""}</strong>
                  <span className="approval-sub email-diff">{req.currentEmail} <span className="email-arrow">→</span> <strong>{req.newEmail}</strong></span>
                  <span className="detected-label email"><Clock size={12} />{new Date(req.createdAt).toLocaleString("ja-JP")} に申請</span>
                </div>
                <div className="approval-actions">
                  <ActionButton loading={busyId === req.id} onClick={() => approveEmailChange(req)} icon={<Check size={15} />}>承認して変更</ActionButton>
                  <ActionButton variant="secondary" disabled={busyId === req.id} onClick={() => dismissEmailChange(req)}>却下</ActionButton>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* メンバー一覧 */}
      <article className="panel">
        <div className="section-header"><div><h2>チームメンバー</h2><p>各ユーザーの操作は監査ログへ記録されます</p></div></div>
        <div className="table-wrap">
          {loading ? <p className="empty-state">読み込み中…</p> : (
            <table>
              <thead><tr><th>ユーザー</th><th>会社</th><th>権限</th><th>状態</th><th>登録日</th><th className="col-action">有効/無効</th><th className="col-action">削除</th><th className="col-action">再確認</th></tr></thead>
              <tbody>
                {team.map(u => {
                  // 承認済み(active)でも管理者により無効化されている場合は「停止中」を表示
                  const st = u.status === "active" && !u.isActive
                    ? { label: "停止中", cls: "status-muted" }
                    : STATUS_LABEL[u.status] ?? STATUS_LABEL.active;
                  return (
                    <tr key={u.id}>
                      <td><div className="user-cell"><UserAvatar initials={u.name.slice(0, 2)} /><div><strong>{u.name}</strong><span>{u.email}</span></div></div></td>
                      <td className="muted-cell">{u.company ?? "—"}</td>
                      <td><span className={`role-badge ${u.role === "admin" ? "admin" : ""}`}>{u.role === "admin" ? "管理者" : "メンバー"}</span></td>
                      <td><span className={`status-badge ${st.cls}`}><span className="status-dot" />{st.label}</span></td>
                      <td>{new Date(u.createdAt).toLocaleDateString("ja-JP")}</td>
                      {/* 有効/無効 */}
                      <td className="col-action">
                        {u.status === "active" ? (
                          <label className="row-toggle" title={u.id === meId ? "ご自身のアカウントは無効化できません" : u.isActive ? "クリックで無効化" : "クリックで有効化"}>
                            <input type="checkbox" checked={u.isActive} disabled={u.id === meId || busyId === u.id} onChange={() => toggleActive(u)} aria-label={`${u.name}を${u.isActive ? "無効化" : "有効化"}`} />
                            <span className="switch" />
                            <span className="row-toggle-label">{u.isActive ? "有効" : "無効"}</span>
                          </label>
                        ) : <span className="row-na">—</span>}
                      </td>
                      {/* 削除 */}
                      <td className="col-action">
                        {u.id !== meId ? (
                          <button className="row-delete" onClick={() => { setDeleteError(""); setDeleteFor(u); }} aria-label={`${u.name}を削除`}>
                            <Trash2 size={15} />削除
                          </button>
                        ) : <span className="row-na">—</span>}
                      </td>
                      {/* 再確認 */}
                      <td className="col-action">
                        {u.status === "rejected" ? (
                          <button className="row-reconsider" onClick={() => decide(u.id, "reconsider")} disabled={busyId === u.id} aria-label={`${u.name}を再確認`}>
                            <RotateCcw size={14} />再確認
                          </button>
                        ) : <span className="row-na">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </article>

      {/* 招待モーダル */}
      {showInvite && (
        <div className="modal-backdrop">
          <div className="modal-box panel">
            <div className="modal-header"><h2>新しいメンバーを招待</h2><button onClick={() => setShowInvite(false)} className="icon-btn"><X size={18} /></button></div>
            <form onSubmit={handleInvite} className="modal-form">
              {error && <div className="review-alert danger">{error}</div>}
              <div className="field"><label htmlFor="invite-name">氏名</label><input id="invite-name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="山田 花子" /></div>
              <div className="field"><label htmlFor="invite-company">会社名</label><input id="invite-company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="株式会社サンプル" /></div>
              <div className="field"><label htmlFor="invite-email">メールアドレス</label><input id="invite-email" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="hanako@example.jp" /></div>
              <div className="field"><label htmlFor="invite-password">パスワード</label>
                <div className="input-icon-right">
                  <input id="invite-password" type={showPw ? "text" : "password"} required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="8文字以上" />
                  <button type="button" className="icon-btn" onClick={() => setShowPw(v => !v)}>{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </div>
              <div className="field"><label htmlFor="invite-role">権限</label>
                <select id="invite-role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}><option value="member">メンバー</option><option value="admin">管理者</option></select>
              </div>
              <div className="modal-actions">
                <ActionButton type="submit" loading={saving}>招待を送信</ActionButton>
                <ActionButton type="button" variant="secondary" onClick={() => setShowInvite(false)}>キャンセル</ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 却下モーダル */}
      {rejectFor && (
        <div className="modal-backdrop">
          <div className="modal-box panel">
            <div className="modal-header"><h2>登録を却下</h2><button onClick={() => setRejectFor(null)} className="icon-btn"><X size={18} /></button></div>
            <div className="modal-form">
              <p className="action-description"><strong>{rejectFor.name}</strong>（{rejectFor.email}）の登録申請を却下します。理由は任意で、申請者へのメールに記載されます。</p>
              <div className="field"><label htmlFor="reject-reason">却下理由（任意）</label><textarea id="reject-reason" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="例：社内の利用対象外のため" /></div>
              <div className="modal-actions">
                <ActionButton variant="danger" loading={busyId === rejectFor.id} onClick={() => decide(rejectFor.id, "reject", rejectReason)}>却下する</ActionButton>
                <ActionButton type="button" variant="secondary" onClick={() => setRejectFor(null)}>キャンセル</ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteFor && (
        <div className="modal-backdrop">
          <div className="modal-box panel">
            <div className="modal-header"><h2>ユーザーを削除</h2><button onClick={() => setDeleteFor(null)} className="icon-btn"><X size={18} /></button></div>
            <div className="modal-form">
              {deleteError && <div className="review-alert danger">{deleteError}</div>}
              <div className="delete-confirm">
                <span className="delete-confirm-icon"><Trash2 size={22} /></span>
                <p><strong>{deleteFor.name}</strong>（{deleteFor.email}）を削除します。この操作は取り消せません。ユーザーに紐づく履歴データも併せて削除されます。</p>
              </div>
              <div className="modal-actions">
                <ActionButton variant="danger" loading={busyId === deleteFor.id} icon={<Trash2 size={15} />} onClick={() => deleteUser(deleteFor.id)}>削除する</ActionButton>
                <ActionButton type="button" variant="secondary" onClick={() => setDeleteFor(null)}>キャンセル</ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="permission-note">
        <ShieldCheck size={20} />
        <div><strong>承認フローについて</strong><p>新規ユーザーはメール認証（6桁コード）の後、管理者の承認を経て利用できます。承認・却下の結果は申請者へメールで通知されます。無効化されたアカウントはログインできません。</p></div>
      </div>

      {toast && (
        <div className={`toast ${toast.error ? "danger" : "success"}`} role="status">
          <span className="toast-icon">{toast.error ? <X size={20} /> : <CheckCircle2 size={20} />}</span>
          <div><strong>{toast.msg}</strong></div>
        </div>
      )}
    </>
  );
}
