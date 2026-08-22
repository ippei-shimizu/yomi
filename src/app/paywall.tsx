import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radius } from '@/design/tokens';
import {
  PRO_FEATURES,
  useEntitlement,
  useOfferings,
  usePurchaseActions,
  type PaywallTrigger,
} from '@/domain/entitlement';
import {
  DEFAULT_PLAN,
  PLANS,
  PRO_BENEFITS,
  ctaLabelFor,
  headlineFor,
  renewalNoticeFor,
  type PlanKind,
} from '@/features/paywall/copy';
import { capture } from '@/lib/analytics';
import { Button, Text, useThemeColors } from '@/ui';

/** 法務ページ。#30 で実 URL に差し替える */
const TERMS_URL = 'https://example.com/yomi/terms';
const PRIVACY_URL = 'https://example.com/yomi/privacy';

export default function PaywallScreen() {
  const { trigger } = useLocalSearchParams<{ trigger?: string }>();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { isPro } = useEntitlement();
  const offerings = useOfferings();
  const [selected, setSelected] = useState<PlanKind>(DEFAULT_PLAN);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    capture({
      name: 'paywall_viewed',
      properties: { trigger: isPaywallTrigger(trigger) ? trigger : 'settings' },
    });
  }, [trigger]);

  const onChanged = () => {
    void queryClient.invalidateQueries({ queryKey: ['entitlement'] });
  };
  const { purchase, restore } = usePurchaseActions(onChanged);

  const packageFor = (kind: PlanKind) => {
    const current = offerings.data;
    if (!current) return null;
    if (kind === 'monthly') return current.monthly ?? null;
    if (kind === 'annual') return current.annual ?? null;
    return current.lifetime ?? null;
  };

  const runPurchase = async () => {
    const target = packageFor(selected);
    if (!target) {
      Alert.alert('購入できません', 'しばらくしてからもう一度お試しください。');
      return;
    }

    setBusy(true);
    try {
      await purchase(target);
      capture({ name: 'purchase_completed', properties: { product: selected } });
      router.back();
    } catch (error) {
      // ユーザーによるキャンセルはエラーとして見せない
      if (!isUserCancelled(error)) {
        Alert.alert('購入できませんでした', 'しばらくしてからもう一度お試しください。');
      }
    } finally {
      setBusy(false);
    }
  };

  const runRestore = async () => {
    setBusy(true);
    try {
      await restore();
      Alert.alert('復元しました', '購入内容を確認しました。');
    } catch {
      Alert.alert('復元できませんでした', '購入履歴が見つかりませんでした。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        paddingHorizontal: layout.screenPadding,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 32,
        gap: layout.sectionGap,
      }}
    >
      <View style={{ alignItems: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="閉じる"
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Text variant="heading" script="latin" style={{ color: theme.ink }}>
            ✕
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="display" style={{ color: theme.ink }}>
          {headlineFor(trigger)}
        </Text>
        {isPro ? (
          <Text variant="body" style={{ color: theme['ink-2'] }}>
            Yomi Pro をご利用中です
          </Text>
        ) : null}
      </View>

      <View style={{ gap: 12 }}>
        {PRO_BENEFITS.map((benefit) => (
          <View key={benefit} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text variant="body" script="latin" style={{ color: colors.status.ok }}>
              ✓
            </Text>
            <Text variant="body" style={{ color: theme.ink }}>
              {benefit}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: layout.cardGap }}>
        {PLANS.map((plan) => {
          const isSelected = plan.kind === selected;
          const price = packageFor(plan.kind)?.product.priceString ?? plan.fallbackPrice;

          return (
            <Pressable
              key={plan.kind}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelected(plan.kind)}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  borderRadius: radius.card,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.brand.brand : 'transparent',
                  backgroundColor: isSelected ? colors.brand['brand-soft'] : theme.surface,
                }}
              >
                <Text variant="body" style={{ flex: 1, color: theme.ink }}>
                  {plan.label}
                </Text>
                {plan.badge === undefined ? null : (
                  <View
                    style={{
                      backgroundColor: colors.source['src-amber'],
                      borderRadius: radius.pill,
                      paddingHorizontal: 10,
                      height: 20,
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="caption" style={{ color: '#FFFFFF', lineHeight: 13 }}>
                      {plan.badge}
                    </Text>
                  </View>
                )}
                <Text variant="body" script="latin" style={{ color: theme.ink }}>
                  {price}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Button
        label={ctaLabelFor(selected)}
        onPress={() => void runPurchase()}
        disabled={busy || isPro}
      />

      {/* 審査要件: 価格・期間・自動更新の明記（docs/PRD.md §7.5） */}
      <Text variant="caption" style={{ color: theme['ink-2'] }}>
        {renewalNoticeFor(selected)}
      </Text>

      {/* 審査要件: 利用規約・プライバシーポリシーへのリンク */}
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <LegalLink label="利用規約" url={TERMS_URL} />
        <LegalLink label="プライバシーポリシー" url={PRIVACY_URL} />
      </View>

      {/* 審査要件: 購入を復元 */}
      <Button
        label="購入を復元"
        variant="secondary"
        onPress={() => void runRestore()}
        disabled={busy}
      />
    </ScrollView>
  );
}

function LegalLink({ label, url }: { label: string; url: string }) {
  const theme = useThemeColors();

  return (
    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(url)}>
      <Text variant="caption" style={{ color: theme['ink-2'], textDecorationLine: 'underline' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function isPaywallTrigger(value: string | undefined): value is PaywallTrigger {
  return value !== undefined && (PRO_FEATURES as readonly string[]).includes(value);
}

/** RevenueCat はユーザーのキャンセルも例外で返す。エラー表示は出さない */
function isUserCancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Record<string, unknown>)['userCancelled'] === true
  );
}
