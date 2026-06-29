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
import { recentLogs } from "@/lib/mock-data";

export const metadata = { title: "ダッシュボード" };

const flow = [
  { label: "検索", icon: Search, count: "224 URL" },
  { label: "フォーム検出", icon: FileSearch, count: "145 件" },
  { label: "安全確認", icon: ShieldCheck, count: "12 件待ち" },
  { label: "送信・記録", icon: Send, count: "98 件" },
];

export default function DashboardPage() {
  return (
    <>
      <PageTitle
        eyebrow="2026年6月29日・月曜日"
        title="おかえりなさい、佐藤さん"
        description="本日のオペレーション状況と、安全確認が必要な項目をまとめています。"
        action={<ActionButton href="/keywords" icon={<Search size={17} />}>検索を開始</ActionButton>}
      />

      <section className="dashboard-hero">
        <div className="hero-content">
          <span className="hero-label"><Sparkles size={14} /> Automation health</span>
          <h2>すべての処理は正常です</h2>
          <p>送信間隔・除外ルール・重複チェックが有効です。安全な範囲で運用されています。</p>
        </div>
        <div className="hero-score">
          <div className="score-ring"><span>98</span><small>/ 100</small></div>
          <p>安全運用スコア</p>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="登録キーワード" value="10" note="月間上限まで残り 2 件" trend="+2 今月" icon={Gauge} tone="blue" />
        <StatCard label="検出フォーム" value="145" note="検出率 64.7%" trend="+18.2%" icon={FileSearch} tone="indigo" />
        <StatCard label="本日の送信" value="18 / 50" note="次回送信まで 4分" icon={Send} tone="emerald" />
        <StatCard label="手動確認" value="3" note="優先度「高」が 2 件" icon={TriangleAlert} tone="amber" />
      </section>

      <section className="dashboard-grid">
        <article className="panel flow-panel">
          <SectionHeader title="オートメーションフロー" description="直近24時間の処理状況" link={{ href: "/search-results", label: "詳細を見る" }} />
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
            <div className="progress-copy"><span>本日の送信進捗</span><strong>36%</strong></div>
            <div className="progress-track"><span style={{ width: "36%" }} /></div>
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
                {recentLogs.map((log) => (
                  <tr key={`${log.domain}-${log.date}`}>
                    <td><div className="primary-cell"><strong>{log.company}</strong><span>{log.domain}</span></div></td>
                    <td><div className="person-cell"><UserAvatar initials={log.user.slice(0, 1)} size="sm" />{log.user}</div></td>
                    <td>{log.date}</td>
                    <td><StatusBadge status={log.status} /></td>
                  </tr>
                ))}
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
            <div><span>最終同期</span><strong>3分前</strong></div>
            <div><span>同期済み</span><strong>1,248件</strong></div>
          </div>
          <ActionButton href="/sheet-sync" variant="secondary" icon={<Sheet size={16} />}>同期状況を開く</ActionButton>
        </article>
      </section>
    </>
  );
}
