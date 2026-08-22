import { Alert } from 'react-native';

/**
 * 削除の確認ダイアログ。削除は復元できないので必ず一段挟む。
 */
export function confirmDelete(count: number, onConfirm: () => void): void {
  Alert.alert(`${count} 件を削除しますか？`, 'この操作は取り消せません。', [
    { text: 'やめる', style: 'cancel' },
    { text: '削除', style: 'destructive', onPress: onConfirm },
  ]);
}
