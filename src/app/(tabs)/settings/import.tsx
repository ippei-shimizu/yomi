import { router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { Alert, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDatabase } from '@/db/DatabaseProvider';
import { itemRepo } from '@/db/repositories';
import { radius, typography, layout } from '@/design/tokens';
import { remainingSaves, useEntitlement } from '@/domain/entitlement';
import { useMetaFetchWorker } from '@/domain/meta';
import { limitToRemaining, parseImportText } from '@/domain/import/parseImport';
import { useInvalidateItems } from '@/features/items/queries';
import { Button, ScreenHeader, Text, useThemeColors, useTranslation } from '@/ui';

/** URL をまとめて追加する画面。Pro 専用 */
export default function ImportScreen() {
  const theme = useThemeColors();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const db = useDatabase();

  const { isPro, limits } = useEntitlement();
  const invalidate = useInvalidateItems();
  const { runAfterImport } = useMetaFetchWorker(db);

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  // 入力のたびに全 URL を解析するので、打鍵ごとには走らせない
  const deferredText = useDeferredValue(text);
  const preview = useMemo(() => {
    if (deferredText.trim().length === 0) {
      return { fresh: [], duplicateCount: 0, invalidCount: 0 };
    }

    const parsed = parseImportText(deferredText, new Set());
    const existing = itemRepo.findExistingHashes(
      db,
      parsed.fresh.map((url) => url.urlHash),
    );
    const filtered = {
      fresh: parsed.fresh.filter((url) => !existing.has(url.urlHash)),
      duplicateCount: parsed.duplicateCount + existing.size,
      invalidCount: parsed.invalidCount,
    };

    return limitToRemaining(filtered, remainingSaves(db, isPro));
  }, [db, deferredText, isPro]);

  const onSave = () => {
    if (!limits.urlImport) {
      router.push({ pathname: '/paywall', params: { trigger: 'import' } });
      return;
    }

    setBusy(true);
    try {
      itemRepo.insertMany(
        db,
        preview.fresh.map((url) => ({
          url: url.url,
          originalUrl: url.originalUrl,
          urlHash: url.urlHash,
          source: url.source,
          metaStatus: 'pending' as const,
        })),
      );
      void invalidate();
      // インポート直後だけ件数を引き上げてメタ取得を回す
      void runAfterImport();
      router.replace('/(tabs)');
    } catch {
      Alert.alert(t('import.failed'), t('common.retryLater'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        paddingHorizontal: layout.screenPadding,
        paddingTop: insets.top + 8,
        paddingBottom: 48,
        gap: layout.cardGap,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader title={t('import.title')} onBack={() => router.back()} />

      <Text variant="caption" style={{ color: theme['ink-2'] }}>
        {t('import.description')}
      </Text>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={'https://zenn.dev/…\nhttps://x.com/…'}
        placeholderTextColor={theme['ink-3']}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          ...typography.caption,
          color: theme.ink,
          backgroundColor: theme.surface,
          borderRadius: radius.card,
          padding: 16,
          minHeight: 200,
        }}
      />

      <Text variant="body" style={{ color: theme.ink }}>
        {t('import.summary', {
          fresh: preview.fresh.length,
          duplicate: preview.duplicateCount,
        })}
        {preview.invalidCount > 0 ? t('import.invalidCount', { count: preview.invalidCount }) : ''}
      </Text>

      <Button
        label={t('import.saveAction', { count: preview.fresh.length })}
        onPress={onSave}
        disabled={busy || preview.fresh.length === 0}
      />
    </ScrollView>
  );
}
