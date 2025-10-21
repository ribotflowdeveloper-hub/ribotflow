import { getTranslations } from 'next-intl/server';
import { InstallationManager } from './_components/InstallationManager';

export default async function InstallPage() {
  const t = await getTranslations('SettingsPage.install');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t('title')}</h3>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <div className="border-t border-border pt-6">
        <InstallationManager
          texts={{
            install_button: t('install_button'),
            desktop_title: t('desktop_title'),
            desktop_instructions: t('desktop_instructions'),
            android_title: t('android_title'),
            android_instructions: t('android_instructions'),
            ios_title: t('ios_title'),
            ios_instructions: t('ios_instructions'),
            already_installed: t('already_installed'),
            connect_device_title: t('manual_install_title'),
          }}
        />
      </div>
    </div>
  );
}