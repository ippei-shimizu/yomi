import { useRef } from 'react';
import { Pressable } from 'react-native';

import { radius } from '@/design/tokens';
import { APP_VERSION } from '@/features/settings/appInfo';
import { Card, Text, useThemeColors } from '@/ui';

/** 何回タップで Dev Unlock を開くか */
const DEV_UNLOCK_TAP_COUNT = 7;

/**
 * バージョン表記。規定回数タップすると Dev Unlock へ抜ける隠し導線を兼ねる。
 *
 * タップ数は表示に影響しないので ref で持つ。state にすると
 * 1 タップごとに再描画が走るだけで、得るものがない。
 */
export function VersionRow({ onUnlock }: { onUnlock: () => void }) {
  const theme = useThemeColors();
  const taps = useRef(0);

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`バージョン ${APP_VERSION}`}
        onPress={() => {
          taps.current += 1;
          if (taps.current >= DEV_UNLOCK_TAP_COUNT) {
            taps.current = 0;
            onUnlock();
          }
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          minHeight: 52,
          borderRadius: radius.card,
        }}
      >
        <Text variant="body" style={{ flex: 1, color: theme.ink }}>
          バージョン
        </Text>
        <Text variant="body" script="latin" style={{ color: theme['ink-2'] }}>
          {APP_VERSION}
        </Text>
      </Pressable>
    </Card>
  );
}
