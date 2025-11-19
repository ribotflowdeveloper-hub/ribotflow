# Documentació del Projecte: RibotFlow

Aquest document proporciona una visió general de l'arquitectura, les tecnologies i les característiques principals de l'aplicació RibotFlow.

## 1. Resum del Projecte

RibotFlow és una aplicació web completa de gestió empresarial construïda amb Next.js i Supabase. Està dissenyada com una plataforma tot-en-un que integra funcionalitats de CRM, finances, comunicació i més, amb l'objectiu de centralitzar i automatitzar processos de negoci.

L'aplicació compta amb característiques avançades com la generació de resums mitjançant IA, internacionalització, capacitats de Progressive Web App (PWA) i compliment amb la normativa de facturació espanyola "Veri*factu".

## 2. Pila Tecnològica

- **Framework Frontend:** [Next.js](https://nextjs.org/) (amb App Router)
- **Llenguatge:** [TypeScript](https://www.typescriptlang.org/)
- **Backend i Base de Dades:** [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage, Edge Functions)
- **Estils:** [Tailwind CSS](https://tailwindcss.com/)
- **Components UI:** [shadcn/ui](https://ui.shadcn.com/)
- **Internacionalització (i18n):** `next-intl`
- **Funcions Serverless:** [Deno](https://deno.land/) a Supabase Edge Functions
- **IA i Embeddings:** Google Gemini / OpenAI

## 3. Estructura del Projecte

L'arquitectura del projecte està clarament separada entre el frontend i el backend.

- `src/app/[locale]/`: Conté les rutes principals de l'aplicació, organitzades per mòduls de funcionalitat dins de `(app)`. Aquesta estructura modular segueix les convencions del App Router de Next.js.
    - `(app)/crm`: Mòdul de gestió de clients.
    - `(app)/finances`: Mòdul de gestió financera.
    - `(app)/inbox`: Mòdul de comunicacions.
- `src/lib/`: Agrupa la lògica de negoci principal.
    - `src/lib/supabase/`: Conté els clients de Supabase per a la interacció amb la base de dades (client, servidor i admin).
    - `src/lib/services/`: Lògica específica per a diferents serveis i integracions.
- `src/types/supabase.ts`: Fitxer clau generat automàticament per Supabase que conté les definicions de tipus de tota l'esquema de la base de dades, garantint seguretat de tipus de punta a punta.
- `supabase/functions/`: Allotja les funcions serverless (Deno) que s'executen al backend de Supabase. Aquestes funcions gestionen tasques que requereixen accés privilegiat o processament al servidor (ex: enviar correus, processar pagaments, etc.).
- `scripts/`: Conté scripts auxiliars, com `generate_embeddings.mjs` per a les funcionalitats d'IA.

## 4. Característiques Principals

- **Gestió de CRM:** Administració de contactes, empreses i pipelines de vendes.
- **Finances:** Gestió de factures, despeses i pressupostos.
- **Comunicació:** safata d'entrada unificada i eines de màrqueting.
- **IA:** Resums generats per IA (mitjançant RAG) i sistema de cerca semàntica basat en embeddings.
- **Internacionalització:** Suport per a múltiples idiomes (català, espanyol, anglès).
- **PWA:** L'aplicació es pot instal·lar en dispositius mòbils i d'escriptori.
- **Autenticació:** Sistema d'usuaris i permisos gestionat amb Supabase Auth.

## 5. Backend (Supabase Edge Functions)

El backend està implementat mitjançant funcions serverless Deno que s'executen a Supabase Edge Functions. Aquesta arquitectura permet desacoblar la lògica de servidor del frontend de Next.js.

Algunes funcions destacades són:
- `generate-ai-summary`: Crea resums de text utilitzant un model d'IA.
- `send-email`: Envia correus electrònics transaccionals.
- `process-audio-queue`: Processa fitxers d'àudio en segon pla.
- `sync-worker`: Sincronitza dades amb serveis externs.

## 6. Funcionalitats d'IA

L'aplicació utilitza la intel·ligència artificial principalment per a la generació de resums i la cerca avançada.

- **Embeddings:** L'script `scripts/generate_embeddings.mjs` s'encarrega de convertir documents de text en vectors numèrics (embeddings) i emmagatzemar-los a la base de dades (probablement en una taula amb `pgvector`).
- **RAG (Retrieval-Augmented Generation):** Quan es demana un resum o una resposta a una pregunta, el sistema primer busca els documents més rellevants a la base de dades (utilitzant la cerca per similitud de vectors) i després passa aquests documents com a context a un model de llenguatge (com Gemini) perquè generi una resposta precisa i contextualitzada.

## 7. Internacionalització (i18n)

La internacionalització es gestiona amb la llibreria `next-intl`. Les traduccions es troben en format JSON a la carpeta `language/`. El middleware (`src/middleware.ts`) s'encarrega de redirigir l'usuari a la seva llengua preferida basant-se en les capçaleres del navegador i la ruta de l'URL (`/ca`, `/es`, `/en`).
