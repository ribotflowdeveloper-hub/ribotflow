// supabase/functions/sync-worker/_lib/factory.ts
import type { MailProvider } from '../_providers/base.ts';
import { GoogleMailProvider } from '../_providers/google.ts';
import { MicrosoftMailProvider } from '../_providers/microsoft.ts';
import { CustomMailProvider } from '../_providers/custom.ts';

export function getMailProvider(provider: string): MailProvider {
  if (provider === 'google_gmail') return new GoogleMailProvider();
  if (provider === 'microsoft') return new MicrosoftMailProvider();
  if (provider === 'custom_email') return new CustomMailProvider();
  throw new Error(`Proveïdor desconegut: ${provider}`);
}