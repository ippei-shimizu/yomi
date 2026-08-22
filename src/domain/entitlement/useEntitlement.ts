import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import Purchases, { type CustomerInfo, type PurchasesOffering } from 'react-native-purchases';

import { writeSharedState } from '@/db/sharedState';

import { readOverride, type OverrideState } from './devOverride';
import { limitsFor, type PlanLimits } from './plan';

/**
 * Pro 判定。
 *
 * **設計原則 4: useEntitlement() 以外で RevenueCat を参照しない。**
 * 判定が散ると Dev override との整合が取れず、上限判定にも抜けが出る。
 */
export const PRO_ENTITLEMENT = 'pro';

export type EntitlementSource = 'override' | 'revenuecat' | 'none';

export type Entitlement = {
  isPro: boolean;
  source: EntitlementSource;
  limits: PlanLimits;
  isLoading: boolean;
};

export function configurePurchases(apiKey: string): void {
  // アカウント機能が無いため匿名 ID を使う
  Purchases.configure({ apiKey, appUserID: undefined });
}

function hasProEntitlement(info: CustomerInfo | undefined): boolean {
  return info?.entitlements.active[PRO_ENTITLEMENT] != null;
}

export function useEntitlement(): Entitlement {
  const [override, setOverride] = useState<OverrideState>({ valid: false });

  useEffect(() => {
    let cancelled = false;
    void readOverride().then((state) => {
      if (!cancelled) setOverride(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const customerInfo = useQuery({
    queryKey: ['entitlement', 'customerInfo'],
    queryFn: (): Promise<CustomerInfo> => Purchases.getCustomerInfo(),
    // 購入・復元のたびに invalidate するので、こまめな再取得は要らない
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const isPro = override.valid || hasProEntitlement(customerInfo.data);
  const source: EntitlementSource = override.valid
    ? 'override'
    : hasProEntitlement(customerInfo.data)
      ? 'revenuecat'
      : 'none';

  useEffect(() => {
    // Share Extension は RevenueCat SDK を持たないため、判定結果だけを共有する
    try {
      writeSharedState({ isPro });
    } catch {
      // 共有に失敗しても本体の動作は続ける。Extension 側は既定で無料扱いに倒れる
    }
  }, [isPro]);

  return { isPro, source, limits: limitsFor(isPro), isLoading: customerInfo.isLoading };
}

export function useOfferings() {
  return useQuery({
    queryKey: ['entitlement', 'offerings'],
    queryFn: async (): Promise<PurchasesOffering | null> =>
      (await Purchases.getOfferings()).current,
  });
}

/** 購入と復元。呼び出し側は完了後に entitlement を invalidate する */
export function usePurchaseActions(onChanged: () => void) {
  const purchase = useCallback(
    async (packageToPurchase: Parameters<typeof Purchases.purchasePackage>[0]) => {
      await Purchases.purchasePackage(packageToPurchase);
      onChanged();
    },
    [onChanged],
  );

  const restore = useCallback(async () => {
    await Purchases.restorePurchases();
    onChanged();
  }, [onChanged]);

  return { purchase, restore };
}
