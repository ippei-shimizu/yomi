import { View } from 'react-native';

import type { Source } from '@/domain/url';

import { Text } from '../Text';
import { SOURCE_COLORS, layout, radius } from '../tokens';

/**
 * ソースアイコンの器（docs/DesignGuideline.md §2.3）。
 * 32×32、角丸 10、背景はソースカラー、中身は白の単色。
 */
const SOURCE_GLYPHS: Record<Source, string> = {
  // ブランド紫と X の紫は同色なので、X には必ず 𝕏 を載せて区別する（§2.3）
  x: '𝕏',
  threads: '@',
  instagram: '◎',
  youtube: '▶',
  zenn: 'Z',
  qiita: 'Q',
  note: 'n',
  medium: 'M',
  web: '◍',
};

export function SourceIcon({
  source,
  size = layout.sourceIconSize,
}: {
  source: Source;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.icon,
        backgroundColor: SOURCE_COLORS[source],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="caption" script="latin" style={{ color: '#FFFFFF' }}>
        {SOURCE_GLYPHS[source]}
      </Text>
    </View>
  );
}

export { SOURCE_GLYPHS };
