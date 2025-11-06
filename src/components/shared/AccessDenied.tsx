'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  backUrl?: string;
}

export function AccessDenied({
  title,
  message,
  backUrl
}: AccessDeniedProps) {
  const t_billing = useTranslations('Billing');
  const router = useRouter();

  const displayTitle = title || t_billing('accessDenied');
  const displayMessage = message || t_billing('permissionDenied');

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="text-center border-destructive/30 shadow-lg">
          <CardHeader>
            <div className="flex justify-center mb-3">
              <ShieldAlert className="w-12 h-12 text-destructive" />
            </div>
            <CardTitle className="text-xl font-semibold text-destructive">
              {displayTitle}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-muted-foreground mb-6">{displayMessage}</p>

            <div className="flex justify-center gap-3">
              {backUrl ? (
                <Button asChild variant="link" size="lg" className="text-xl px-1 h-auto py-0 text-yellow-1000 font-semibold">
                  <Link href="/settings/billing">{t_billing('upgradePlan')}</Link>
                </Button>
              ) : (
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t_billing('goBack')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
