import { close, type InitialProps } from 'expo-share-extension';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { openSharedDb } from '@/db/client';
import { itemRepo } from '@/db/repositories';
import type { Tag } from '@/db/schema';
import { readSharedState } from '@/db/sharedState';
import { createTranslate, deviceLanguageTags, resolveLocale, type Translate } from '@/lib/i18n';

import { attachTag, save, type SaveState } from './saveFlow';
import { EXTENSION_COLORS, extensionStyles as styles } from './styles';

/** 保存できたら自動で閉じるまでの時間 */
const AUTO_CLOSE_MS = 600;

/** タグをタップしたら、続けて選べるよう自動クローズを延ばす */
const EXTENDED_CLOSE_MS = 2_000;

type State =
  | { kind: 'saving' }
  | { kind: 'saved'; itemId: string; recentTags: Tag[] }
  | { kind: Exclude<SaveState, 'saving' | 'saved'> };

/**
 * 表示言語。本体が共有した設定を優先し、無ければ端末の言語から決める。
 *
 * 本体を一度も開いていない場合や App Group が読めない場合でも、
 * 日本語で固定せず端末の言語に倒す。
 */
function shareTranslate(sharedLocale: ReturnType<typeof readSharedState>['locale']): Translate {
  return createTranslate(sharedLocale ?? resolveLocale('system', deviceLanguageTags()));
}

export default function ShareExtension({ url, text }: InitialProps) {
  const [state, setState] = useState<State>({ kind: 'saving' });
  const [t, setT] = useState<Translate>(() => shareTranslate(null));
  const [attached, setAttached] = useState<Set<string>>(new Set());
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const scheduleClose = (delay: number) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(close, delay);
  };

  useEffect(() => {
    let cancelled = false;

    // 保存は同期処理だが、1 フレーム遅らせて「保存中」を先に描画する。
    // 共有シート上で無反応の時間を作らないため（起動 2 秒以内の要件）。
    const task = Promise.resolve().then(() => {
      if (cancelled) return;

      try {
        const shared = readSharedState();
        setT(() => shareTranslate(shared.locale));

        const outcome = save(openSharedDb(), { url, text }, { isPro: shared.isPro });
        if (cancelled) return;

        setState(
          outcome.state === 'saved' ? { kind: 'saved', ...outcome } : { kind: outcome.state },
        );
        if (outcome.state === 'saved') scheduleClose(AUTO_CLOSE_MS);
      } catch {
        // 保存に失敗しても Extension を落とさない。閉じる手段は残す
        if (!cancelled) setState({ kind: 'error' });
      }
    });
    void task;

    return () => {
      cancelled = true;
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [url, text]);

  const onTagPress = (itemId: string, tag: Tag) => {
    try {
      attachTag(openSharedDb(), itemId, tag.id);
      setAttached((current) => new Set(current).add(tag.id));
    } catch {
      // タグ付けの失敗で保存自体を無かったことにはしない
    }
    scheduleClose(EXTENDED_CLOSE_MS);
  };

  return (
    <View style={styles.card}>
      {state.kind === 'saving' ? <Message text={t('share.saving')} /> : null}

      {state.kind === 'saved' ? (
        <>
          <Message text={t('share.saved')} accent={EXTENSION_COLORS.ok} />
          {state.recentTags.length > 0 ? (
            <View style={styles.tagRow}>
              {state.recentTags.map((tag) => (
                <Pressable
                  key={tag.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: attached.has(tag.id) }}
                  onPress={() => onTagPress(state.itemId, tag)}
                  style={[styles.tag, attached.has(tag.id) ? styles.tagSelected : null]}
                >
                  <Text style={attached.has(tag.id) ? styles.tagLabelSelected : styles.tagLabel}>
                    {tag.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      {state.kind === 'duplicate' ? (
        <Closable text={t('share.duplicate')} closeLabel={t('common.close')} onClose={close} />
      ) : null}

      {state.kind === 'limit' ? (
        <Closable
          text={t('share.limit', { limit: itemRepo.FREE_PLAN_ITEM_LIMIT })}
          description={t('share.limitDescription')}
          closeLabel={t('common.close')}
          onClose={close}
        />
      ) : null}

      {state.kind === 'error' ? (
        <Closable text={t('share.error')} closeLabel={t('common.close')} onClose={close} />
      ) : null}
    </View>
  );
}

function Message({ text, accent }: { text: string; accent?: string }) {
  return (
    <View style={styles.messageRow}>
      <View style={[styles.dot, accent === undefined ? null : { backgroundColor: accent }]} />
      <Text style={styles.message}>{text}</Text>
    </View>
  );
}

function Closable({
  text,
  description,
  closeLabel,
  onClose,
}: {
  text: string;
  description?: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <>
      <Message text={text} />
      {description === undefined ? null : <Text style={styles.description}>{description}</Text>}
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeLabel}>{closeLabel}</Text>
      </Pressable>
    </>
  );
}
