"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 同一タブ内で localStorage 変更を通知するイベント名（storage イベントは同一タブでは発火しないため） */
export const PERSISTENT_STATE_EVENT = "persistent-state-change";

type Updater<T> = T | ((prev: T) => T);

/**
 * localStorage に同期する useState。
 *
 * 永続化された値はクライアント専用で、SSR / 初回レンダリング時には確定できない。
 * そのため復元が完了するまでを示す `hydrated` フラグを返し、呼び出し側は
 * `hydrated === false` の間はローディング表示にすることで「初期値 → 復元値」の
 * ちらつき（古いデータが一瞬見える現象）を防げる。
 *
 * - 復元前は `initial` を返す（SSR と初回クライアントレンダリングで一致 → ハイドレーション不一致なし）。
 * - マウント後に localStorage から復元し、`hydrated` を true にする。
 * - 値の更新（setValue）時のみ localStorage へ保存し、同一タブ内の購読者へ変更を通知する。
 *   （復元時には保存しないため、復元値を初期値で上書きする競合が起きない）
 *
 * @returns `[value, setValue, hydrated]`
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValueState] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  // 関数型アップデータに最新値を渡すための参照
  const valueRef = useRef(value);
  valueRef.current = value;

  // マウント時に保存済みの値を復元
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored != null) setValueState(JSON.parse(stored) as T);
    } catch {
      /* JSON 破損などは無視して初期値を使う */
    }
    setHydrated(true);
  }, [key]);

  const setValue = useCallback(
    (updater: Updater<T>) => {
      const next =
        typeof updater === "function"
          ? (updater as (prev: T) => T)(valueRef.current)
          : updater;
      valueRef.current = next;
      setValueState(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent(PERSISTENT_STATE_EVENT, { detail: { key } }));
      } catch {
        /* 容量超過などは無視 */
      }
    },
    [key],
  );

  return [value, setValue, hydrated] as const;
}

/**
 * localStorage に保存された配列を購読し、件数などを集計するための軽量フック。
 * 同一タブの変更（PERSISTENT_STATE_EVENT）と別タブの変更（storage イベント）の両方を監視する。
 *
 * @param key       localStorage キー
 * @param selector  保存値（パース済み）から派生値を計算する関数。未保存なら引数は null。
 * @param fallback  読み取り前（SSR / 初回レンダリング）に返す値。ハイドレーション不一致を避けるため使用。
 */
export function usePersistentSelector<T, R>(
  key: string,
  selector: (parsed: T | null) => R,
  fallback: R,
) {
  const [result, setResult] = useState<R>(fallback);
  // selector は呼び出し側でインライン定義されがちなので ref で固定し、依存配列を安定させる
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  useEffect(() => {
    const read = () => {
      try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw == null ? null : (JSON.parse(raw) as T);
        setResult(selectorRef.current(parsed));
      } catch {
        setResult(selectorRef.current(null));
      }
    };
    read();

    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent).detail as { key?: string } | undefined;
      if (!detail || detail.key === key) read();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) read();
    };
    window.addEventListener(PERSISTENT_STATE_EVENT, onLocal);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PERSISTENT_STATE_EVENT, onLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);

  return result;
}
