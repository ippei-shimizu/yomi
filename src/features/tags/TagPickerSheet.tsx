import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { tagRepo } from '@/db/repositories';
import { radius, typography } from '@/design/tokens';
import { useEntitlement } from '@/domain/entitlement';
import { BottomSheet, Chip, Text, useThemeColors, useTranslation } from '@/ui';

import { useItemTags, useTagActions, useTags } from './queries';
import { tagNameErrorMessage, validateTagName } from './tagName';

/**
 * タグ選択シート。
 * 新規タグの作成と、既存タグの付け外し。
 */
export function TagPickerSheet({
  itemId,
  visible,
  onClose,
  onRequestPaywall,
}: {
  itemId: string;
  visible: boolean;
  onClose: () => void;
  onRequestPaywall: () => void;
}) {
  const theme = useThemeColors();
  const t = useTranslation();
  const { limits } = useEntitlement();

  const { data: allTags = [] } = useTags();
  const { data: itemTags = [] } = useItemTags(itemId);
  const actions = useTagActions();

  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const attachedIds = useMemo(() => new Set(itemTags.map((tag) => tag.id)), [itemTags]);
  const atTagLimit = limits.tagLimit !== null && allTags.length >= limits.tagLimit;

  const onCreate = () => {
    if (atTagLimit) {
      onRequestPaywall();
      return;
    }

    const result = validateTagName(
      input,
      allTags.map((tag) => tag.name),
    );
    if (!result.ok) {
      setError(tagNameErrorMessage(t, result.error));
      return;
    }

    actions.mutate(
      { type: 'create', name: result.name },
      {
        onSuccess: (tag) => {
          // 作ったタグはそのままこのアイテムに付ける
          if (tag && typeof tag === 'object' && 'id' in tag) {
            actions.mutate({ type: 'attach', itemId, tagId: tag.id });
          }
        },
      },
    );
    setInput('');
    setError(null);
  };

  return (
    <BottomSheet visible={visible} onRequestClose={onClose}>
      <Text variant="heading" style={{ color: theme.ink }}>
        {t('item.tags')}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={input}
          onChangeText={(value) => {
            setInput(value);
            setError(null);
          }}
          placeholder={t('tags.newTagPlaceholder')}
          placeholderTextColor={theme['ink-3']}
          onSubmitEditing={onCreate}
          returnKeyType="done"
          style={{
            ...typography.body,
            flex: 1,
            color: theme.ink,
            backgroundColor: theme['surface-muted'],
            borderRadius: radius.pill,
            paddingHorizontal: 16,
            height: 44,
          }}
        />
        <Pressable
          accessibilityRole="button"
          onPress={onCreate}
          disabled={input.trim().length === 0}
          style={{
            justifyContent: 'center',
            paddingHorizontal: 12,
            opacity: input.trim().length === 0 ? 0.4 : 1,
          }}
        >
          <Text variant="body" style={{ color: theme.ink }}>
            {t('tags.add')}
          </Text>
        </Pressable>
      </View>

      {error === null ? null : (
        <Text variant="caption" style={{ color: theme['ink-2'] }}>
          {error}
        </Text>
      )}

      <ScrollView
        style={{ maxHeight: 220 }}
        contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
      >
        {allTags.map((tag) => (
          <Chip
            key={tag.id}
            label={tag.name}
            selected={attachedIds.has(tag.id)}
            onPress={() =>
              actions.mutate({
                type: attachedIds.has(tag.id) ? 'detach' : 'attach',
                itemId,
                tagId: tag.id,
              })
            }
          />
        ))}
      </ScrollView>

      {atTagLimit ? (
        <Pressable accessibilityRole="button" onPress={onRequestPaywall}>
          {/* 事実だけを書く */}
          <Text variant="caption" style={{ color: theme['ink-2'] }}>
            {t('tags.limitReached', { limit: tagRepo.FREE_PLAN_TAG_LIMIT })}
          </Text>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
}
