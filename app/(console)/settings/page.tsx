import { Save } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { PageTitle } from "@/components/ui";
import { SettingsView } from "@/components/settings-view";

export const metadata = { title: "設定" };

export default function SettingsPage() {
  return (
    <>
      <PageTitle
        eyebrow="SYSTEM PREFERENCES"
        title="設定"
        description="安全運用、送信制御、通知、データ保持の設定を管理します。"
        action={<ActionButton icon={<Save size={16} />}>変更を保存</ActionButton>}
      />
      <SettingsView />
    </>
  );
}
