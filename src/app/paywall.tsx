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
import { LEGAL_DOCUMENT_IDS, legalDocument } from '@/features/legal/documents';
import {
  DEFAULT_PLAN,
  PLANS,
  ctaLabelKeyFor,
  headlineKeyFor,
  renewalNoticeKeyFor,
  type PlanKind,
} from '@/features/paywall/copy';
import { LegalLink } from '@/features/paywall/LegalLink';
import { PlanOption } from '@/features/paywall/PlanOption';
import { ProBenefitList } from '@/features/paywall/ProBenefitList';
import { capture } from '@/lib/analytics';
import { Button, Text, useLocale, useThemeColors, useTranslation } from '@/ui';

export default function PaywallScreen() {
  const { trigger } = useLocalSearchParams<{ trigger?: string }>();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const t = useTranslation();
  const locale = useLocale();

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
      Alert.alert(t('paywall.purchaseUnavailable'), t('common.retryLater'));
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
        Alert.alert(t('paywall.purchaseFailed'), t('common.retryLater'));
      }
    } finally {
      setBusy(false);
    }
  };

  const runRestore = async () => {
    setBusy(true);
    try {
      await restore();
      Alert.alert(t('paywall.restored'), t('paywall.restoredDescription'));
    } catch {
      Alert.alert(t('paywall.restoreFailed'), t('paywall.restoreFailedDescription'));
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
          accessibilityLabel={t('common.close')}
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
          {t(headlineKeyFor(trigger))}
        </Text>
        {isPro ? (
          <Text variant="body" style={{ color: theme['ink-2'] }}>
            {t('paywall.inUse')}
          </Text>
        ) : null}
      </View>

      <ProBenefitList />

      <View style={{ gap: layout.cardGap }}>
        {PLANS.map((plan) => (
          <PlanOption
            key={plan.kind}
            label={t(plan.labelKey)}
            price={packageFor(plan.kind)?.product.priceString ?? t(plan.fallbackPriceKey)}
            badge={plan.badgeKey === undefined ? undefined : t(plan.badgeKey)}
            selected={plan.kind === selected}
            onPress={() => setSelected(plan.kind)}
          />
        ))}
      </View>

      <Button
        label={t(ctaLabelKeyFor(selected))}
        onPress={() => void runPurchase()}
        disabled={busy || isPro}
      />

      {/* 審査要件: 価格・期間・自動更新の明記 */}
      <Text variant="caption" style={{ color: theme['ink-2'] }}>
        {t(renewalNoticeKeyFor(selected))}
      </Text>

      {/* 審査要件: 利用規約・プライバシーポリシーへのリンク。
          特定商取引法に基づく表記も、購入前に読める場所に置く必要がある */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {LEGAL_DOCUMENT_IDS.map((id) => (
          <LegalLink
            key={id}
            label={legalDocument(t, locale, id).title}
            onPress={() => router.push({ pathname: '/legal', params: { doc: id } })}
          />
        ))}
      </View>

      {/* 審査要件: 購入を復元 */}
      <Button
        label={t('paywall.restore')}
        variant="secondary"
        onPress={() => void runRestore()}
        disabled={busy}
      />
    </ScrollView>
  );
}
