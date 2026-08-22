import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '@/design/tokens';
import { legalDocument, parseLegalDocumentId } from '@/features/legal/documents';
import { LegalDocumentView } from '@/features/legal/LegalDocumentView';
import { ScreenHeader, useLocale, useThemeColors, useTranslation } from '@/ui';

/** 利用規約・プライバシーポリシー・特定商取引法に基づく表記 */
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const t = useTranslation();
  const locale = useLocale();

  const document = legalDocument(t, locale, parseLegalDocumentId(doc));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        paddingHorizontal: layout.screenPadding,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 48,
        gap: layout.sectionGap,
      }}
    >
      <ScreenHeader title={document.title} titleVariant="heading" onBack={() => router.back()} />
      <LegalDocumentView document={document} />
    </ScrollView>
  );
}
