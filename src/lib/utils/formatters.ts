import { ca, es, enUS } from "date-fns/locale";
import { format } from "date-fns";

/**
 * Obté l'objecte de 'locale' de date-fns basat en l'string del locale actual (ex: 'ca', 'es').
 */
export const getDateLocale = (locale: string) => {
    switch (locale) {
        case 'es': return es;
        case 'en': return enUS;
        default: return ca;
    }
};

/**
 * Formata una data en una cadena de text localitzada.
 * @param date La data a formatar (pot ser string, Date, o null).
 * @param formatString El format desitjat (ex: "PPP", "dd MMM, yyyy").
 * @param currentLocale El locale actual ('ca', 'es', 'en').
 * @returns La data formatada o un guió si la data és nul·la.
 */
export function formatLocalizedDate(
    date: string | Date | null | undefined,
    formatString: string,
    currentLocale: string
): string {
    if (!date) return '-';
    const locale = getDateLocale(currentLocale);
    return format(new Date(date), formatString, { locale });
}

/** Formata una data a un format localitzat (e.g., dd/mm/yyyy) */
export function formatDate(dateStr: string | number | Date, locale: string = 'ca'): string {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    } catch {
        return String(dateStr);
    }
}

/** Formata una quantitat amb la moneda (e.g., € 1.234,56) */
export function formatCurrency(amount: number | null | undefined, currency: string = 'EUR', locale: string = 'ca'): string {
    if (amount === null || amount === undefined) return '€ 0,00';
    try {
        return amount.toLocaleString(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
        });
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
}