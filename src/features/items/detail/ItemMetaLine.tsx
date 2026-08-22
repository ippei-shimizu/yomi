import { View } from 'react-native';

import type { Item } from '@/db/schema';
import { hostnameOf, shortDate } from '@/features/items/display';
import { SourceIcon, Text, useThemeColors } from '@/ui';

/**
 * 出典と日付。タイトルの下に置く 2 行。
 *
 * 保存日は常に出し、読了日は読んだものにだけ添える。
 */
export function ItemMetaLine({ item }: { item: Item }) {
  const theme = useThemeColors();

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <SourceIcon source={item.source} size={16} />
        <Text variant="caption" style={{ color: theme['ink-2'] }}>
          {item.siteName ?? hostnameOf(item.url)}
          {item.author === null ? '' : ` · @${item.author.replace(/^@/, '')}`}
        </Text>
      </View>
      <Text variant="caption" script="latin" style={{ color: theme['ink-2'] }}>
        保存: {shortDate(item.savedAt)}
        {item.readAt === null ? '' : `  読了: ${shortDate(item.readAt)}`}
      </Text>
    </View>
  );
}
