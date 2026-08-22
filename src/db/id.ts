import { getRandomBytes } from 'expo-crypto';

import { UUID_V7_RANDOM_BYTES, buildUuidV7 } from './uuidv7';

/** 新しい id を採番する。UUID v7 の詳細は uuidv7.ts を参照 */
export function newId(): string {
  return buildUuidV7(Date.now(), getRandomBytes(UUID_V7_RANDOM_BYTES));
}
