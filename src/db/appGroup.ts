/**
 * 本体アプリと Share Extension が共有する App Group。
 *
 * app.config.ts（entitlements の生成）と client.ts（DB を開くパスの解決）の
 * 両方から参照する。片方だけ変えると DB が別々のコンテナに作られ、共有シートで
 * 保存したものが本体から見えない、という気づきにくい壊れ方をするため 1 箇所に置く。
 */
export const APP_GROUP = 'group.jp.ippei.yomi';
