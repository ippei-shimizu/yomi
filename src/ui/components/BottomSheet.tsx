import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radius } from '@/design/tokens';

import { useThemeColors } from '../theme';

/**
 * bottom sheet（docs/DesignGuideline.md §8）。
 * surface 塗り、上辺角丸 28、グラバー ink-3。
 *
 * ジェスチャで閉じるライブラリは入れていない。読了確認（S05）と
 * メモ（S06）はどちらも選択肢が明示されており、誤操作で閉じられる方が
 * 困るため。背景タップで閉じるかは呼び出し側が決める。
 */
export function BottomSheet({
  visible,
  onRequestClose,
  dismissOnBackdropPress = true,
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  dismissOnBackdropPress?: boolean;
  children: ReactNode;
}) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="閉じる"
        onPress={dismissOnBackdropPress ? onRequestClose : undefined}
        style={{ flex: 1, backgroundColor: 'rgba(27, 29, 42, 0.35)', justifyContent: 'flex-end' }}
      >
        {/* シート本体のタップが背景に抜けないよう、内側で握りつぶす */}
        <Pressable
          accessibilityRole="none"
          onPress={() => undefined}
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            paddingHorizontal: layout.screenPadding,
            paddingTop: 12,
            paddingBottom: insets.bottom + 24,
            gap: layout.cardGap,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: radius.pill,
              backgroundColor: theme['ink-3'],
              marginBottom: 8,
            }}
          />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
