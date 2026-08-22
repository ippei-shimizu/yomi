import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  ZenKakuGothicNew_400Regular,
  ZenKakuGothicNew_500Medium,
  ZenKakuGothicNew_700Bold,
} from '@expo-google-fonts/zen-kaku-gothic-new';
import { useFonts } from 'expo-font';

/**
 * バンドルするフォント。
 * tokens.ts の fontFamilies が参照する family 名と 1 対 1 に対応させる。
 */
export const FONTS = {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  ZenKakuGothicNew_400Regular,
  ZenKakuGothicNew_500Medium,
  ZenKakuGothicNew_700Bold,
} as const;

/** @returns フォントの読み込みが終わったか */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FONTS);
  // 読み込みに失敗してもシステムフォントで表示は続ける。
  // フォントのためにアプリが起動しないほうが困る。
  return loaded || error !== null;
}
