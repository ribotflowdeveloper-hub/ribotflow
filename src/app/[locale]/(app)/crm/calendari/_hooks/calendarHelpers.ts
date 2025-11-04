import { 
    startOfWeek, 
    endOfWeek, 
    startOfMonth, 
    endOfMonth, 
    endOfDay,
    startOfDay // ✅ 1. Importem startOfDay
} from 'date-fns';

export const getDateRange = (date: Date, view: string) => {
  const weekOptions = { weekStartsOn: 1 as const };
  
  switch(view) {
    case 'month': 
      return { 
        start: startOfWeek(startOfMonth(date), weekOptions), 
        end: endOfWeek(endOfMonth(date), weekOptions) 
      };
      
    case 'week': 
    case 'agenda': 
      return { 
        start: startOfWeek(date, weekOptions), 
        end: endOfWeek(date, weekOptions) 
      };
      
    case 'day': 
      // ✅ 2. AQUEST ÉS EL FIX:
      // Canviem 'start: date' per 'start: startOfDay(date)'
      // Ara demanarà les dades des de les 00:00 fins a les 23:59 d'aquell dia.
      return { 
        start: startOfDay(date), 
        end: endOfDay(date) 
      };
      
    default: 
      return { 
        start: startOfWeek(date, weekOptions), 
        end: endOfWeek(date, weekOptions) 
      };
  }
};