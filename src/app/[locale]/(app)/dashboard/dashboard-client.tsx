/**
 * @file DashboardClient.tsx
 * @summary Aquest fitxer conté el component de client que gestiona tota la interfície interactiva
 * del Tauler Principal (Dashboard). S'encarrega de renderitzar les estadístiques, les tasques,
 * les activitats recents i de gestionar les interaccions de l'usuari, com marcar tasques com a completades.
 */

"use client"; // És un component de client per la seva alta interactivitat i gestió d'estat.

import React, { useState, useMemo, FC, useRef, ElementType, useEffect  } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import AddTaskDialog from '@/components/dashboard/AddTaskDialog';
import {
  Users, Target, Euro, BadgePercent, Plus, FileWarning, CheckCircle2, Clock3,
  Mail, MessageSquare, ArrowRight, Sparkles, FileText, FolderOpen, Workflow, BookOpen,  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useTranslations } from 'next-intl';

// --- Definició de Tipus de Dades ---
// Aquests tipus defineixen l'estructura de les dades que el component rep del servidor.
// És crucial que coincideixin amb els tipus del fitxer 'page.tsx' del servidor.
type Task = { id: string; title: string; is_completed: boolean; contact_id: string; created_at: string; };
type Invoice = { id: string; due_date: string; contacts?: { nom: string } };
type Contact = { created_at: string | number | Date; id: string; nom: string };
type ActivityFeedItem = (Invoice & { type: 'invoice' }) | (Contact & { type: 'contact' });

export interface DashboardStats {
  totalContacts: number;
  activeClients: number;
  opportunities: number;
  invoiced: number;
  pending: number;
  expenses: number;
  invoicedChange: string;
  expensesChange: string;
  invoicedIsPositive: boolean;
  expensesIsPositive: boolean;
}



export interface DashboardInitialData {
  stats: DashboardStats;
  tasks: Task[];
  contacts: Contact[];
  overdueInvoices: Invoice[];
  attentionContacts: Contact[];
}

// Sub-components interns del Dashboard (migrats i tipats)
/** @summary Targeta per mostrar una estadística clau (KPI) amb un enllaç. */

const StatCard: FC<{ href: string, icon: ElementType, title: string, value: string, color: string , openText: string }> = ({ href, icon: Icon, title, value, color }) => (
  <Link href={href} className="group block">
    <div className={`rounded-2xl p-5 text-white shadow-xl transition-all ring-1 ring-white/10 hover:-translate-y-0.5 hover:shadow-2xl ${color}`}>
      <div className="flex items-start justify-between">
        <div className="text-sm/5 opacity-90">{title}</div>
        <Icon className="w-6 h-6 opacity-90" />
      </div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
      <div className="mt-2 inline-flex items-center text-xs opacity-85 group-hover:opacity-100">Obrir <ArrowRight className="w-3.5 h-3.5 ml-1" /></div>
    </div>
  </Link>
);
/** @summary Element individual per al feed d'activitats recents. */

