import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, forbidden, logActivity } from "@/lib/api-helpers";
import { SETTING_FIELDS, SETTING_FIELD_MAP, getSettingsForAdmin, setSettings, deleteSetting } from "@/lib/settings";

// 設定の取得（管理者のみ）。シークレットは値を返さず設定済み有無のみ返す。
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { values, secrets } = await getSettingsForAdmin();
  return NextResponse.json({ fields: SETTING_FIELDS, values, secrets });
}

// 設定の更新（管理者のみ）。既知キーのみ。シークレットは空文字なら既存値を保持。
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const body = await request.json().catch(() => ({}));
  const incoming = (body?.values ?? {}) as Record<string, unknown>;

  const toSave: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(incoming)) {
    const field = SETTING_FIELD_MAP[key];
    if (!field) continue; // 未知キーは無視

    let value = rawValue == null ? "" : String(rawValue);

    // シークレットは空入力なら更新しない（既存を保持）
    if (field.secret && value.trim() === "") continue;

    // 型ごとの正規化
    if (field.type === "boolean") {
      value = value === "true" || value === "1" ? "true" : "false";
    } else if (field.type === "number") {
      const n = parseInt(value, 10);
      if (Number.isNaN(n)) {
        return NextResponse.json({ error: `「${field.label}」は数値で入力してください。` }, { status: 400 });
      }
      value = String(Math.max(0, n));
    } else if (field.type === "select") {
      const allowed = (field.options ?? []).map((o) => o.value);
      if (allowed.length && !allowed.includes(value)) {
        return NextResponse.json({ error: `「${field.label}」の値が不正です。` }, { status: 400 });
      }
    } else {
      value = value.trim();
    }

    toSave[key] = value;
  }

  await setSettings(toSave);
  await logActivity(admin.id, "settings_updated", undefined, `設定を更新（${Object.keys(toSave).length}件）`);

  const { values, secrets } = await getSettingsForAdmin();
  return NextResponse.json({ ok: true, values, secrets });
}

// 設定キーの削除（管理者のみ）。指定キーをDBから消去し、env/既定値へ戻す。
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";
  const field = SETTING_FIELD_MAP[key];
  if (!field) {
    return NextResponse.json({ error: "不明な設定キーです。" }, { status: 400 });
  }

  await deleteSetting(key);
  await logActivity(admin.id, "settings_deleted", undefined, `設定「${field.label}」を削除`);

  const { values, secrets } = await getSettingsForAdmin();
  return NextResponse.json({ ok: true, values, secrets });
}
