import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
const BillingSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleManageSubscription = () => {
    toast({
      title: "🚧 Redireccionant al portal de Stripe...",
      description: t('common.not_implemented_desc'),
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="glass-effect rounded-xl p-8">
        <h2 className="text-xl font-semibold mb-4">{t('settings.billing.title')}</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg">
            <div>
              <p className="font-semibold">{t('settings.billing.current_plan')}</p>
              <p className="text-purple-400 font-bold text-lg">Pla Pro</p>
            </div>
            <Button variant="outline">{t('settings.billing.change_plan')}</Button>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <p className="font-semibold mb-2">{t('settings.billing.manage_subscription_title')}</p>
            <p className="text-gray-400 mb-4">{t('settings.billing.manage_subscription_desc')}</p>
            <Button onClick={handleManageSubscription} className="bg-purple-600 hover:bg-purple-700">
            {t('settings.billing.manage_subscription_button')}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BillingSettings;