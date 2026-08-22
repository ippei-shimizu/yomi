import { View } from 'react-native';

import { layout } from '@/design/tokens';
import { Text, useThemeColors } from '@/ui';

import type { LegalBlock, LegalDocument } from './types';

/**
 * 法務ページの本文。長文なので行間を広めに取る。
 *
 * 体裁を 1 箇所に集約しておくと、3 つの文書で見た目がばらつかない。
 */
export function LegalDocumentView({ document }: { document: LegalDocument }) {
  const theme = useThemeColors();

  return (
    <View style={{ gap: layout.sectionGap }}>
      <Text variant="caption" script="latin" style={{ color: theme['ink-3'] }}>
        最終改定 {document.updatedAt}
      </Text>

      {document.sections.map((section) => (
        <View key={section.heading} style={{ gap: 10 }}>
          <Text variant="heading" style={{ color: theme.ink }}>
            {section.heading}
          </Text>
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </View>
      ))}
    </View>
  );
}

const BODY_LINE_HEIGHT = 24;

function Block({ block }: { block: LegalBlock }) {
  const theme = useThemeColors();

  if (block.kind === 'paragraph') {
    return (
      <Text variant="body" style={{ color: theme['ink-2'], lineHeight: BODY_LINE_HEIGHT }}>
        {block.text}
      </Text>
    );
  }

  if (block.kind === 'list') {
    return (
      <View style={{ gap: 6 }}>
        {block.items.map((item) => (
          <View key={item} style={{ flexDirection: 'row', gap: 8 }}>
            <Text variant="body" style={{ color: theme['ink-3'], lineHeight: BODY_LINE_HEIGHT }}>
              ・
            </Text>
            <Text
              variant="body"
              style={{ flex: 1, color: theme['ink-2'], lineHeight: BODY_LINE_HEIGHT }}
            >
              {item}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {block.items.map((entry) => (
        <View key={entry.term} style={{ gap: 2 }}>
          <Text variant="caption" style={{ color: theme['ink-3'] }}>
            {entry.term}
          </Text>
          <Text variant="body" style={{ color: theme['ink-2'], lineHeight: BODY_LINE_HEIGHT }}>
            {entry.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
