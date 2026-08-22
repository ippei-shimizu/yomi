import { Pressable, useWindowDimensions, View } from 'react-native';

import { Text } from '../Text';
import { colors, layout, radius } from '@/design/tokens';

/**
 * 浮いた pill 型タブバー（docs/DesignGuideline.md §5）。
 *
 * 幅は画面幅 − 40、高さ 64、下から 24pt 浮かせる。背景は brand。
 * **アイコンのみでラベルは出さない**。選択中は下に 4pt の白ドット。
 *
 * このバーがコンテンツに重なるため、各リストは下端に
 * layout.listBottomInset の余白を空けること（R-UI4）。
 */
/**
 * expo-router の tabBar に渡ってくる props のうち、このバーが実際に使う部分だけ。
 *
 * expo-router 57 は @react-navigation ではなく standard-navigation を使っており、
 * 完全な型は build/ 配下の内部パスにしか無い。内部パスを import するとバージョン
 * 追従で壊れるため、必要な形だけを構造的に定義する。
 */
export type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
};

const TAB_GLYPHS: Record<string, string> = {
  index: '⌂',
  library: '☰',
  stats: '◔',
  settings: '⚙',
};

export function TabBar({ state, navigation }: TabBarProps) {
  const { width } = useWindowDimensions();

  return (
    <View
      style={{
        position: 'absolute',
        bottom: layout.tabBar.bottomOffset,
        alignSelf: 'center',
        flexDirection: 'row',
        width: width - layout.tabBar.horizontalInset,
        height: layout.tabBar.height,
        borderRadius: radius.pill,
        backgroundColor: colors.brand.brand,
        alignItems: 'center',
      }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={route.name}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <Text
              variant="heading"
              script="latin"
              style={{ color: '#FFFFFF', opacity: focused ? 1 : 0.6 }}
            >
              {TAB_GLYPHS[route.name] ?? '•'}
            </Text>
            <View
              style={{
                width: layout.tabBar.indicatorSize,
                height: layout.tabBar.indicatorSize,
                borderRadius: radius.pill,
                backgroundColor: focused ? '#FFFFFF' : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
