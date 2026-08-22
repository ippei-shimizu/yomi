import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radius, typography } from '@/design/tokens';
import {
  applyOverride,
  clearOverride,
  readOverride,
  type OverrideState,
} from '@/domain/entitlement';
import { describeVerifyResult } from '@/features/devUnlock/message';
import { Button, Text, useThemeColors, useTranslation } from '@/ui';

/**
 * 開発者向けのアンロック画面。非公開機能。
 * Settings のバージョン表記 7 回タップで開く。
 */
export default function DevUnlockScreen() {
  const theme = useThemeColors();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [code, setCode] = useState('');
  const [state, setState] = useState<OverrideState>({ valid: false });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readOverride().then((current) => {
      if (!cancelled) setState(current);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    setState(await readOverride());
    await queryClient.invalidateQueries({ queryKey: ['entitlement'] });
  };

  const onVerify = async () => {
    const result = await applyOverride(code);
    setMessage(describeVerifyResult(t, result));
    if (result.valid) {
      setCode('');
      await refresh();
    }
  };

  const onClear = async () => {
    await clearOverride();
    setMessage(t('devUnlock.cleared'));
    await refresh();
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        paddingHorizontal: layout.screenPadding,
        paddingTop: insets.top + 8,
        gap: layout.cardGap,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="display" style={{ color: theme.ink }}>
          Developer
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Text variant="heading" script="latin" style={{ color: theme.ink }}>
            ✕
          </Text>
        </Pressable>
      </View>

      <TextInput
        value={code}
        onChangeText={(value) => {
          setCode(value);
          setMessage(null);
        }}
        placeholder="unlock code"
        placeholderTextColor={theme['ink-3']}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        style={{
          ...typography.caption,
          color: theme.ink,
          backgroundColor: theme.surface,
          borderRadius: radius.card,
          padding: 16,
          minHeight: 96,
        }}
      />

      <Button
        label={t('devUnlock.verify')}
        onPress={() => void onVerify()}
        disabled={code.trim().length === 0}
      />

      {message === null ? null : (
        <Text variant="caption" style={{ color: theme['ink-2'] }}>
          {message}
        </Text>
      )}

      <Text variant="body" style={{ color: theme.ink }}>
        {state.valid
          ? t('devUnlock.stateActive', { sub: state.sub, exp: state.exp })
          : t('devUnlock.stateNone')}
      </Text>

      {state.valid ? (
        <Button label={t('devUnlock.clear')} variant="secondary" onPress={() => void onClear()} />
      ) : null}
    </View>
  );
}
