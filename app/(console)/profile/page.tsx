"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, IdCard, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle } from "@/components/ui";

interface Profile {
  id: string; email: string; name: string; role: string;
  company: string | null; department: string | null; position: string | null; phone: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ name: "", company: "", department: "", position: "", phone: "" });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/profile").then(async (r) => {
      if (r.ok) {
        const { user } = await r.json();
        setProfile(user);
        setForm({
          name: user.name ?? "", company: user.company ?? "",
          department: user.department ?? "", position: user.position ?? "", phone: user.phone ?? "",
        });
      }
    });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(""); setErr("");
    const res = await fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) setMsg("プロフィールを更新しました。"); else setErr(data.error ?? "更新に失敗しました。");
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setErr("");
    // クライアント側の事前検証
    if (pw.newPassword.length < 8) {
      setErr("新しいパスワードは8文字以上で入力してください。");
      return;
    }
    if (pw.newPassword !== pw.confirmPassword) {
      setErr("新しいパスワードと確認用パスワードが一致しません。");
      return;
    }
    setSavingPw(true);
    const res = await fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingPw(false);
    if (res.ok) { setMsg("パスワードを変更しました。"); setPw({ currentPassword: "", newPassword: "", confirmPassword: "" }); }
    else setErr(data.error ?? "パスワードの変更に失敗しました。");
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  return (
    <>
      <PageTitle
        eyebrow="MY ACCOUNT"
        title="プロフィール"
        description="差出人情報を管理します。ここで設定した会社情報は問い合わせ文面に利用されます。"
      />

      {msg && <div className="review-alert success enter"><CheckCircle2 size={22} /><div><strong>{msg}</strong></div></div>}
      {err && <div className="review-alert danger enter"><div><strong>{err}</strong></div></div>}

      <div className="detail-grid">
        <form className="panel profile-panel" onSubmit={saveProfile}>
          <div className="section-header"><div><h2>基本情報・会社情報</h2><p>問い合わせ送信時の差出人として使用されます</p></div></div>
          <div className="form-row">
            <div className="field"><label htmlFor="p-name">氏名</label>
              <div className="input-with-icon"><UserRound size={17} /><input id="p-name" value={form.name} onChange={f("name")} required /></div>
            </div>
            <div className="field"><label htmlFor="p-company">会社名</label>
              <div className="input-with-icon"><Building2 size={17} /><input id="p-company" value={form.company} onChange={f("company")} /></div>
            </div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="p-dept">部署</label><input id="p-dept" value={form.department} onChange={f("department")} /></div>
            <div className="field"><label htmlFor="p-pos">役職</label><input id="p-pos" value={form.position} onChange={f("position")} /></div>
          </div>
          <div className="field"><label htmlFor="p-phone">電話番号</label><input id="p-phone" value={form.phone} onChange={f("phone")} /></div>
          <div className="field">
            <label>メールアドレス</label>
            <div className="input-with-icon disabled"><Mail size={17} /><input value={profile?.email ?? ""} disabled /></div>
            <small className="helper-text">メールアドレスは変更できません</small>
          </div>
          <ActionButton type="submit" loading={saving} icon={<Save size={16} />}>変更を保存</ActionButton>
        </form>

        <div className="profile-side">
          <article className="panel">
            <div className="section-header"><div><h2>アカウント</h2></div></div>
            <dl className="keyword-settings">
              <div><dt><IdCard size={15} />権限</dt><dd>{profile?.role === "admin" ? "管理者" : "メンバー"}</dd></div>
              <div><dt><Mail size={15} />メール</dt><dd>{profile?.email}</dd></div>
            </dl>
          </article>

          <form className="panel" onSubmit={savePassword}>
            <div className="section-header"><div><h2>パスワード変更</h2></div></div>
            <div className="field"><label htmlFor="cur-pw">現在のパスワード</label>
              <div className="input-with-icon"><ShieldCheck size={17} /><input id="cur-pw" type="password" value={pw.currentPassword} onChange={(e) => setPw((s) => ({ ...s, currentPassword: e.target.value }))} /></div>
            </div>
            <div className="field"><label htmlFor="new-pw">新しいパスワード（8文字以上）</label>
              <div className="input-with-icon"><ShieldCheck size={17} /><input id="new-pw" type="password" minLength={8} autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw((s) => ({ ...s, newPassword: e.target.value }))} /></div>
            </div>
            <div className="field"><label htmlFor="confirm-pw">新しいパスワード（確認用）</label>
              <div className="input-with-icon"><ShieldCheck size={17} /><input id="confirm-pw" type="password" minLength={8} autoComplete="new-password" value={pw.confirmPassword} onChange={(e) => setPw((s) => ({ ...s, confirmPassword: e.target.value }))} /></div>
              {pw.confirmPassword.length > 0 && pw.newPassword !== pw.confirmPassword && <small className="field-hint error">パスワードが一致しません</small>}
            </div>
            <ActionButton type="submit" variant="secondary" loading={savingPw} className="pw-update-btn">パスワードを更新</ActionButton>
          </form>
        </div>
      </div>
    </>
  );
}
