import { Tabs } from 'expo-router';

/**
 * 浮いた pill 型タブバー（docs/DesignGuideline.md §5）は #5 で実装する。
 * ここでは 4 タブの構成のみ定義する。
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
