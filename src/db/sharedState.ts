import { Directory, File, Paths } from 'expo-file-system';

import { localeFromTag, type Locale } from '@/lib/i18n';

import { APP_GROUP } from './appGroup';

/**
 * 本体と Share Extension が共有する小さな状態。
 *
 * Extension は保存上限の判定のために Pro 状態を知る必要があるが、
 * RevenueCat SDK は Extension に入れない（起動時間とメモリの制約）。
 * そこで本体が判定結果だけをここに書き、Extension は読むだけにする。
 *
 * DesignDoc は UserDefaults(suiteName:) を挙げているが、それには
 * カスタムネイティブモジュールが必要になる。App Group コンテナ上の
 * ファイルなら expo-file-system だけで読み書きでき、DB と同じ経路で
 * 完結する。保持する情報も同じ（真偽値ひとつ）。
 *
 * **機微情報は置かない。** URL・タイトル・メモは DB にのみ持つ。
 */

const FILE_NAME = 'shared-state.json';

export type SharedState = {
  /** 本体が useEntitlement() で判定した結果のキャッシュ */
  isPro: boolean;
  /**
   * 本体が解決した表示言語。
   *
   * Extension は MMKV の設定を読めないので、これが無いと端末の言語しか
   * 分からず、アプリ内で言語を変えても共有シートだけ別言語になる。
   * 未設定（本体を一度も開いていない）なら null。
   */
  locale: Locale | null;
};

const DEFAULT_STATE: SharedState = { isPro: false, locale: null };

function stateFile(): File {
  const container = Paths.appleSharedContainers[APP_GROUP];
  if (!container) {
    throw new Error(`App Group "${APP_GROUP}" のコンテナを解決できません。`);
  }
  return new File(container, FILE_NAME);
}

/**
 * 共有状態を読む。読めない場合は既定値（無料プラン扱い）を返す。
 *
 * 判定できないときに Pro 扱いにすると上限が無効になるため、
 * 必ず安全側（無料）に倒す。
 */
export function readSharedState(): SharedState {
  try {
    const file = stateFile();
    if (!file.exists) return DEFAULT_STATE;

    const parsed: unknown = JSON.parse(file.textSync());
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_STATE;

    const record = parsed as Record<string, unknown>;
    const rawLocale = record['locale'];
    return {
      isPro: record['isPro'] === true,
      locale: typeof rawLocale === 'string' ? localeFromTag(rawLocale) : null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

/**
 * 本体から共有状態の一部を書く。Extension からは呼ばない。
 *
 * 書き手が複数（課金判定と言語設定）あるので、必ず読んでから混ぜる。
 * 丸ごと上書きすると、あとから書いた方がもう片方を消してしまう。
 */
export function updateSharedState(patch: Partial<SharedState>): void {
  writeSharedState({ ...readSharedState(), ...patch });
}

function writeSharedState(state: SharedState): void {
  const file = stateFile();
  const parent = file.parentDirectory;
  if (parent instanceof Directory && !parent.exists) parent.create({ intermediates: true });

  file.write(JSON.stringify(state));
}
