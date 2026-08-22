import type { ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { colors, radius } from '@/design/tokens';
import { Card, Text, useThemeColors } from '@/ui';

/** 設定画面の 1 行。値の表示 + ▸ か、トグル */
export function SettingsRow({
  label,
  value,
  badge,
  onPress,
  toggle,
}: {
  label: string;
  value?: string;
  badge?: string;
  onPress?: () => void;
  toggle?: { value: boolean; onChange: (next: boolean) => void };
}) {
  const theme = useThemeColors();

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 52,
      }}
    >
      <Text variant="body" style={{ flex: 1, color: theme.ink }}>
        {label}
      </Text>

      {badge === undefined ? null : (
        <View
          style={{
            backgroundColor: colors.brand.brand,
            borderRadius: radius.pill,
            paddingHorizontal: 8,
            height: 20,
            justifyContent: 'center',
          }}
        >
          <Text variant="caption" style={{ color: '#FFFFFF', lineHeight: 13 }}>
            {badge}
          </Text>
        </View>
      )}

      {value === undefined ? null : (
        <Text variant="body" style={{ color: theme['ink-2'] }}>
          {value}
        </Text>
      )}

      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ true: colors.brand.brand, false: theme['surface-muted'] }}
        />
      ) : onPress ? (
        <Text variant="body" script="latin" style={{ color: theme['ink-3'] }}>
          ▸
        </Text>
      ) : null}
    </View>
  );

  return (
    <Card>
      {onPress === undefined ? (
        content
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
          {content}
        </Pressable>
      )}
    </Card>
  );
}

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const theme = useThemeColors();

  return (
    <View style={{ gap: 8 }}>
      <Text variant="caption" style={{ color: theme['ink-2'] }}>
        {title}
      </Text>
      {children}
    </View>
  );
}
