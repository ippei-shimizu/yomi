import { router } from 'expo-router';
import { Alert, Linking, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { THEME_PREFERENCES, type ThemePreference } from '@/design/scheme';
import { LOCALE_PREFERENCES, type LocalePreference, type MessageKey } from '@/lib/i18n';
import { layout } from '@/design/tokens';
import { useEntitlement, usePurchaseActions } from '@/domain/entitlement';
import { LEGAL_DOCUMENT_IDS, legalDocument } from '@/features/legal/documents';
import { SUPPORT_URL } from '@/features/settings/appInfo';
import { ProBanner } from '@/features/settings/ProBanner';
import { SettingsRow, SettingsSection } from '@/features/settings/SettingsRow';
import {
  useLocaleSetting,
  useNotificationTimesSetting,
  useReadConfirmSetting,
  useThemeSetting,
} from '@/features/settings/useSettings';
import { VersionRow } from '@/features/settings/VersionRow';
import { Text, useLocale, useThemeColors, useTranslation } from '@/ui';
import { useQueryClient } from '@tanstack/react-query';

const THEME_LABEL_KEYS: Record<ThemePreference, MessageKey> = {
  system: 'settings.themeSystem',
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
};

const LOCALE_LABEL_KEYS: Record<LocalePreference, MessageKey> = {
  system: 'settings.languageSystem',
  ja: 'settings.languageJa',
  en: 'settings.languageEn',
};

export default function SettingsScreen() {
  const theme = useThemeColors();
  const t = useTranslation();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { isPro, limits } = useEntitlement();
  const { restore } = usePurchaseActions(() => {
    void queryClient.invalidateQueries({ queryKey: ['entitlement'] });
  });

  const [readConfirm, setReadConfirm] = useReadConfirmSetting();
  const [notificationTimes] = useNotificationTimesSetting();
  const [themePreference, setThemePreference] = useThemeSetting();
  const [localePreference, setLocalePreference] = useLocaleSetting();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        paddingHorizontal: layout.screenPadding,
        paddingTop: insets.top + 8,
        paddingBottom: layout.listBottomInset,
        gap: layout.sectionGap,
      }}
    >
      <Text variant="display" style={{ color: theme.ink }}>
        {t('settings.title')}
      </Text>

      {isPro ? null : (
        <ProBanner
          onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'settings' } })}
        />
      )}

      <SettingsSection title={t('settings.sectionNotification')}>
        <SettingsRow
          label={t('settings.dailyPick')}
          value={notificationTimes}
          onPress={() => router.push('/(tabs)/settings/notification')}
        />
        <SettingsRow
          label={t('settings.readConfirm')}
          toggle={{ value: readConfirm, onChange: setReadConfirm }}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.sectionOrganize')}>
        <SettingsRow
          label={t('settings.tags')}
          onPress={() => router.push('/(tabs)/settings/tags')}
        />
        <SettingsRow
          label={t('settings.export')}
          onPress={() => router.push('/(tabs)/settings/export')}
        />
        <SettingsRow
          label={t('settings.import')}
          badge={limits.urlImport ? undefined : 'Pro'}
          onPress={() =>
            limits.urlImport
              ? router.push('/(tabs)/settings/import')
              : router.push({ pathname: '/paywall', params: { trigger: 'import' } })
          }
        />
      </SettingsSection>

      <SettingsSection title={t('settings.sectionDisplay')}>
        <SettingsRow
          label={t('settings.theme')}
          value={t(THEME_LABEL_KEYS[themePreference])}
          onPress={() =>
            Alert.alert(t('settings.theme'), undefined, [
              // 選べる値は THEME_PREFERENCES から作る。増えたときに出し忘れない
              ...THEME_PREFERENCES.map((preference) => ({
                text: t(THEME_LABEL_KEYS[preference]),
                onPress: () => setThemePreference(preference),
              })),
              { text: t('common.cancel'), style: 'cancel' as const },
            ])
          }
        />
        <SettingsRow
          label={t('settings.language')}
          value={t(LOCALE_LABEL_KEYS[localePreference])}
          onPress={() =>
            Alert.alert(t('settings.language'), undefined, [
              ...LOCALE_PREFERENCES.map((preference) => ({
                text: t(LOCALE_LABEL_KEYS[preference]),
                onPress: () => setLocalePreference(preference),
              })),
              { text: t('common.cancel'), style: 'cancel' as const },
            ])
          }
        />
      </SettingsSection>

      <SettingsSection title={t('settings.sectionSupport')}>
        <SettingsRow
          label={t('settings.shareSheetHowTo')}
          onPress={() => router.push('/onboarding/share')}
        />
        <SettingsRow
          label={t('settings.contact')}
          onPress={() => void Linking.openURL(SUPPORT_URL)}
        />
        <SettingsRow
          label={t('settings.restore')}
          onPress={() => {
            void restore()
              .then(() => Alert.alert(t('settings.restored'), t('settings.restoredDescription')))
              .catch(() =>
                Alert.alert(t('settings.restoreFailed'), t('settings.restoreFailedDescription')),
              );
          }}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.sectionInfo')}>
        {LEGAL_DOCUMENT_IDS.map((id) => (
          <SettingsRow
            key={id}
            label={legalDocument(t, locale, id).title}
            onPress={() => router.push({ pathname: '/legal', params: { doc: id } })}
          />
        ))}
        <VersionRow onUnlock={() => router.push('/dev-unlock')} />
      </SettingsSection>
    </ScrollView>
  );
}
