import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';



const ProfileSettings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState({ full_name: '', company_name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Ignore no rows found error
        toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut carregar el perfil.' });
      } else if (data) {
        setProfile(data);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user, toast]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: profile.full_name, company_name: profile.company_name })
      .eq('id', user.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut actualitzar el perfil.' });
    } else {
      toast({ title: 'Èxit', description: 'Perfil actualitzat correctament.' });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="glass-effect rounded-xl p-8">
        <h2 className="text-xl font-semibold mb-6">{t('settings.profile.title')}</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">{t('settings.profile.full_name')}</label>
            <input
              id="fullName"
              type="text"
              value={profile.full_name || ''}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              className="search-input w-full"
            />
          </div>
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-2">{t('settings.profile.company_name')}</label>
            <input
              id="companyName"
              type="text"
              value={profile.company_name || ''}
              onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
              className="search-input w-full"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">{t('settings.profile.email')}</label>
            <input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="search-input w-full bg-slate-800/50 cursor-not-allowed"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {saving ? t('settings.profile.saving_button') : t('settings.profile.save_button')}
    
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default ProfileSettings;