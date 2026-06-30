"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Ban,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Gauge,
  HelpCircle,
  KeyRound,
  LayoutList,
  LogOut,
  Mail,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  Settings,
  Sheet,
  ShieldCheck,
  UserPlus,
  Users,
  UserCog,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "./ui";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./logo";
import { usePersistentSelector } from "@/lib/hooks/use-persistent-state";

/** 手動確認の既定件数。サンプルデータを持たないため 0（localStorage 未保存時の初期値）。 */
const MANUAL_CHECKS_SEED_COUNT = 0;

interface NavItem {
  href: string;
  label: string;
  icon: typeof Gauge;
  badge?: string;
}
interface NavGroup {
  label: string;
  adminOnly?: boolean;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "ワークスペース",
    items: [
      { href: "/dashboard", label: "ダッシュボード", icon: Gauge },
      { href: "/keywords", label: "検索キーワード", icon: KeyRound },
      { href: "/search-results", label: "検索結果", icon: LayoutList },
      { href: "/contact-pages", label: "フォーム検出", icon: FileSearch },
    ],
  },
  {
    label: "送信管理",
    items: [
      { href: "/send-logs", label: "送信履歴", icon: Activity },
      { href: "/manual-checks", label: "手動確認", icon: ShieldCheck },
      { href: "/exclude-rules", label: "除外ルール", icon: Ban },
      { href: "/message-templates", label: "文面テンプレート", icon: MessageSquareText },
    ],
  },
  {
    label: "システム",
    adminOnly: true,
    items: [
      { href: "/sheet-sync", label: "シート同期", icon: Sheet },
      { href: "/users", label: "ユーザー管理", icon: Users },
      { href: "/settings", label: "設定", icon: Settings },
    ],
  },
];

interface NotifItem {
  id: string;
  type: string;
  name: string;
  company: string | null;
  email: string;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

interface AppShellProps {
  children: React.ReactNode;
  user?: { id: string; name: string; email: string; role: string };
}

export function AppShell({ children, user }: AppShellProps) {
  const displayName = user?.name ?? "管理者";
  const isAdmin = user?.role === "admin";
  const roleLabel = isAdmin ? "管理者" : "メンバー";
  const initials = displayName.slice(0, 1);
  const visibleNavGroups = navGroups.filter((group) => !group.adminOnly || isAdmin);
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifItems, setNotifItems] = useState<NotifItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // 手動確認の未対応件数を localStorage から購読（削除すると即座にバッジへ反映）
  const manualPending = usePersistentSelector<Array<{ done?: boolean }>, number>(
    "manual-checks-v2",
    (parsed) => (parsed == null ? MANUAL_CHECKS_SEED_COUNT : parsed.filter((c) => !c.done).length),
    MANUAL_CHECKS_SEED_COUNT,
  );

  // 旧バージョンの永続化フックが書き込んだ初期シード3件を一度だけ掃除する
  useEffect(() => {
    try { window.localStorage.removeItem("manual-checks"); } catch { /* noop */ }
  }, []);

  useEffect(() => { setMobileOpen(false); setNotifOpen(false); }, [pathname]);

