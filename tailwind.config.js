/**
 * デザイントークン（色・角丸・フォント）は #5 で docs/DesignGuideline.md §10 の
 * 定義を追加する。ここでは NativeWind が動く最小構成のみ。
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './share-extension/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
