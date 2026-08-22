import { View } from 'react-native';

import type { Item } from '@/db/schema';
import { Button, useTranslation } from '@/ui';

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
  const t = useTranslation();

  const buttons =
    item.status === 'unread'
      ? [
          { label: t('item.markRead'), onPress: onRead },
          { label: t('item.snooze'), onPress: onSnooze },
          { label: t('item.archive'), onPress: onArchive },
        ]
      : item.status === 'read'
        ? [
            { label: t('item.restore'), onPress: onRestore },
            { label: t('item.archive'), onPress: onArchive },
          ]
        : [{ label: t('item.restore'), onPress: onRestore }];

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
