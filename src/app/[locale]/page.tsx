/**
 * @file src/app/page.tsx (Root Page)
 * @summary Aquesta pàgina no renderitza res. El middleware interceptarà
 * la petició i la redirigirà a la ruta amb l'idioma correcte.
 */
export default function RootPage() {
  // Aquesta pàgina no necessita fer res, ja que el middleware actua abans.
  return null;
}