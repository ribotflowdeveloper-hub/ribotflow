# 🤖 RibotFlow

> **La plataforma integral de gestió empresarial per a autònoms i petites empreses**

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Enabled-green)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0-38bdf8)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-purple)](https://web.dev/progressive-web-apps/)

## 📋 Descripció

RibotFlow és una aplicació web completa desenvolupada amb **Next.js 15** i **TypeScript** que unifica totes les necessitats de gestió d'una petita empresa en una sola plataforma intuïtiva. Integra CRM, gestió financera, comunicacions, marketing i molt més.

### 🎯 Objectius del Projecte

- **Centralització**: Una sola aplicació per a totes les necessitats empresarials
- **Automatització**: Processos intel·ligents amb IA integrada
- **Escalabilitat**: Arquitectura moderna preparada per créixer
- **Accessibilitat**: Compatible amb dispositius mòbils i desktops
- **Multiidioma**: Suport complet per català, espanyol i anglès

## ⭐ Característiques Principals

### 🏢 **CRM Complet**
- Gestió de contactes i clients
- Pipeline de vendes visual
- Seguiment d'oportunitats
- Gestió de productes i serveis
- Sistema de tags i etiquetes personalitzables

### 💰 **Gestió Financera**
- Facturació automàtica
- Pressupostos i propostes
- Seguiment de pagaments
- Gestió d'expenses
- Informes financers en temps real
- Integració amb sistemes de pagament

### 📧 **Comunicacions Integrades**
- Bústia d'entrada unificada (IMAP)
- Plantilles d'email personalitzables
- Sistema de tickets de suport
- Marketing automation
- Campanyes publicitàries
- Integració amb xarxes socials

### 🤖 **Intel·ligència Artificial**
- Assistent virtual "Ribot"
- Resums automàtics de l'activitat
- Suggeriments intel·ligents
- Generació de contingut
- Anàlisi predictiva

### 📊 **Dashboard i Analytics**
- Mètriques en temps real
- KPIs personalitzables
- Gràfics interactius
- Exportació de dades
- Alertes automàtiques

### ⚙️ **Personalització**
- Temes foscos i clars
- Configuració multiidioma
- Customització de l'espai de treball
- Gestió d'usuaris i equips
- Permisos granulars

### 📱 **PWA (Progressive Web App)**
- Instal·lació nativa
- Funcionament offline
- Notificacions push
- Sincronització automàtica

## 🛠️ Stack Tecnològic

### **Frontend**
- **Next.js 15** - Framework React amb App Router
- **TypeScript** - Tipat estàtic
- **TailwindCSS** - Estilització moderna
- **Radix UI** - Components accessibles
- **Framer Motion** - Animacions fluïdes
- **React Hook Form** - Gestió de formularis
- **Tanstack Table** - Taules avançades

### **Backend**
- **Supabase** - Base de dades PostgreSQL
- **Supabase Auth** - Autenticació i autorització
- **Supabase Storage** - Emmagatzematge de fitxers
- **Supabase Edge Functions** - Funcions serverless

### **Integracions**
- **Google AI (Gemini)** - Intel·ligència artificial
- **IMAP** - Gestió d'emails
- **OAuth** - Autenticació social
- **Mapbox** - Geolocalització
- **React Email** - Plantilles d'email

### **Desenvolupament**
- **ESLint** - Linting de codi
- **Prettier** - Formatació de codi
- **Husky** - Git hooks
- **TypeScript Strict Mode** - Validació estricta

## 🚀 Instal·lació i Configuració

### Prerequisits

- **Node.js** 18.17 o superior
- **npm**, **yarn**, **pnpm** o **bun**
- **Compte de Supabase**

### 1. Clonació del Repositori

```bash
git clone https://github.com/ribotflowdeveloper-hub/ribotflow.git
cd ribotflow-next
```

### 2. Instal·lació de Dependències

```bash
npm install
# o
yarn install
# o
pnpm install
```

### 3. Variables d'Entorn

Crea un fitxer `.env.local` a l'arrel del projecte:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google AI
GOOGLE_AI_API_KEY=your-google-ai-key

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# OAuth (opcional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Configuració de Supabase

1. Crea un nou projecte a [Supabase](https://supabase.com)
2. Executa les migracions de la base de dades:
   ```bash
   supabase db push
   ```
3. Configura les polítiques RLS (Row Level Security)
4. Configura l'autenticació OAuth (opcional)

### 5. Execució del Projecte

```bash
npm run dev
# o
yarn dev
# o
pnpm dev
```

Obre [http://localhost:3000](http://localhost:3000) al teu navegador.

## 📂 Estructura del Projecte

```
src/
├── app/                          # App Router de Next.js 14
│   ├── [locale]/                 # Internacionalització
│   │   ├── (app)/               # Rutes de l'aplicació
│   │   │   ├── dashboard/       # Tauler principal
│   │   │   ├── crm/             # Mòdul CRM
│   │   │   ├── finances/        # Gestió financera
│   │   │   ├── comunicacio/     # Comunicacions
│   │   │   └── settings/        # Configuració
│   │   ├── (auth)/              # Autenticació
│   │   └── onboarding/          # Procés d'onboarding
│   ├── actions/                 # Server Actions
│   └── api/                     # API Routes
├── components/                   # Components reutilitzables
│   ├── ui/                      # Components base (Radix UI)
│   ├── features/                # Components per funcionalitats
│   └── shared/                  # Components compartits
├── lib/                         # Utilitats i configuració
│   ├── supabase/               # Client de Supabase
│   ├── utils/                   # Funcions d'utilitat
│   └── data/                    # Gestió de dades
├── types/                       # Definicions de tipus TypeScript
├── hooks/                       # Custom React Hooks
├── stores/                      # Gestió d'estat global
├── config/                      # Configuracions
└── middleware.ts                # Middleware de Next.js
```

## 🎯 Funcionalitats per Mòduls

### 📊 **Dashboard**
- Vista general de mètriques
- Gràfics de rendiment
- Oracle d'IA amb suggeriments
- Accés ràpid a funcionalitats

### 👥 **CRM**
- **Contacts**: Gestió completa de clients i leads
- **Pipeline**: Visualització de l'embut de vendes
- **Products**: Catàleg de productes i serveis
- **General**: Vista resum del CRM

### 💼 **Finances**
- **Invoices**: Facturació automàtica amb plantilles
- **Quotes**: Pressupostos personalitzables
- **Expenses**: Seguiment de despeses
- **Reports**: Informes financers detallats

### 📞 **Comunicació**
- **Inbox**: Bústia unificada amb IMAP
- **Templates**: Plantilles d'email reutilitzables
- **Marketing**: Campanyes i automatització

### ⚙️ **Configuració**
- **Profile**: Perfil d'usuari i empresa
- **Billing**: Facturació i subscripcions
- **Customization**: Personalització de l'entorn
- **Install**: Instal·lació com a PWA

## 🌍 Internacionalització

RibotFlow suporta múltiples idiomes:

- **Català** (ca) - Idioma principal
- **Espanyol** (es) - Secundari
- **Anglès** (en) - Internacional

La configuració es troba a `src/i18n.ts` i les traduccions a `language/`.

## 📱 PWA (Progressive Web App)

L'aplicació és una PWA completa amb:

- **Service Worker** personalitzat (`public/sw.js`)
- **Manifest** de l'aplicació (`public/site.webmanifest`)
- **Instal·lació offline**
- **Actualitzacions automàtiques**

### Instal·lació com a App Nativa

1. Accedeix a l'aplicació des del navegador
2. Fes clic a "Instal·la l'aplicació" 
3. Confirma la instal·lació
4. Utilitza l'aplicació des de l'escriptori/menú

## 🔐 Seguretat

### Autenticació
- **Supabase Auth** amb JWT
- **OAuth** amb Google, Facebook, LinkedIn
- **Row Level Security (RLS)**
- **Permisos granulars** per equips

### Protecció de Dades
- **Encriptació** de dades sensibles
- **Validació** estricta amb TypeScript
- **Sanitització** d'inputs d'usuari
- **HTTPS** obligatori en producció

## 🧪 Testing

```bash
# Executar tests
npm test

# Tests en mode watch
npm run test:watch

# Coverage de tests
npm run test:coverage
```

## 📦 Build i Deployment

### Build de Producció

```bash
npm run build
npm start
```

### Deployment en Vercel

1. Connecta el repositori a Vercel
2. Configura les variables d'entorn
3. Deploy automàtic amb cada push

### Variables d'Entorn en Producció

```env
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-key
GOOGLE_AI_API_KEY=your-production-ai-key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## 🤝 Contribució

### Flux de Desenvolupament

1. **Fork** del repositori
2. Crea una **branca** per a la teva feature
3. **Commit** dels canvis amb missatges descriptius
4. **Push** a la teva branca
5. Obre una **Pull Request**

### Convencions de Codi

- **ESLint**: Segueix les regles configurades
- **TypeScript Strict**: Mode estricte activat
- **Conventional Commits**: Format de commits estandarditzat
- **Component Props**: Sempre tipat amb interfaces

### Estructura de Commits

```
feat: nova funcionalitat de facturació
fix: correcció del bug de login
docs: actualització del README
style: format de codi
refactor: optimització del CRM
test: tests per al mòdul de finances
```

## 📚 Recursos i Documentació

### Documentació Tècnica
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Components UI
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)
- [Framer Motion](https://www.framer.com/motion/)

### Eines de Desenvolupament
- [React Hook Form](https://react-hook-form.com/)
- [Tanstack Table](https://tanstack.com/table)
- [Next-Intl](https://next-intl-docs.vercel.app/)

## 🐛 Debugging i Logs

### Mode Desenvolupament
```bash
npm run dev
# L'aplicació inclou logs detallats en mode desenvolupament
```

### Supabase Local
```bash
supabase start
# Inicia Supabase localment per a testing
```

### Generació d'Embeddings
```bash
npm run generate-embeddings
# Script per generar embeddings d'IA
```

## 📊 Mètriques i Monitorització

L'aplicació inclou:
- **Analytics** integrats
- **Error tracking** amb Supabase
- **Performance monitoring**
- **User behavior tracking**

## 🔄 Roadmap

### Q1 2024
- [ ] Integració amb més pasarel·les de pagament
- [ ] App mòbil nativa (React Native)
- [ ] API pública per a integracions

### Q2 2024
- [ ] IA avançada per a prediccions
- [ ] Integració amb comptabilitat externa
- [ ] Marketplace d'extensions

### Q3 2024
- [ ] Anàlisi de sentiment en comunicacions
- [ ] Automatització avançada de workflows
- [ ] Integració amb ERP extern

## 📄 Llicència

Aquest projecte està sota llicència MIT. Consulta el fitxer `LICENSE` per a més detalls.

## 👨‍💻 Equip de Desenvolupament

**RibotFlow Development Team**
- Desenvolupat per [DigitAI Studios](https://digitaistudios.com)
- Mantingut per la comunitat RibotFlow

---

## 📞 Suport

Per a suport tècnic o consultes:
- 📧 Email: ribotflow.developer@gmail.com
- 💬 Discord: [RibotFlow Community](https://discord.gg/ribotflow)
- 🐛 Issues: [GitHub Issues](https://github.com/ribotflowdeveloper-hub/ribotflow/issues)

---

**🤖 Fet amb ❤️ per a autònoms i petites empreses que volen créixer**
