const palette = require('./src/ui/palette.json');

/**
 * 色の定義は src/ui/palette.json が唯一の情報源。
 * SVG / Skia から参照する src/ui/tokens.ts も同じファイルを読む
 * （docs/DesignGuideline.md §10）。
 *
 * ダークモードの色は tokens.ts 側で解決する。NativeWind の dark: 修飾子は
 * useColorScheme に追従するが、SVG など className を使えない箇所と挙動を
 * そろえるため、テーマ依存の色は tokens.ts の useThemeColors() から取る。
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './share-extension/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ...palette.light,
        ...palette.brand,
        ...palette.source,
        ...palette.status,
        dark: palette.dark,
      },
      borderRadius: {
        icon: '10px',
        thumb: '12px',
        card: '20px',
        'card-lg': '28px',
        pill: '999px',
      },
      fontFamily: {
        display: ['Outfit_700Bold'],
        heading: ['Outfit_600SemiBold'],
        body: ['Outfit_500Medium'],
        caption: ['Outfit_400Regular'],
        'ja-display': ['ZenKakuGothicNew_700Bold'],
        'ja-heading': ['ZenKakuGothicNew_500Medium'],
        'ja-body': ['ZenKakuGothicNew_500Medium'],
        'ja-caption': ['ZenKakuGothicNew_400Regular'],
      },
    },
  },
  plugins: [],
};
