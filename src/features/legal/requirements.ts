/**
 * 動作環境。特定商取引法に基づく表記へ出す値。
 *
 * app.config.ts の deploymentTarget と食い違うと、実際には動かない端末を
 * 「対応」と表記することになる。一致は appConfig のテストで固定する。
 */
export const MINIMUM_IOS_VERSION = '17.0';
