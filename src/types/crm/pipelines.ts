export const PIPELINE_STAGES_MAP = [
  { name: 'Prospecte', key: 'prospect' },
  { name: 'Contactat', key: 'contacted' },
  { name: 'Proposta Enviada', key: 'proposalSent' },
  { name: 'Negociació', key: 'negotiation' },
  { name: 'Guanyat', key: 'won' },
  { name: 'Perdut', key: 'lost' },
] as const;
export type PipelineStageName = typeof PIPELINE_STAGES_MAP[number]['name'];