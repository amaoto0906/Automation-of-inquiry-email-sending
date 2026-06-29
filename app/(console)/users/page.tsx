"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Plus, ShieldCheck, UserCheck, UsersRound, X, Eye, EyeOff } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, UserAvatar } from "@/components/ui";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  async function fetchUsers() {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowInvite(false);
      setForm({ name: "", email: "", password: "", role: "member" });
      fetchUsers();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "招待に失敗しました");
    }
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    fetchUsers();
  }

  const adminCount = users.filter(u => u.role === "admin").length;
  const activeCount = users.filter(u => u.isActive).length;

  return (
    <>
      <PageTitle
        eyebrow="TEAM MANAGEMENT"
        title="ユーザー管理"
        description="メンバーの招待、権限、最終利用状況を管理します。"
        action={<ActionButton icon={<Plus size={17} />} onClick={() => setShowInvite(true)}>メンバーを招待</ActionButton>}
      />

      <section className="mini-stats">
        <div><span className="mini-icon blue"><UsersRound size={19} /></span><p>登録ユーザー<strong>{users.length}</strong></p></div>
        <div><span className="mini-icon green"><UserCheck size={19} /></span><p>有効<strong>{activeCount}</strong></p></div>
        <div><span className="mini-icon indigo"><ShieldCheck size={19} /></span><p>管理者<strong>{adminCount}</strong></p></div>
      </section>

      {showInvite && (
        <div className="modal-backdrop">
          <div className="modal-box panel">
            <div className="modal-header">
              <h2>新しいメンバーを招待</h2>
              <button onClick={() => setShowInvite(false)} className="icon-btn"><X size={18} /></button>
            </div>
            <form onSubmit={handleInvite} className="modal-form">
              {error && <div className="review-alert danger">{error}</div>}
              <div className="field">
                <label htmlFor="invite-name">氏名</label>
                <input id="invite-name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="山田 花子" />
              </div>
              <div className="field">
                <label htmlFor="invite-email">メールアドレス</label>
                <input id="invite-email" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="hanako@example.jp" />
              </div>
              <div className="field">
                <label htmlFor="invite-password">パスワード</label>
                <div className="input-icon-right">
                  <input id="invite-password" type={showPw ? "text" : "password"} required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="8文字以上" />
                  <button type="button" className="icon-btn" onClick={() => setShowPw(v => !v)}>{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="invite-role">権限</label>
                <select id="invite-role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="member">メンバー</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
              <div className="modal-actions">
                <ActionButton type="submit" loading={saving}>招待を送信</ActionButton>
                <ActionButton type="button" variant="secondary" onClick={() => setShowInvite(false)}>キャンセル</ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      <article className="panel">
        <div className="section-header">
          <div><h2>チームメンバー</h2><p>各ユーザーの操作は監査ログへ記録されます</p></div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <p className="empty-state">読み込み中…</p>
          ) : (
            <table>
              <thead>
                <tr><th>ユーザー</th><th>権限</th><th>状態</th><th>登録日</th><th><span className="sr-only">操作</span></th></tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const initials = user.name.slice(0, 2);
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <UserAvatar initials={initials} />
                          <div><strong>{user.name}</strong><span>{user.email}</span></div>
                        </div>
                      </td>
                      <td><span className={`role-badge ${user.role === "admin" ? "admin" : ""}`}>{user.role === "admin" ? "管理者" : "メンバー"}</span></td>
                      <td>
                        <span className={`online-status ${user.isActive ? "" : "inactive"}`}>
                          <i />{user.isActive ? "有効" : "無効"}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString("ja-JP")}</td>
                      <td>
                        <button className="row-action" aria-label={`${user.name}の操作`} onClick={() => toggleActive(user.id, user.isActive)}>
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </article>
      <div className="permission-note">
        <ShieldCheck size={20} />
        <div><strong>権限について</strong><p>管理者はユーザー・送信設定・外部連携を変更できます。メンバーは検索、確認、送信履歴の閲覧と承認操作を行えます。</p></div>
      </div>
    </>
  );
}