  // 通知（承認待ちの新規登録）を取得。ページ遷移時と30秒ごとに更新。
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok && active) {
          const d = await res.json();
          setNotifCount(d.count ?? 0);
          setNotifItems(d.items ?? []);
        }
      } catch {
        /* noop */
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [pathname]);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [notifOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const sidebar = (
    <>
      <div className="brand">
        <Link href="/dashboard" className="brand-link" onClick={() => setMobileOpen(false)} aria-label="ダッシュボードへ移動">
          <Logo size={40} className="brand-logo" />
          <div className="brand-copy">
            <strong>Outreach Hub</strong>
            <span>Control Center</span>
          </div>
        </Link>
        <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="メニューを閉じる">
          <X size={20} />
        </button>
      </div>

      <div className="operation-status">
        <span className="live-dot" />
        <div><strong>安全運用中</strong><span>本日 18 / 50 件</span></div>
      </div>

      <nav className="nav" aria-label="メインナビゲーション">
        {visibleNavGroups.map((group) => (
          <div className="nav-group" key={group.label}>
            <p className="nav-label">{group.label}</p>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              // 動的バッジ: ユーザー管理＝承認待ち件数 / 手動確認＝未対応件数
              const badge =
                item.href === "/users"
                  ? notifCount > 0 ? String(notifCount) : undefined
                  : item.href === "/manual-checks"
                  ? manualPending > 0 ? String(manualPending) : undefined
                  : item.badge;
              return (
                <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`} title={collapsed ? item.label : undefined}>
                  <Icon size={19} aria-hidden="true" />
                  <span>{item.label}</span>
                  {badge && <b className="nav-badge">{badge}</b>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link href="/profile" className={`nav-item ${pathname === "/profile" ? "active" : ""}`} title={collapsed ? "プロフィール" : undefined}><UserCog size={19} /><span>プロフィール</span></Link>
        <Link href="/dashboard" className="nav-item"><HelpCircle size={19} /><span>ヘルプ・ガイド</span></Link>
        <button className="collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}>
          <PanelLeftClose size={17} />
          <span>メニューを折りたたむ</span>
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>
    </>
  );

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">{sidebar}</aside>
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}
      <aside className={`mobile-sidebar ${mobileOpen ? "open" : ""}`}>{sidebar}</aside>

      <div className="main-column">
        <header className="top-header">
          <button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="メニューを開く"><Menu size={21} /></button>
          <div className="header-context">
            <span className="header-kicker">Intelligent Outreach</span>
            <strong>送信オペレーション</strong>
          </div>
          <div className="header-actions">
            <span className="sync-pill"><span />シート同期済み</span>
            <ThemeToggle />
            <div className="notif-wrap" ref={notifRef}>
              <button
                className="icon-button"
                aria-label={notifCount > 0 ? `通知 ${notifCount} 件` : "通知"}
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen((o) => !o)}
              >
                <Bell size={19} />
                {notifCount > 0 && <span className="notif-badge">{notifCount > 9 ? "9+" : notifCount}</span>}
              </button>
              {notifOpen && (
                <div className="notif-dropdown" role="menu">
                  <div className="notif-dropdown-head">
                    <strong>通知</strong>
                    {notifCount > 0 && <span className="notif-count-pill">{notifCount}</span>}
                  </div>
                  <div className="notif-list">
                    {notifItems.length === 0 ? (
                      <div className="notif-empty"><Bell size={22} /><span>新しい通知はありません</span></div>
                    ) : (
                      notifItems.map((item) => {
                        const isReset = item.type === "password_reset";
                        const isEmail = item.type === "email_change";
                        const icon = isReset ? <KeyRound size={16} /> : isEmail ? <Mail size={16} /> : <UserPlus size={16} />;
                        const title = isReset ? "パスワード再設定を申請" : isEmail ? "メールアドレス変更を申請" : "新規登録";
                        const sub = isReset ? `${item.email}・対応待ち` : isEmail ? `新: ${item.email}・承認待ち` : `${item.company ?? item.email}・承認待ち`;
                        return (
                          <Link key={item.id} href="/users" className="notif-row" onClick={() => setNotifOpen(false)}>
                            <span className={`notif-row-icon${isReset ? " reset" : ""}${isEmail ? " email" : ""}`}>{icon}</span>
                            <div className="notif-row-body">
                              <strong>{item.name} さんが{title}</strong>
                              <span>{sub}</span>
                            </div>
                            <span className="notif-row-time">{timeAgo(item.createdAt)}</span>
                          </Link>
                        );
                      })
                    )}
                  </div>
                  {notifItems.length > 0 && (
                    <Link href="/users" className="notif-foot" onClick={() => setNotifOpen(false)}>
                      ユーザー管理ですべて表示
                    </Link>
                  )}
                </div>
              )}
            </div>
            <Link href="/profile" className="header-user" title="プロフィール">
              <UserAvatar initials={initials} />
              <div><strong>{displayName}</strong><span>{roleLabel}</span></div>
            </Link>
            <button className="icon-button" onClick={logout} aria-label="ログアウト" title="ログアウト"><LogOut size={19} /></button>
          </div>
        </header>
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
