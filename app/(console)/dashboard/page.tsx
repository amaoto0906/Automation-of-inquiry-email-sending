import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  Gauge,
  Search,
  Send,
  ShieldCheck,
  Sheet,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, SectionHeader, StatCard, StatusBadge, UserAvatar } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { getNumberSetting } from "@/lib/settings";
import { sendLogStatus } from "@/lib/status-display";

export const metadata = { title: "ダッシュボード" };

function timeAgo(date: Date | null): string {
  if (!date) return "—";
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

function fmtTime(date: Date): string {
  return date.toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export default async function DashboardPage() {
  const session = await getSession();
  const displayName = session?.name ?? "ご担当者";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    keywordActive,
    keywordTotal,
    searchResultCount,
    formFoundCount,
    sentCount,
    failedCount,
    manualCount,
    captchaCount,
    todaySentCount,
    syncedCount,
    lastSyncRow,
    recentLogs,
    maxSendsPerDay,
  ] = await Promise.all([
    prisma.keyword.count({ where: { isActive: true } }),
    prisma.keyword.count(),
    prisma.searchResult.count(),
    prisma.contactPage.count({ where: { hasForm: true } }),
    prisma.sendLog.count({ where: { status: "success" } }),
    prisma.sendLog.count({ where: { status: "failed" } }),
    prisma.contactPage.count({ where: { OR: [{ status: "manual_check" }, { requiresManualCheck: true }] } }),
    prisma.contactPage.count({ where: { hasCaptcha: true } }),
    prisma.sendLog.count({ where: { sentAt: { gte: today }, status: "success" } }),
    prisma.sendLog.count({ where: { sheetSynced: true } }),
    prisma.sendLog.findFirst({ where: { sheetSynced: true }, orderBy: { sheetSyncedAt: "desc" }, select: { sheetSyncedAt: true } }),
    prisma.sendLog.findMany({
      take: 8,
      orderBy: { sentAt: "desc" },
      include: {
        user: { select: { name: true } },
        contactPage: { select: { estimatedCompanyName: true, searchResult: { select: { domain: true } } } },
      },
    }),
    getNumberSetting("MAX_SENDS_PER_DAY", 50),
  ]);

  // 検出率・成功率・本日進捗・安全スコアはすべて実データから算出
  const detectionRate = searchResultCount > 0 ? Math.round((formFoundCount / searchResultCount) * 1000) / 10 : 0;
  const sendDenom = sentCount + failedCount;
  const safetyScore = sendDenom > 0 ? Math.round((sentCount / sendDenom) * 100) : 100;
  const todayProgress = maxSendsPerDay > 0 ? Math.min(100, Math.round((todaySentCount / maxSendsPerDay) * 100)) : 0;
  const remainingToday = Math.max(0, maxSendsPerDay - todaySentCount);
  const dateStr = today.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  const weekday = today.toLocaleDateString("ja-JP", { weekday: "long" });

  const flow = [
    { label: "検索", icon: Search, count: `${searchResultCount.toLocaleString()} URL` },
    { label: "フォーム検出", icon: FileSearch, count: `${formFoundCount.toLocaleString()} 件` },
    { label: "安全確認", icon: ShieldCheck, count: `${manualCount.toLocaleString()} 件待ち` },
    { label: "送信・記録", icon: Send, count: `${sentCount.toLocaleString()} 件` },
  ];

  return (
    <>
      <PageTitle
        eyebrow={`${dateStr}・${weekday}`}
        title={`おかえりなさい、${displayName}さん`}
        description="本日のオペレーション状況と、安全確認が必要な項目をまとめています。"
        action={<ActionButton href="/keywords" icon={<Search size={17} />}>検索を開始</ActionButton>}
      />

      <section className="dashboard-hero">
        <div className="hero-content">
          <span className="hero-label"><Sparkles size={14} /> Automation health</span>
          <h2>{safetyScore >= 90 ? "すべての処理は正常です" : "確認が必要な項目があります"}</h2>
          <p>送信間隔・除外ルール・重複チェックが有効です。安全な範囲で運用されています。</p>
        </div>
        <div className="hero-score">
          <div className="score-ring"><span>{safetyScore}</span><small>/ 100</small></div>
          <p>安全運用スコア</p>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="登録キーワード" value={String(keywordActive)} note={`全 ${keywordTotal} 件中の有効数`} icon={Gauge} tone="blue" />
        <StatCard label="検出フォーム" value={formFoundCount.toLocaleString()} note={`検出率 ${detectionRate}%`} icon={FileSearch} tone="indigo" />
        <StatCard label="本日の送信" value={`${todaySentCount} / ${maxSendsPerDay}`} note={`上限まで残り ${remainingToday} 件`} icon={Send} tone="emerald" />
        <StatCard label="手動確認" value={String(manualCount)} note={captchaCount > 0 ? `CAPTCHA検出 ${captchaCount} 件を含む` : "現在の未対応件数"} icon={TriangleAlert} tone="amber" />
      </section>

      <section className="dashboard-grid">
        <article className="panel flow-panel">
          <SectionHeader title="オートメーションフロー" description="検索から送信までの処理状況" link={{ href: "/search-results", label: "詳細を見る" }} />
          <div className="flow-list">
            {flow.map((item, index) => {
              const Icon = item.icon;
              return (
                <div className="flow-step" key={item.label}>
                  <span className="flow-icon"><Icon size={20} /></span>
                  <div><strong>{item.label}</strong><small>{item.count}</small></div>
                  {index < flow.length - 1 && <ArrowRight className="flow-arrow" size={17} />}
                </div>
              );
            })}
          </div>
          <div className="today-progress">
            <div className="progress-copy"><span>本日の送信進捗</span><strong>{todayProgress}%</strong></div>
            <div className="progress-track"><span style={{ width: `${todayProgress}%` }} /></div>
            <p><Clock3 size={14} /> 規定の送信間隔を維持しています</p>
          </div>
        </article>

        <article className="panel safety-panel">
          <SectionHeader title="安全運用ステータス" description="誤送信防止の保護機能" />
          <ul className="safety-list">
            <li><span className="check-icon"><CheckCircle2 size={18} /></span><div><strong>送信前確認</strong><small>すべての対象で有効</small></div><b>有効</b></li>
            <li><span className="check-icon"><CheckCircle2 size={18} /></span><div><strong>重複送信防止</strong><small>同一ドメインを90日間保護</small></div><b>有効</b></li>
            <li><span className="check-icon"><CheckCircle2 size={18} /></span><div><strong>CAPTCHA保護</strong><small>検出時は手動確認へ移動</small></div><b>有効</b></li>
          </ul>
          <ActionButton href="/settings" variant="secondary">安全設定を確認</ActionButton>
        </article>
      </section>

      <section className="dashboard-grid lower">
        <article className="panel">
          <SectionHeader title="最新の送信ログ" description="チーム全体の直近アクティビティ" link={{ href: "/send-logs", label: "すべて表示" }} />
          <div className="table-wrap">
            <table>
              <thead><tr><th>送信先</th><th>担当者</th><th>時刻</th><th>ステータス</th></tr></thead>
              <tbody>
                {recentLogs.length === 0 ? (
                  <tr><td colSpan={4}><p className="empty-state">送信ログはまだありません。</p></td></tr>
                ) : recentLogs.map((log) => {
                  const domain = log.contactPage?.searchResult?.domain ?? "—";
                  const company = log.contactPage?.estimatedCompanyName?.trim() || domain;
                  const userName = log.user?.name ?? "—";
                  return (
                    <tr key={log.id}>
                      <td><div className="primary-cell"><strong>{company}</strong><span>{domain}</span></div></td>
                      <td><div className="person-cell"><UserAvatar initials={userName.slice(0, 1)} size="sm" />{userName}</div></td>
                      <td>{fmtTime(new Date(log.sentAt))}</td>
                      <td><StatusBadge status={sendLogStatus(log.status)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel sheet-card">
          <div className="sheet-card-top">
            <span className="sheet-icon"><Sheet size={24} /></span>
            <span className="status-badge status-success"><span className="status-dot" />正常</span>
          </div>
          <h2>Google Sheets 同期</h2>
          <p>最新の送信結果はスプレッドシートへ同期されています。</p>
          <div className="sync-stats">
            <div><span>最終同期</span><strong>{timeAgo(lastSyncRow?.sheetSyncedAt ?? null)}</strong></div>
            <div><span>同期済み</span><strong>{syncedCount.toLocaleString()}件</strong></div>
          </div>
          <ActionButton href="/sheet-sync" variant="secondary" icon={<Sheet size={16} />}>同期状況を開く</ActionButton>
        </article>
      </section>
    </>
  );
}
