// Ubicació: /lib/utils/templates.ts

/**
 * Funció utilitària pura per substituir les variables (ex: {{nom_contacte}}) en un text
 * pels seus valors corresponents.
 * @param templateString El text de la plantilla amb variables.
 * @param values Un objecte amb els valors per a cada variable.
 * @returns El text amb les variables substituïdes.
 */
export const renderTemplate = (templateString: string, values: { [key: string]: string }): string => {
    if (!templateString) return '';
    
    // Utilitza una expressió regular per buscar totes les ocurrències de {{...}}
    return templateString.replace(/\{\{([^}]+)\}\}/g, (_match, varName) => {
        const key = varName.trim();
        // Retorna el valor si existeix, o la variable original si no.
        return values[key] || `{{${key}}}`;
    });
};