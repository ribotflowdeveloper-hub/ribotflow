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

/**
 * Formata un número com a moneda en Euros.
 * @param amount El número a formatar.
 * @returns La quantitat formatada (ex: "1.234,56 €").
 */
export function formatCurrency(amount: number | null | undefined): string {
    const num = amount || 0;
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
    }).format(num);
}