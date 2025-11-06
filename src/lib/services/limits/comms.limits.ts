// /src/lib/services/limits/comms.limits.ts (FITXER NOU)
import 'server-only';
import type { LimitCheckFunction } from './team.limits'; // Importem la signatura

/**
 * Comprova el límit de maxTickets
 * Utilitza la funció RPC per evitar problemes de RLS
 */
export const checkTicketsLimit: LimitCheckFunction = async (
  supabase,
  teamId,
) => {
  const { data: ticketCount, error: rpcError } = await supabase.rpc(
    'get_team_ticket_count',
    { p_team_id: teamId },
  );

  if (rpcError) throw new Error(rpcError.message);
  return {
    current: ticketCount || 0,
    errorMessage: "Has assolit el límit de tiquets del teu pla.",
  };
};

/**
 * Comprova el límit de maxSocialAccounts
 */
export const checkSocialAccountsLimit: LimitCheckFunction = async (
  supabase,
  teamId,
) => {
  const { count, error } = await supabase
    .from('user_credentials')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .like('provider', '%_social');
    
  if (error) throw new Error(error.message);
  return {
    current: count || 0,
    errorMessage: "Has assolit el límit de comptes socials connectats.",
  };
};

/**
 * Comprova el límit de maxSocialPostsPerMonth
 */
export const checkSocialPostsPerMonthLimit: LimitCheckFunction = async (
  supabase,
  teamId,
  _userId,
  startDate, // La data d'inici del cicle
) => {
  const { count, error } = await supabase
    .from('social_posts')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .gte('created_at', startDate);
    
  if (error) throw new Error(error.message);
  return {
    current: count || 0,
    errorMessage: "Has assolit el límit de posts socials mensuals.",
  };
};
/**
 * ✅ NOU: Comprova el límit de maxEmailTemplates
 */
export const checkEmailTemplatesLimit: LimitCheckFunction = async (
  supabase,
  teamId,

) => {
  const { count, error } = await supabase
    .from('email_templates') // Assegura't que la taula es diu així
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId);
    
  if (error) throw new Error(error.message);
  return {
    current: count || 0,
    error: "Has assolit el límit de plantilles d'email.",
  };
};
/**
 * ✅ NOU: Comprova el límit de maxMarketingCampaignsPerMonth
 */
export const checkMarketingCampaignsLimit: LimitCheckFunction = async (
  supabase,
  teamId,
  _userId,
  startDate, // La data d'inici del cicle
) => {
  const { count, error } = await supabase
    .from('campaigns') // Assegura't que la taula es diu així
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .gte('created_at', startDate);
    
  if (error) throw new Error(error.message);
  return {
    current: count || 0,
    error: "Has assolit el límit de campanyes de màrqueting mensuals.",
  };
};