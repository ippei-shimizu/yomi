import { View } from 'react-native';

import type { Item } from '@/db/schema';
import { Button } from '@/ui';

/**
 * 状態に応じてボタンを出し分ける。
 *
 * 押せない操作は並べない。既読に「読んだ」を出しても迷わせるだけ。
 */
export function ItemStatusActions({
  item,
  onRead,
  onSnooze,
  onArchive,
  onRestore,
}: {
  item: Item;
  onRead: () => void;
  onSnooze: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const buttons =
    item.status === 'unread'
      ? [
          { label: '読んだ', onPress: onRead },
          { label: 'あとで', onPress: onSnooze },
          { label: 'アーカイブ', onPress: onArchive },
        ]
      : item.status === 'read'
        ? [
            { label: '未読に戻す', onPress: onRestore },
            { label: 'アーカイブ', onPress: onArchive },
          ]
        : [{ label: '未読に戻す', onPress: onRestore }];

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {buttons.map((button) => (
        <View key={button.label} style={{ flex: 1 }}>
          <Button label={button.label} variant="secondary" onPress={button.onPress} />
        </View>
      ))}
    </View>
  );
}
