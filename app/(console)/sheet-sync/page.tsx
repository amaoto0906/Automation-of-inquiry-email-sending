"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, FileSpreadsheet, LoaderCircle, RefreshCw, Rows3, WifiOff } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle, StatusBadge } from "@/components/ui";

interface SyncLog {
  id: string;
  status: string;
  rowsWritten: number | null;
  errorMessage: string | null;
  createdAt: string;
}

interface SyncStatus {
  syncLogs: SyncLog[];
  unsyncedCount: number;
  lastSyncAt: string | null;
  isConfigured: boolean;
}

export default function SheetSyncPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/sheet-sync");
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch("/api/sheet-sync", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setSyncResult(data);
      fetchStatus();
    }
    setSyncing(false);
  }

  const syncedCount = status?.syncLogs.filter(l => l.status === "success").reduce((sum, l) => sum + (l.rowsWritten ?? 0), 0) ?? 0;
  const failedCount = status?.syncLogs.filter(l => l.status === "failed").length ?? 0;
  const lastSyncLabel = status?.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString("ja-JP")
    : "なし";
  const spreadsheetUrl = process.env.NEXT_PUBLIC_SHEETS_URL ?? "#";

  return (
    <>
      <PageTitle
        eyebrow="GOOGLE SHEETS"
        title="スプレッドシート同期"
        description="送信結果と手動確認リストの同期状態を管理します。"
        action={
          <ActionButton onClick={handleSync} loading={syncing} icon={<RefreshCw size={16} />}>
            {syncing ? "同期しています…" : "今すぐ同期"}
          </ActionButton>
        }
      />

      {syncResult && (
        <div className={`review-alert ${syncResult.failed === 0 ? "success" : "warning"} enter`}>
          <CheckCircle2 size={23} />
          <div>
            <strong>同期が完了しました</strong>
            <p>{syncResult.synced} 件を同期、{syncResult.failed} 件が失敗</p>
          </div>
        </div>
      )}

      {status && !status.isConfigured && (
        <div className="review-alert warning">
          <WifiOff size={23} />
          <div>
            <strong>Google Sheets が未設定です</strong>
            <p>.env の GOOGLE_SERVICE_ACCOUNT_EMAIL と GOOGLE_SHEETS_SPREADSHEET_ID を設定してください。</p>
          </div>
        </div>
      )}

      <section className="sheet-overview">
        <article className="sheet-connection">
          <div className="sheet-logo"><FileSpreadsheet size={30} /></div>
          <div>
            <p className="eyebrow">{status?.isConfigured ? "CONNECTED" : "DISCONNECTED"}</p>
            <h2>送信管理シート</h2>
            <a href={spreadsheetUrl} target="_blank" rel="noopener noreferrer">
              Googleスプレッドシートを開く <ExternalLink size={13} />
            </a>
          </div>
          <span className={`connection-state ${status?.isConfigured ? "" : "disconnected"}`}>
            <i />{status?.isConfigured ? "接続中" : "未接続"}
          </span>
        </article>
        <div className="sheet-stat"><span className="mini-icon green"><CheckCircle2 size={19} /></span><p>同期済み<strong>{syncedCount}</strong><small>行</small></p></div>
        <div className="sheet-stat"><span className="mini-icon amber"><Clock3 size={19} /></span><p>未同期<strong>{status?.unsyncedCount ?? 0}</strong><small>件</small></p></div>
        <div className="sheet-stat"><span className="mini-icon red"><AlertTriangle size={19} /></span><p>同期失敗<strong>{failedCount}</strong><small>件</small></p></div>
      </section>

      <section className="sheet-grid">
        <article className="panel">
          <div className="section-header">
            <div><h2>同期履歴</h2><p>最終同期：{lastSyncLabel}</p></div>
          </div>
          <div className="sync-timeline">
            {!status?.syncLogs.length && <p className="empty-state">同期履歴がありません</p>}
            {status?.syncLogs.map(log => (
              <div className="sync-row" key={log.id}>
                <span className={`timeline-icon ${log.status === "success" ? "success" : "danger"}`}>
                  {log.status === "success" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
                </span>
                <div>
                  <strong>{log.status === "success" ? `${log.rowsWritten ?? 0} 行を同期しました` : log.errorMessage ?? "同期に失敗"}</strong>
                  <p>{new Date(log.createdAt).toLocaleString("ja-JP")}</p>
                </div>
                <StatusBadge status={log.status === "success" ? "sheet_synced" : "sheet_sync_failed"} />
              </div>
            ))}
          </div>
        </article>

        <aside className="panel sync-details">
          <div className="sync-visual"><Rows3 size={35} /></div>
          <h2>同期設定</h2>
          <dl>
            <div><dt>同期先シート名</dt><dd>送信履歴</dd></div>
            <div><dt>同期方式</dt><dd>追記のみ</dd></div>
            <div><dt>レート制限対応</dt><dd>指数バックオフ（最大3回）</dd></div>
            <div><dt>競合時</dt><dd>ローカルDBを優先</dd></div>
          </dl>
          {syncing && (
            <div className="sync-progress">
              <LoaderCircle className="spin" size={18} />
              <div><strong>同期処理中</strong><span>安全にデータを転送しています</span></div>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}
