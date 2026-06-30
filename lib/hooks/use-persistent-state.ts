"use client";

import { useEffect, useRef, useState } from "react";

/**
 * localStorage に同期する useState。
 *
 * - SSR / 初回ハイドレーション時は `initial` を返し、ハイドレーション不一致を防ぐ。
 * - マウント後に localStorage から復元する（保存済みの値があればそれを採用）。
 * - 値が変わるたびに localStorage へ保存する。
 *
 * デモ用モックデータの削除状態などを、ページ遷移・リロードを跨いで保持するために使う。
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);

  // マウント時に保存済みの値を復元
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored != null) setValue(JSON.parse(stored) as T);
    } catch {
      /* JSON 破損などは無視して初期値を使う */
    }
    loaded.current = true;
    // key は実行時に固定。意図的に初回のみ実行する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 復元完了後の変更だけを保存（復元前に初期値で上書きしないため）
  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* 容量超過などは無視 */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
