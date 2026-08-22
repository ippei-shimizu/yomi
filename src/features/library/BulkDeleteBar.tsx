import { Pressable, View } from 'react-native';

import { layout, radius } from '@/design/tokens';
import { Text, useThemeColors, useTranslation } from '@/ui';

/**
 * 複数選択中に画面下へ浮かべる削除バー。
 *
 * 件数を必ず出す。何件消えるのか分からないまま押させない。
 */
export function BulkDeleteBar({ count, onDelete }: { count: number; onDelete: () => void }) {
  const theme = useThemeColors();
  const t = useTranslation();

  return (
    <View
      style={{
        position: 'absolute',
        left: layout.screenPadding,
        right: layout.screenPadding,
        bottom: layout.listBottomInset,
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onDelete}
        style={{
          height: layout.buttonHeight,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.ink,
        }}
      >
        <Text variant="heading" style={{ color: theme.surface }}>
          {t('library.deleteAction', { count })}
        </Text>
      </Pressable>
    </View>
  );
}
