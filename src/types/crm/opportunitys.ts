import type {PipelineStageName} from "@/config/pipeline";
import type { Contact } from "./contacts";  

export type OpportunityPipline = { 
  id: string; 
  name: string; 
  stage_name: PipelineStageName;
  value: number | null;
  close_date?: string | null;
  description?: string | null;
  contact_id: string;
  contacts?: { id: string; nom: string | null; } | null;
};

//Oportunitat _hooks useOpportunityForm i usePipeline
export type Opportunity= {
  id: string;
  name: string;
  stage_name: string;
  value: number | null;
  close_date: string | null;
  description: string | null;
  contact_id: string;
  contacts: Contact | null;
};