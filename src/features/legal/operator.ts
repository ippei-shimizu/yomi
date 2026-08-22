/**
 * 事業者情報。
 *
 * **App Store 提出前に実際の値へ差し替える。** 特定商取引法に基づく表記は
 * 事業者名・所在地・連絡先の記載が必須で、記入されていないと審査を通らない。
 * 空文字のままの項目は画面に「（提出前に記入）」と表示される。
 */
export type OperatorInfo = {
  /** 販売業者（個人の場合は氏名） */
  name: string;
  /** 運営統括責任者 */
  representative: string;
  /** 所在地。請求があれば遅滞なく開示する場合はその旨 */
  address: string;
  /** 電話番号。請求があれば遅滞なく開示する場合はその旨 */
  phone: string;
  /** 問い合わせ先メールアドレス */
  email: string;
};

export const OPERATOR: OperatorInfo = {
  name: '',
  representative: '',
  address: '',
  phone: '',
  email: '',
};

/** 未記入の項目に出すプレースホルダ。提出前に気づけるよう明示的な文言にする */
export const UNFILLED = '（提出前に記入）';

export function operatorValue(value: string): string {
  return value.trim().length > 0 ? value : UNFILLED;
}

/** 提出前チェック用。未記入の項目名を返す */
export function unfilledOperatorFields(operator: OperatorInfo = OPERATOR): (keyof OperatorInfo)[] {
  return (Object.keys(operator) as (keyof OperatorInfo)[]).filter(
    (key) => operator[key].trim().length === 0,
  );
}
