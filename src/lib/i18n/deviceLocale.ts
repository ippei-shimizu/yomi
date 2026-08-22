/**
 * 端末の言語。
 *
 * expo-localization を足さずに Intl から読む。ネイティブモジュールを
 * 増やすと prebuild が必要になるうえ、この用途には Intl で足りる。
 * Info.plist の CFBundleLocalizations に宣言した言語のうち、端末の
 * 優先順位で最初に一致したものが返る。
 */
export function deviceLanguageTags(): string[] {
  try {
    return [Intl.DateTimeFormat().resolvedOptions().locale];
  } catch {
    // Intl が使えない環境でも起動を止めない
    return [];
  }
}
