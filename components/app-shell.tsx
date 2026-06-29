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
  FileText,
  Gauge,
  HelpCircle,
  KeyRound,
  LayoutList,
  LogOut,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  Settings,
  Sheet,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { UserAvatar } from "./ui";
import { ThemeToggle } from "./theme-toggle";

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
      { href: "/manual-checks", label: "手動確認", icon: ShieldCheck, badge: "3" },
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

  useEffect(() => setMobileOpen(false), [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const sidebar = (
    <>
      <div className="brand">
        <span className="brand-mark" aria-hidden="true"><FileText size={20} /></span>
        <div className="brand-copy">
          <strong>Outreach Hub</strong>
          <span>Control Center</span>
        </div>
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
              return (
                <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`} title={collapsed ? item.label : undefined}>
                  <Icon size={19} aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.badge && <b>{item.badge}</b>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link href="/settings" className="nav-item"><HelpCircle size={19} /><span>ヘルプ・ガイド</span></Link>
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
            <button className="icon-button" aria-label="通知"><Bell size={19} /><i /></button>
            <div className="header-user">
              <UserAvatar initials={initials} />
              <div><strong>{displayName}</strong><span>{roleLabel}</span></div>
            </div>
            <button className="icon-button" onClick={logout} aria-label="ログアウト" title="ログアウト"><LogOut size={19} /></button>
          </div>
        </header>
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
