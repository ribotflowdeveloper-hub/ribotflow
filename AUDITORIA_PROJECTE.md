# Auditoria de Projecte: RibotFlow

## Introducció

Aquest document identifica els punts febles crítics de l'aplicació RibotFlow i proposa un pla d'acció per a cadascun. L'objectiu és enfortir el projecte per assolir els estàndards de qualitat, rendiment, seguretat i mantenibilitat que s'esperen d'una aplicació professional i moderna.

L'arquitectura base és sòlida. Abordar els següents punts és el pas necessari per garantir la seva viabilitat i èxit a llarg termini en un entorn de producció.

---

### 1. Cobertura de Tests Inexistent

*   **Punt Dèbil (Gravetat: Crítica):** L'absència de tests automatitzats és el risc més gran del projecte. Sense una xarxa de seguretat de tests, qualsevol canvi o refactorització pot introduir errors (regressions) sense ser detectat. El desenvolupament es torna lent i arriscat, i la correcció d'errors es complica. La confiança en les proves manuals no és escalable ni fiable.

*   **Pla d'Acció:**
    1.  **Configurar l'Entorn de Proves:** Finalitzar la configuració de `vitest.config.ts` i `tests/setup.ts` per suportar proves de components, hooks i funcions de Node.js.
    2.  **Implementar Proves Unitàries:**
        *   **Objectiu Inicial:** Aconseguir una cobertura de proves superior al 80% per a tota la lògica de negoci pura (no dependent de frameworks).
        *   **Directoris Prioritaris:** Començar amb `src/lib/utils`, `src/lib/services`, i qualsevol funció dins de `src/lib` que contingui lògica de negoci complexa.
    3.  **Implementar Proves d'Integració:**
        *   **Objectiu:** Crear proves per a totes les **Server Actions** i **Supabase Edge Functions**.
        *   **Metodologia:** Utilitzar el client de Supabase "mock" (`tests/mocks/supabase.ts`) per simular les interaccions amb la base de dades i verificar que cada acció o funció es comporta com s'espera (ex: retorna les dades correctes, gestiona els errors correctament).
    4.  **(Recomanat) Implementar Proves End-to-End (E2E):**
        *   **Objectiu:** Crear un petit conjunt de proves E2E per als fluxos d'usuari més crítics.
        *   **Exemples:** Procés de login, creació d'una factura, addició d'un contacte al CRM.
        *   **Eines:** Utilitzar un framework com Playwright o Cypress.

---

### 2. Optimització del Rendiment de la Base de Dades

*   **Punt Dèbil (Gravetat: Alta):** Les consultes a la base de dades no optimitzades són una causa comuna de lentitud en aplicacions web. A mesura que el volum de dades creixi, l'experiència d'usuari es degradarà ràpidament si no s'aborda aquest punt de manera proactiva.

*   **Pla d'Acció:**
    1.  **Auditoria de `select()`:** Realitzar una cerca a tot el codi de `select('*')`. Reemplaçar cada instància per una selecció explícita de les columnes necessàries: `select('id, nom, estat, ...')`. Això minimitza el trànsit de dades i redueix la latència.
    2.  **Anàlisi i Creació d'Índexs:**
        *   Utilitzar l'eina `EXPLAIN ANALYZE` de PostgreSQL (disponible a l'editor SQL de Supabase) per analitzar el cost de les consultes més freqüents o lents.
        *   Identificar totes les columnes utilitzades en clàusules `WHERE`, `JOIN` i `ORDER BY` i assegurar-se que tinguin un índex a la base de dades. Prestar especial atenció a les claus foranes (`foreign keys`).
    3.  **Verificació de Paginació:** Confirmar que totes les consultes que retornen llistes de dades potencialment llargues (contactes, factures, etc.) implementen correctament la paginació al servidor amb `.range(de, a)`.

---

### 3. Gestió d'Errors i Monitorització

*   **Punt Dèbil (Gravetat: Alta):** No disposar d'una estratègia de monitorització i logging centralitzat al backend és com pilotar un avió sense instruments. És impossible saber si l'aplicació funciona correctament en producció, diagnosticar problemes de manera eficient o reaccionar a errors abans que els usuaris els reportin.

*   **Pla d'Acció:**
    1.  **Integrar un Servei de Logging/Monitorització:** Adoptar un servei professional com Sentry (recomanat per la seva excel·lent integració amb Next.js), Better Stack, o una solució similar.
    2.  **Centralitzar la Captura d'Errors:** Crear un wrapper o funció d'ordre superior per a totes les Server Actions i Edge Functions. Aquest wrapper ha d'implementar un bloc `try...catch` estandarditzat.
        *   En cas d'**èxit**, es pot registrar una traça a nivell `INFO`.
        *   En cas d'**error**, l'error ha de ser capturat i enviat al servei de monitorització (ex: `Sentry.captureException(error)`) amb tot el context possible (usuari, dades d'entrada, etc.).
    3.  **Configurar Alertes:** Establir alertes automàtiques al servei de monitorització que notifiquin l'equip de desenvolupament quan apareguin nous tipus d'errors o quan la freqüència d'errors superi un llindar predefinit.

---

### 4. Seguretat i Gestió de Secrets

*   **Punt Dèbil (Gravetat: Crítica):** La incorrecta gestió de secrets (claus d'API, tokens) és una vulnerabilitat de seguretat severa que pot portar a l'accés no autoritzat a les dades, pèrdua de control de serveis externs i danys a la reputació.

*   **Pla d'Acció:**
    1.  **Auditoria Completa de Secrets:** Realitzar una cerca exhaustiva a tota la base de codi per detectar qualsevol clau, token o contrasenya escrit directament ("hardcoded").
    2.  **Validació de Variables d'Entorn a l'Inici:** Utilitzar una llibreria com [Zod](https://zod.dev/) per validar les variables d'entorn (`process.env`) quan l'aplicació s'inicia. Si una variable requerida falta o té un format invàlid, l'aplicació ha de fallar immediatament (`fail-fast`), evitant errors impredictibles en temps d'execució.
    3.  **Principi de Mínim Privilegi:**
        *   Verificar que la clau de Supabase `service_role_key` s'utilitza **únicament** a les Supabase Edge Functions on és estrictament necessari saltar-se RLS.
        *   La resta de l'aplicació (Server Components, Server Actions) ha d'utilitzar **sempre** la clau anònima (`anon_key`) i el token de sessió de l'usuari, garantint que les Polítiques de Seguretat a Nivell de Fila (RLS) sempre s'apliquin.
