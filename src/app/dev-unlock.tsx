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
  type VerifyResult,
} from '@/domain/entitlement';
import { Button, Text, useThemeColors } from '@/ui';

/**
 * S13 Dev Unlock（docs/Screens.md S13）。非公開機能。
 * Settings のバージョン表記 7 回タップで開く。
 */
export default function DevUnlockScreen() {
  const theme = useThemeColors();
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
    setMessage(describeResult(result));
    if (result.valid) {
      setCode('');
      await refresh();
    }
  };

  const onClear = async () => {
    await clearOverride();
    setMessage('解除しました');
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
          accessibilityLabel="閉じる"
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

      <Button label="検証" onPress={() => void onVerify()} disabled={code.trim().length === 0} />

      {message === null ? null : (
        <Text variant="caption" style={{ color: theme['ink-2'] }}>
          {message}
        </Text>
      )}

      <Text variant="body" style={{ color: theme.ink }}>
        状態:{' '}
        {state.valid ? `override 有効 (sub ${state.sub} / exp ${state.exp})` : 'override なし'}
      </Text>

      {state.valid ? (
        <Button label="解除" variant="secondary" onPress={() => void onClear()} />
      ) : null}
    </View>
  );
}

function describeResult(result: VerifyResult): string {
  if (result.valid) return '有効なコードです';

  switch (result.reason) {
    case 'expired':
      return '期限が切れています';
    case 'bad-signature':
      return '署名が一致しません';
    case 'bad-payload':
      return 'コードの内容が不正です';
    case 'malformed':
      return 'コードの形式が不正です（公開鍵が未設定の可能性があります）';
  }
}
