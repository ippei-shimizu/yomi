import { Alert } from 'react-native';

import type { Translate } from '@/lib/i18n';

/**
 * 削除の確認ダイアログ。削除は復元できないので必ず一段挟む。
 */
export function confirmDelete(t: Translate, count: number, onConfirm: () => void): void {
  Alert.alert(t('library.deleteConfirm', { count }), t('common.irreversible'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.delete'), style: 'destructive', onPress: onConfirm },
  ]);
}
