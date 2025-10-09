/**
 * Defineix l'estructura d'una regla de la llista negra (blacklist)
 * tal com es guarda a la base de dades i s'utilitza a l'aplicació.
 */
export type BlacklistRule = {
  id: string;
  value: string;
  rule_type: 'email' | 'domain';
  created_at: string;
  user_id: string; // ID de l'usuari que va crear la regla
  team_id: string; // ID de l'equip al qual pertany la regla
};
