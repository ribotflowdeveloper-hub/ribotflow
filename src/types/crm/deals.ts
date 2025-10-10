// Dins de /types/crm/deals.ts (per exemple)

export interface Stage {
  id: string;
  name: string;
  position: number; 
 
}

// També pots exportar altres tipus relacionats aquí
export interface Deal {
  id: string;
  title: string;
  value: number;
  stage_id: string;
 
}