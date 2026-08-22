import { describe, expect, it } from 'vitest';

import appConfig from '../../app.config';
import { APP_GROUP } from '@/db/appGroup';

/**
 * app.config.ts は Expo の設定ローダが相対 TS import を解決できないため、
 * App Group を直接書いている。src/db/appGroup.ts と食い違うと、共有シートで
 * 保存したものが本体から見えないという気づきにくい壊れ方をするので、
 * ここで一致を強制する。
 */
describe('app.config.ts', () => {
  it('entitlements の App Group が APP_GROUP と一致する', () => {
    const groups = appConfig.ios?.entitlements?.['com.apple.security.application-groups'];
    expect(groups).toEqual([APP_GROUP]);
  });

  it('bundleIdentifier が docs/DesignDoc.md §7.1 のとおり', () => {
    expect(appConfig.ios?.bundleIdentifier).toBe('jp.ippei.yomi');
  });

  it('iOS 専用で iPad をサポートしない（docs/PRD.md §1）', () => {
    expect(appConfig.platforms).toEqual(['ios']);
    expect(appConfig.ios?.supportsTablet).toBe(false);
  });

  it('Background Modes に fetch と processing がある（MetaFetchWorker 用）', () => {
    expect(appConfig.ios?.infoPlist?.['UIBackgroundModes']).toEqual(['fetch', 'processing']);
  });
});
