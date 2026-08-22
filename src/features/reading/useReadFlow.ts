import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';

import type { Item } from '@/db/schema';
import { getBoolean, getNumber, setNumber, remove, storageKeys } from '@/lib/storage';

import { decideConfirm, shouldSuggestSnooze } from './readConfirm';

/**
 * 閲覧 → 読了確認 → メモ の導線。
 *
 * SFSafariViewController を開き、閉じた滞在時間で確認シートを出すか決める。
 */
export type ReadFlowStep = 'idle' | 'confirm' | 'memo' | 'suggest-snooze';

function notYetKey(itemId: string): string {
  return `notYet:${itemId}`;
}

export function useReadFlow() {
  const [step, setStep] = useState<ReadFlowStep>('idle');
  const [item, setItem] = useState<Item | null>(null);

  const open = useCallback(async (target: Item) => {
    setItem(target);
    const openedAt = Date.now();

    // Reader モードはユーザーが Safari 側で有効化する前提
    await WebBrowser.openBrowserAsync(target.url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });

    const dwellMs = Date.now() - openedAt;
    const readConfirmEnabled = getBoolean(storageKeys.readConfirm, true);

    setStep(decideConfirm(dwellMs, readConfirmEnabled) === 'ask' ? 'confirm' : 'idle');
  }, []);

  /** 「読んだ」→ メモ入力へ。「まだ」の記録は消す */
  const confirmRead = useCallback(() => {
    if (item) remove(notYetKey(item.id));
    setStep('memo');
  }, [item]);

  /** 「まだ」→ 何もしない。ただし 3 回目なら「あとで」を提案する */
  const confirmNotYet = useCallback(() => {
    if (!item) {
      setStep('idle');
      return;
    }

    const count = getNumber(notYetKey(item.id), 0) + 1;
    setNumber(notYetKey(item.id), count);
    setStep(shouldSuggestSnooze(count) ? 'suggest-snooze' : 'idle');
  }, [item]);

  const dismiss = useCallback(() => {
    setStep('idle');
  }, []);

  /** スヌーズを提案して受け入れられたら、以後は再提案しない */
  const acceptSnooze = useCallback(() => {
    if (item) remove(notYetKey(item.id));
    setStep('idle');
  }, [item]);

  return { step, item, open, confirmRead, confirmNotYet, acceptSnooze, dismiss };
}
