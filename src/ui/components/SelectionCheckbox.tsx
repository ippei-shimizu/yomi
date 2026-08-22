import { View } from 'react-native';

import { radius } from '@/design/tokens';
import { useThemeColors } from '../theme';

/**
 * 複数選択のチェック。塗りつぶしの有無だけで状態を示す。
 *
 * 押下の扱いは親の Pressable が持つ（行全体をタップ領域にしたいため、
 * ここでは描画だけを引き受ける）。
 */
export function SelectionCheckbox({ selected }: { selected: boolean }) {
  const theme = useThemeColors();

  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: radius.pill,
        borderWidth: 2,
        borderColor: selected ? theme.ink : theme['ink-3'],
        backgroundColor: selected ? theme.ink : 'transparent',
      }}
    />
  );
}
