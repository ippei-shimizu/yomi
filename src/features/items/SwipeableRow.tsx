import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, layout, radius } from '@/design/tokens';
import { Text } from '@/ui';

/**
 * スワイプ操作。
 * 右スワイプ（フル）で読んだ、左スワイプ（フル）でアーカイブ。
 *
 * 背景は右 ok、左 danger。アイコンのみ。
 */
const FULL_SWIPE_RATIO = 0.4;

export function SwipeableRow({
  width,
  onSwipeRight,
  onSwipeLeft,
  children,
}: {
  width: number;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  children: ReactNode;
}) {
  const translateX = useSharedValue(0);
  const threshold = width * FULL_SWIPE_RATIO;

  const pan = Gesture.Pan()
    // 縦スクロールを妨げないよう、横方向にある程度動いてから反応させる
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > threshold) {
        translateX.value = withTiming(width, {}, () => runOnJS(onSwipeRight)());
      } else if (event.translationX < -threshold) {
        translateX.value = withTiming(-width, {}, () => runOnJS(onSwipeLeft)());
      } else {
        translateX.value = withTiming(0);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: translateX.value >= 0 ? colors.status.ok : colors.status.danger,
    justifyContent: 'center',
    alignItems: translateX.value >= 0 ? 'flex-start' : 'flex-end',
  }));

  return (
    <View style={{ height: layout.rowHeight, borderRadius: radius.card, overflow: 'hidden' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { paddingHorizontal: 24 }, backgroundStyle]}>
        <Text variant="heading" script="latin" style={{ color: '#FFFFFF' }}>
          ✓
        </Text>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}
