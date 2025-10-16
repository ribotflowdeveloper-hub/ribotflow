/**
 * Aquesta és la definició canònica per a les props d'una pàgina a l'App Router de Next.js.
 * El component de pàgina que utilitza aquest tipus HA de ser 'async'.
 */
export type PageProps = {
  /**
   * Paràmetres dinàmics de la ruta (ex: { id: '123' }).
   * Un cop dins d'un component 'async', ja estan resolts a 'string'.
   */
  params: { [key: string]: string };

  /**
   * Paràmetres de la query string (ex: { status: 'Sent' }).
   * - És opcional ('?') perquè pot no haver-hi paràmetres a la URL.
   * - Un cop dins d'un component 'async', ja estan resolts a l'objecte.
   * - Els valors poden ser 'string' o un array de 'string[]' (ex: ?tag=a&tag=b).
   */
  searchParams?: { [key: string]: string | string[] | undefined };
};