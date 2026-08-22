import { createContext, useContext, type ReactNode } from 'react';

import type { TextScript } from '@/design/tokens';

import { useLocale } from './i18n';

/**
 * 既定の書体。表示言語から決まる。
 *
 * Text が個別に言語設定を購読すると、リストの行ぶんだけ MMKV の
 * リスナーが増える。値はアプリ全体で 1 つなので、最上位で 1 度だけ
 * 解決して Context で配る。
 */
const ScriptContext = createContext<TextScript>('ja');

export function ScriptProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  return (
    <ScriptContext.Provider value={locale === 'ja' ? 'ja' : 'latin'}>
      {children}
    </ScriptContext.Provider>
  );
}

export function useDefaultScript(): TextScript {
  return useContext(ScriptContext);
}
