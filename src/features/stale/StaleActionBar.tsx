import { View } from 'react-native';

import { layout } from '@/design/tokens';
import { Button } from '@/ui';

/**
 * 放置整理の下部バー。「捨てる」と「今週読む」を対等に並べる。
 *
 * どちらも選択件数を出す。0 件では押せない。
 */
export function StaleActionBar({
  count,
  bottomInset,
  onArchive,
  onBump,
}: {
  count: number;
  bottomInset: number;
  onArchive: () => void;
  onBump: () => void;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: layout.screenPadding,
        right: layout.screenPadding,
        bottom: bottomInset,
        flexDirection: 'row',
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Button
          label={`アーカイブ (${count})`}
          variant="secondary"
          onPress={onArchive}
          disabled={count === 0}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Button label={`今週読む (${count})`} onPress={onBump} disabled={count === 0} />
      </View>
    </View>
  );
}
