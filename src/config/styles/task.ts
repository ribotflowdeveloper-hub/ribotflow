export type TaskPriority = 'Baixa' | 'Mitjana' | 'Alta';

interface PriorityStyle {
  badgeClasses: string; // Classes de Tailwind per a les etiquetes
  hexColor: string;     // Color HEX per al calendari i altres elements
}

// ✅ AQUEST ÉS L'ÚNIC LLOC ON HAURÀS DE MODIFICAR ELS COLORS EN EL FUTUR.
export const priorityStyles: Record<TaskPriority, PriorityStyle> = {
  Baixa: {
    badgeClasses: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800",
    hexColor: '#3b82f6', // Correspon a tailwind-css blue-500
  },
  Mitjana: {
    badgeClasses: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800",
    hexColor: '#f59e0b', // Correspon a tailwind-css yellow-500
  },
  Alta: {
    badgeClasses: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800",
    hexColor: '#ef4444', // Correspon a tailwind-css red-500
  },
};