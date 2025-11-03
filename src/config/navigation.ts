import {
  Activity,
  AudioWaveform,
  BookPlus,
  Bot,
  Briefcase,
  CalendarDays,
  Columns,
  Contact,
  CreditCard,
  Download,
  FileText,
  Headphones,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Puzzle,
  Receipt,
  Settings,
  ShieldOff,
  Truck,
  // ✅ 1. Importem les icones que necessitarem per als nous submenús
  User,
  Users,
  Wrench,
} from "lucide-react";
import type { NavItem } from "@/types/app/navigation";

export const navModules: NavItem[] = [
  {
    id: "dashboard",
    labelKey: "dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    isSingle: true,
  },
  {
    id: "crm",
    labelKey: "crm",
    icon: Briefcase,
    basePath: "/crm",
    path: "/crm/general",
    isSingle: false,
    children: [
      {
        id: "general_crm",
        labelKey: "crmGeneral",
        icon: Briefcase,
        path: "/crm/general",
        isSingle: true,
      },
      {
        id: "contactes",
        labelKey: "contacts",
        icon: Contact,
        path: "/crm/contactes",
        isSingle: true,
      },
      {
        id: "pipeline",
        labelKey: "pipeline",
        icon: Columns,
        path: "/crm/pipeline",
        isSingle: true,
      },
      {
        id: "activitats",
        labelKey: "activities",
        icon: Activity,
        path: "/crm/activitats",
        isSingle: true,
      },
      {
        id: "calendari",
        labelKey: "calendar",
        icon: CalendarDays,
        path: "/crm/calendari",
        isSingle: true,
      },
    ],
  },
  {
    id: "finances",
    labelKey: "finances",
    icon: Landmark,
    basePath: "/finances",
    path: "/finances/invoices",
    isSingle: false,
    children: [
      {
        id: "pressupostos",
        labelKey: "quotes",
        icon: FileText,
        path: "/finances/quotes",
        isSingle: true,
      },
      {
        id: "conceptes",
        labelKey: "concepts",
        icon: BookPlus,
        path: "/finances/products",
        isSingle: true,
      },
      {
        id: "facturacio",
        labelKey: "invoicing",
        icon: Receipt,
        path: "/finances/invoices",
        isSingle: true,
      },
      {
        id: "despeses",
        labelKey: "expenses",
        icon: Landmark,
        path: "/finances/expenses",
        isSingle: true,
      },
      {
        id: "proveïdors",
        labelKey: "suppliers",
        icon: Truck,
        path: "/finances/suppliers",
        isSingle: true,
      },
    ],
  },
  {
    id: "comunicacio",
    labelKey: "communication",
    icon: Headphones,
    basePath: "/comunicacio",
    path: "/comunicacio/inbox",
    isSingle: false,
    children: [
      {
        id: "inbox",
        labelKey: "inbox",
        icon: Headphones,
        path: "/comunicacio/inbox",
        isSingle: true,
      },
      {
        id: "templates",
        labelKey: "templates",
        icon: LayoutTemplate,
        path: "/comunicacio/templates",
        isSingle: true,
      },
      {
        id: "marketing",
        labelKey: "marketing",
        icon: Mail,
        path: "/comunicacio/marketing",
        isSingle: true,
      },
      {
        id: "planificador",
        labelKey: "planner",
        icon: CalendarDays,
        path: "/comunicacio/planificador",
        requiredPlan: ["plus", "premium"],
        isSingle: false,
      },
      {
        id: "transcripcio",
        labelKey: "transcription", // ⚠️ Hauràs d'afegir "transcription": "Transcripció" al teu ca.json
        icon: AudioWaveform,
        path: "/comunicacio/transcripcio",
        isSingle: true,
      },
    ],
  },
  {
    id: "network",
    labelKey: "network",
    icon: Users,
    path: "/network",
    isSingle: true,
  },
  /*{
    id: 'projectStrocture',
    labelKey: 'architecture',
    icon: Workflow,
    path: '/projectStrocture',
    isSingle: true
  },*/
];

export const bottomItems: NavItem[] = [
  {
    id: "ai",
    labelKey: "ai",
    icon: Bot,
    path: "#",
    isSingle: true,
    notImplemented: true,
  },
  // ✅ 2. Modifiquem l'element 'settings' per a què tingui submenús.
  {
    id: "settings",
    labelKey: "settings",
    icon: Settings,
    basePath: "/settings", // Important per saber quan mostrar els fills
    path: "/settings/profile", // La ruta per defecte en clicar
    isSingle: false, // Ara no és un enllaç únic, té fills
    children: [
      // ✅ 3. Afegim aquí tots els elements que abans estaven a 'SettingsNav.tsx'.
      {
        id: "profile",
        labelKey: "profile",
        icon: User,
        path: "/settings/profile",
        isSingle: true,
      },
      {
        id: "billing",
        labelKey: "billing",
        icon: CreditCard,
        path: "/settings/billing",
        isSingle: true,
      },
      {
        id: "team",
        labelKey: "team",
        icon: Users,
        path: "/settings/team",
        isSingle: true,
      },
      {
        id: "integrations",
        labelKey: "integrations",
        icon: Puzzle,
        path: "/settings/integrations",
        isSingle: true,
      },
      {
        id: "blacklist",
        labelKey: "blacklist",
        icon: ShieldOff,
        path: "/settings/blacklist",
        isSingle: true,
      },
      {
        id: "customization",
        labelKey: "customization",
        icon: Wrench,
        path: "/settings/customization",
        isSingle: true,
      },
      {
        id: "install",
        labelKey: "install",
        icon: Download,
        path: "/settings/install",
        isSingle: true,
      },
      {
        id: "permissions",
        labelKey: "permissions",
        icon: KeyRound,
        path: "/settings/permissions",
        isSingle: true,
      },
    ],
  },
];