const ActivityItem: FC<{ icon: ElementType, tone: { bg: string, text: string }, title: string, meta: string, href: string }> = ({ icon: Icon, tone, title, meta, href }) => (
  <Link href={href} className="block">
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 rounded-full p-2 ${tone.bg} ${tone.text}`}><Icon className="w-4 h-4" /></div>
      <div className="flex-1">
        <p className="text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
    </div>
  </Link>
);
/** @summary Targeta petita per a la secció d'accés ràpid. */

const QuickTile: FC<{ href: string, icon: ElementType, label: string, desc: string }> = ({ href, icon: Icon, label, desc }) => (
  <Link href={href} className="group">
    <div className="rounded-2xl px-4 py-5 bg-white/5 hover:bg-white/10 transition ring-1 ring-white/10">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-white/20 to-transparent p-2.5"><Icon className="w-5 h-5 text-white/90" /></div>
        <div>
          <div className="font-semibold">{label}</div>
          <div className="text-xs text-white/70">{desc}</div>
        </div>
      </div>
    </div>
  </Link>
);

const MONTHLY_GOAL = 50000;// Objectiu de facturació mensual.

export function DashboardClient({ initialData, children }: { initialData: DashboardInitialData, children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [tasks, setTasks] = useState(initialData.tasks);// Estat local per a les tasques, per poder actualitzar-les a la UI.
  const [isTaskDialogOpen, setTaskDialogOpen] = useState(false);
  const t = useTranslations('DashboardClient');

    // ✅ NOU: Lògica per al scroll horitzontal
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollability = () => {
    const el = scrollContainerRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth);
    }
  };
  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = el.clientWidth * 0.8; // Desplaçament del 80% de l'ample visible
      el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, []);
  /**
    * @summary Gestor per marcar/desmarcar una tasca com a completada.
    * Aquesta funció implementa un patró de UI Optimista (Optimistic UI Update).
    */
  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    // 1. Guardem l'estat original per si l'operació falla.
    const originalTasks = tasks;
    // 2. Actualitzem la UI immediatament, sense esperar la resposta del servidor.
    setTasks(currentTasks => currentTasks.map(t => (t.id === taskId ? { ...t, is_completed: !currentStatus } : t)));
    // 3. Cridem a la base de dades en segon pla.
    const { error } = await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', taskId);
    // 4. Si hi ha un error, revertim la UI a l'estat original i mostrem una notificació.
    if (error) {
      toast.error('Error', { description: "No s'ha pogut actualitzar la tasca." });
      setTasks(originalTasks);
    }
  };
  // --- Dades Derivades amb 'useMemo' ---
  // 'useMemo' és un hook de React que memoritza el resultat d'un càlcul.
  // Això evita que es tornin a calcular aquestes dades a cada renderització, optimitzant el rendiment.

  /** @summary Filtra les tasques per mostrar només les pendents. */
  const pendingTasks = useMemo(() => tasks.filter(t => !t.is_completed), [tasks]);

  /** @summary Calcula el percentatge de l'objectiu de facturació assolit. */
  const percentGoal = useMemo(() => {
    if (!initialData.stats) return 0;
    return Math.max(0, Math.min(100, Math.round((initialData.stats.invoiced / MONTHLY_GOAL) * 100)));
  }, [initialData.stats]);

  /** @summary Combina diferents tipus de dades (factures, tasques, contactes) en un sol feed d'activitats. */
  const activities = useMemo(() => {
    const a: { icon: ElementType; tone: { bg: string; text: string; }; title: string; meta: string; href: string; }[] = [];
    initialData.overdueInvoices.forEach((inv) => a.push({ icon: FileWarning, tone: { bg: 'bg-red-500/15', text: 'text-red-300' }, title: t('overdueInvoice', { clientName: inv.contacts?.nom ?? 'client' }), meta: t('dueDate', { dueDate: new Date(inv.due_date).toLocaleDateString() }), href: '/finances/facturacio' }));
    // ✅ CORRECCIÓ: Canviem la variable 't' del bucle a 'task' per evitar conflictes amb la funció de traducció 't'.
    (initialData.tasks || []).slice(0, 4).forEach((task) => a.push({ icon: task.is_completed ? CheckCircle2 : Clock3, tone: { bg: task.is_completed ? 'bg-emerald-500/15' : 'bg-yellow-500/15', text: task.is_completed ? 'text-emerald-300' : 'text-yellow-300' }, title: task.is_completed ? t('taskCompleted', { taskTitle: task.title }) : t('taskCreated', { taskTitle: task.title }), meta: new Date(task.created_at).toLocaleString(), href: '/dashboard' }));
    (initialData.contacts || []).slice(0, 3).forEach((c) => a.push({ icon: Users, tone: { bg: 'bg-blue-500/15', text: 'text-blue-300' }, title: t('newContact', { contactName: c.nom }), meta: new Date(c.created_at).toLocaleDateString(), href: '/crm/contactes' }));
    return a.slice(0, 6);
  }, [initialData.overdueInvoices, initialData.tasks, initialData.contacts, t]);

  return (
    <>
      {/* Fons decoratiu de la pàgina. */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(#2e2e2e_1px,transparent_1px)] [background-size:16px_16px]" />
      <div className="space-y-8">
        {/* Secció de KPIs (Estadístiques Clau) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard href="/crm/contactes" icon={Users} title={t('totalContacts')} value={initialData.stats.totalContacts.toLocaleString()} color="bg-[#2d7ef7]" openText={t('openLink')} />
          <StatCard href="/crm/pipeline" icon={Target} title={t('activeOpportunities')} value={initialData.stats.opportunities.toLocaleString()} color="bg-[#12a150]" openText={t('openLink')} />
          <StatCard href="/finances/facturacio" icon={Euro} title={t('monthlyInvoicing')} value={`€${initialData.stats.invoiced.toLocaleString()}`} color="bg-[#8a3ffc]" openText={t('openLink')} />
          <StatCard href="/finances/facturacio" icon={BadgePercent} title={t('pendingVAT')} value={`€${initialData.stats.pending.toLocaleString()}`} color="bg-[#f27917]" openText={t('openLink')} />
        </div>

        {/* Cos principal: Vendes + Activitats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl p-6 ring-1 ring-white/10 bg-white/5">
            <h2 className="text-xl font-bold text-white mb-4">{t('salesPerformance')}</h2>
            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${percentGoal}%` }} /></div>
            <div className="mt-3 flex items-center justify-between text-sm text-white/80"><span>{percentGoal}{t('goalCompleted')}</span><span>€{initialData.stats.invoiced?.toLocaleString()} / €{MONTHLY_GOAL.toLocaleString()}</span></div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl p-4 bg-white/5 ring-1 ring-white/10">
              <div className="text-xs text-white/70">{t('invoicedMonth')}</div>
              <div className="text-lg font-semibold text-white">€{initialData.stats.invoiced?.toLocaleString()}</div>
              <div className={`text-xs mt-1 ${initialData.stats.invoicedIsPositive ? 'text-emerald-300' : 'text-red-300'}`}>{initialData.stats.invoicedChange}</div></div>
              <div className="rounded-xl p-4 bg-white/5 ring-1 ring-white/10"><div className="text-xs text-white/70">{t('expensesMonth')}</div><div className="text-lg font-semibold text-white">€{initialData.stats.expenses?.toLocaleString()}</div><div className={`text-xs mt-1 ${initialData.stats.expensesIsPositive ? 'text-emerald-300' : 'text-red-300'}`}>{initialData.stats.expensesChange}</div></div>
              <div className="rounded-xl p-4 bg-white/5 ring-1 ring-white/10"><div className="text-xs text-white/70">{t('netProfit')}</div><div className="text-lg font-semibold text-emerald-300">€{(Number(initialData.stats.invoiced || 0) - Number(initialData.stats.expenses || 0)).toLocaleString()}</div></div>
            </div>
          </div>
          <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-white/5">
            <h2 className="text-xl font-bold text-white mb-4">{t('recentActivities')}</h2>
            <div className="space-y-4">{activities.length > 0 ? activities.map((act, idx) => <ActivityItem key={idx} {...act} />) : <p className="text-sm text-white/70">{t('noActivities')}</p>}</div>
          </div>
        </div>

      {/* ✅ SECCIÓ D'ACCÉS RÀPID RESTAURADA ✅ */}
          {/* Secció d'Accés Ràpid */}
        <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-white/5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className='flex items-center gap-2'>
                <Sparkles className="w-5 h-5 text-pink-300" />
                <h2 className="text-xl font-bold text-white">{t('quickAccess')}</h2>
            </div>
             {/* ✅ NOU: Botons de navegació per al scroll */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleScroll('left')} disabled={!canScrollLeft} className="h-8 w-8 rounded-full disabled:opacity-30">
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleScroll('right')} disabled={!canScrollRight} className="h-8 w-8 rounded-full disabled:opacity-30">
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>
          </div>
          {/* ✅ NOU: Contenidor scrollable */}
          <div ref={scrollContainerRef} onScroll={checkScrollability} className="flex gap-4 overflow-x-auto pb-4 -mb-4 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <QuickTile href="/crm/contactes" icon={Users} label={t('contacts')} desc={t('crm')} />
              <QuickTile href="/crm/pipeline" icon={Workflow} label={t('pipeline')} desc={t('opportunities')} />
              <QuickTile href="/finances/facturacio" icon={FileText} label={t('invoicing')} desc={t('invoices')} />
              <QuickTile href="/finances/despeses" icon={FolderOpen} label={t('expenses')} desc={t('costs')} />
              <QuickTile href="/comunicacio/inbox" icon={Mail} label={t('inbox')} desc={t('communication')} />
              <QuickTile href="/crm/quotes" icon={BookOpen} label={t('quotes')} desc={t('quotes')} />
              {/* Pots afegir més QuickTile aquí i el scroll funcionarà */}
          </div>
        </div>

        {/* Agenda + Radar + Oracle */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-white/5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-white">{t('agenda')}</h2><Button variant="ghost" size="sm" onClick={() => setTaskDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> {t('newTask')}</Button></div>
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {pendingTasks.length > 0 ? pendingTasks.map((task) => (<div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"><Checkbox id={`task-${task.id}`} checked={task.is_completed} onCheckedChange={() => handleToggleTask(task.id, task.is_completed)} /><label htmlFor={`task-${task.id}`} className={`flex-1 cursor-pointer ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</label></div>)) : (<p className="text-sm text-muted-foreground text-center py-4">{t('noPendingTasks')}</p>)}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-white/5">
              <h2 className="text-xl font-bold text-white mb-4">{t('radar')}</h2>
              <div className="space-y-3">
                {initialData.attentionContacts.length > 0 || initialData.overdueInvoices.length > 0 ? (
                  [...initialData.overdueInvoices.map(inv => ({ ...inv, type: 'invoice' as const })), ...initialData.attentionContacts.map(c => ({ ...c, type: 'contact' as const }))]
                    .map((item: ActivityFeedItem) => // <-- Tipus aplicat aquí
                      item.type === 'invoice' ? (
                        <ActivityItem key={item.id} href="/finances/facturacio" icon={FileWarning} tone={{ bg: 'bg-red-500/15', text: 'text-red-300' }} title={`Factura vençuda: ${item.contacts?.nom}`} meta={`Vencia el ${new Date(item.due_date).toLocaleDateString()}`} />
                      ) : (
                        <ActivityItem key={item.id} href="/crm/contactes" icon={MessageSquare} tone={{ bg: 'bg-blue-500/15', text: 'text-blue-300' }} title={`Contacte refredant-se: ${item.nom}`} meta="Sense interaccions en +7 dies" />
                      )
                    )
                ) : (
                  <p className="text-sm text-white/70">{t('allInOrder')}</p>
                )}
              </div>
            </div>

            {/* ✅ CANVI FINAL: Aquí és on es renderitzarà l'Oracle (o el seu esquelet) */}
            {children}

          </div>
        </div>
      </div>
      <AddTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        contacts={initialData.contacts}
        onTaskCreated={() => {
          router.refresh();
          toast.success('Tasca creada!');
        }}
      />
    </>
  );
}
