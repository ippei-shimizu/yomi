import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '@/design/tokens';
import {
  isPaywallTrigger,
  isUserCancelled,
  useEntitlement,
  useOfferings,
  usePurchaseActions,
} from '@/domain/entitlement';
import {
  DEFAULT_PLAN,
  PLANS,
  ctaLabelFor,
  headlineFor,
  renewalNoticeFor,
  type PlanKind,
} from '@/features/paywall/copy';
import { LegalLink } from '@/features/paywall/LegalLink';
import { PRIVACY_URL, TERMS_URL } from '@/features/paywall/legal';
import { PlanOption } from '@/features/paywall/PlanOption';
import { ProBenefitList } from '@/features/paywall/ProBenefitList';
import { capture } from '@/lib/analytics';
import { Button, Text, useThemeColors } from '@/ui';

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

      <ProBenefitList />

      <View style={{ gap: layout.cardGap }}>
        {PLANS.map((plan) => (
          <PlanOption
            key={plan.kind}
            label={plan.label}
            price={packageFor(plan.kind)?.product.priceString ?? plan.fallbackPrice}
            badge={plan.badge}
            selected={plan.kind === selected}
            onPress={() => setSelected(plan.kind)}
          />
        ))}
      </View>

      <Button
        label={ctaLabelFor(selected)}
        onPress={() => void runPurchase()}
        disabled={busy || isPro}
      />

      {/* 審査要件: 価格・期間・自動更新の明記 */}
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
