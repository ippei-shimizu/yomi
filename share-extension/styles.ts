import { StyleSheet } from 'react-native';

import { colors, radius, typography } from '@/design/tokens';

/**
 * Share Extension のカード。
 * 本体と同じトークンを使うが、**影なし・角丸 24**。
 *
 * NativeWind ではなく StyleSheet を使っているのは、Extension のバンドルに
 * スタイル変換のランタイムを持ち込まないため（起動 2 秒以内の要件）。
 * 値はすべて @/ui/tokens 経由で、色をハードコードしない。
 */
const CARD_RADIUS = 24;

export const EXTENSION_COLORS = {
  ok: colors.status.ok,
  ink: colors.light.ink,
  ink2: colors.light['ink-2'],
  surface: colors.light.surface,
  surfaceMuted: colors.light['surface-muted'],
  brand: colors.brand.brand,
} as const;

export const extensionStyles = StyleSheet.create({
  card: {
    backgroundColor: EXTENSION_COLORS.surface,
    borderRadius: CARD_RADIUS,
    padding: 20,
    gap: 12,
  },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: EXTENSION_COLORS.ink2,
  },
  message: { ...typography.heading, color: EXTENSION_COLORS.ink },
  description: { ...typography.caption, color: EXTENSION_COLORS.ink2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    justifyContent: 'center',
    backgroundColor: EXTENSION_COLORS.surfaceMuted,
  },
  tagSelected: { backgroundColor: EXTENSION_COLORS.brand },
  tagLabel: { ...typography.caption, color: EXTENSION_COLORS.ink },
  tagLabelSelected: { ...typography.caption, color: EXTENSION_COLORS.surface },
  closeButton: {
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EXTENSION_COLORS.surfaceMuted,
  },
  closeLabel: { ...typography.body, color: EXTENSION_COLORS.ink },
});
