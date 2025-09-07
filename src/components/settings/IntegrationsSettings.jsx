import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Mail, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const IntegrationsSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, session, connectGmail } = useAuth();
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkConnectionStatus = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('user_credentials')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .maybeSingle();
    
    setIsGoogleConnected(!!data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    checkConnectionStatus();
  }, [session, checkConnectionStatus]);

  const handleDisconnect = async () => {
    setLoading(true);
    const { error } = await supabase.rpc('delete_user_credential', { provider_name: 'google' });
    if (error) {
      toast({ variant: 'destructive', title: t('common.error'), description: "No s'ha pogut desconnectar el compte." });
    } else {
      toast({ title: t('common.success'), description: "Compte de Gmail desconnectat." });
      setIsGoogleConnected(false);
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="glass-card p-8">
        <h2 className="text-xl font-semibold mb-6">{t('settings.integrations.title')}</h2>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4 mb-4 sm:mb-0">
              <img src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" className="w-6 h-6" alt="Google logo"/>
              <div>
                <h3 className="font-semibold">Google / Gmail</h3>
                <p className="text-sm text-muted-foreground">{t('settings.integrations.google_sync')}</p>
              </div>
            </div>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isGoogleConnected ? (
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2 text-green-500 font-semibold text-sm">
                  <CheckCircle className="w-5 h-5" />
                  Connectat
                </span>
                <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={loading}>
                  <XCircle className="w-4 h-4 mr-2"/>
                  Desconnectar
                </Button>
              </div>
            ) : (
              <Button onClick={connectGmail} disabled={loading}>
                {t('settings.integrations.connect_button')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default IntegrationsSettings;