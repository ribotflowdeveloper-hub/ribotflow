import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Plus, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TeamSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleInvite = () => {
    toast({
      title: t('common.not_implemented_title'),
      description: t('common.not_implemented_desc'),
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="glass-card p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">{t('settings.team.title')}</h2>
          <Button onClick={handleInvite}>
            <Plus className="w-4 h-4 mr-2" />
            {t('settings.team.invite_member')}
          </Button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold">{t('settings.team.you_owner')}</p>
                <p className="text-sm text-muted-foreground">email@exemple.com</p>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">{t('settings.team.role_admin')}</span>
          </div>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('settings.team.invite_placeholder')}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TeamSettings;