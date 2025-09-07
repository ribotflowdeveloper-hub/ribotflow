"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import AddTaskDialog from '@/components/dashboard/AddTaskDialog';
import {
  Users, Target, Euro, BadgePercent, Plus, Loader2, FileWarning, CheckCircle2, Clock3,
  TrendingUp, Mail, MessageSquare, ArrowRight, Sparkles, FileText, FolderOpen, Workflow, BookOpen
} from 'lucide-react';

// Sub-components interns (adaptats amb <Link href="...">)
const StatCard = ({ href, icon: Icon, title, value, color }) => (
  <Link href={href} className="group block">
    <div className={`rounded-2xl p-5 text-white shadow-xl transition-all ring-1 ring-white/10 hover:-translate-y-0.5 hover:shadow-2xl ${color}`}>
      <div className="flex items-start justify-between">
        <div className="text-sm/5 opacity-90">{title}</div>
        <Icon className="w-6 h-6 opacity-90" />
      </div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
      <div className="mt-2 inline-flex items-center text-xs opacity-85 group-hover:opacity-100">
        Obrir <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </div>
    </div>
  </Link>
);

// ... (Aquí anirien els altres sub-components com TaskItem, ActivityItem, QuickTile, adaptats amb <Link href="...">)

// Tipus per a les dades inicials (més específic)
type Task = { id: string; title: string; is_completed: boolean; contact_id: string; created_at: string; };
type Contact = { id: string; nom: string; last_interaction_at: string; created_at: string; };
type Invoice = { id: string; due_date: string; contacts: { nom: string } };

type DashboardInitialData = {
  stats: any;
  tasks: Task[];
  contacts: Contact[];
  overdueInvoices: Invoice[];
  attentionContacts: Contact[];
  aiInsights: any;
};

const MONTHLY_GOAL = 50000;

export function DashboardClient({ initialData }: { initialData: DashboardInitialData }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialData.tasks);
  const [isTaskDialogOpen, setTaskDialogOpen] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();
  
  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    const originalTasks = tasks;
    setTasks(currentTasks => currentTasks.map(t => t.id === taskId ? { ...t, is_completed: !currentStatus } : t));
    const { error } = await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', taskId);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: "No s'ha pogut actualitzar la tasca." });
      setTasks(originalTasks);
    }
  };

  const pendingTasks = useMemo(() => tasks.filter(t => !t.is_completed), [tasks]);
  
  // LÒGICA DEL JSX COMPLET
  return (
    <>
      <div className="space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard href="/crm/contactes" icon={Users} title="Contactes Totals" value={initialData.stats.totalContacts.toLocaleString()} color="bg-[#2d7ef7]" />
          <StatCard href="/crm/pipeline" icon={Target} title="Oportunitats Actives" value={initialData.stats.opportunities.toLocaleString()} color="bg-[#12a150]" />
          <StatCard href="/finances/facturacio" icon={Euro} title="Facturació Mensual" value={`€${initialData.stats.invoiced.toLocaleString()}`} color="bg-[#8a3ffc]" />
          <StatCard href="/finances/facturacio" icon={BadgePercent} title="IVA Pendent" value={`€${initialData.stats.pending.toLocaleString()}`} color="bg-[#f27917]" />
        </div>

        {/* Accés Ràpid */}
        <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-white/5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-pink-300" />
            <h2 className="text-xl font-bold text-white">Accés Ràpid</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Link href="/crm/contactes" className="group block rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition ring-1 ring-white/10"><div className="flex items-center gap-3"><Users className="w-5 h-5"/><span>Contactes</span></div></Link>
            <Link href="/crm/pipeline" className="group block rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition ring-1 ring-white/10"><div className="flex items-center gap-3"><Workflow className="w-5 h-5"/><span>Pipeline</span></div></Link>
            <Link href="/finances/facturacio" className="group block rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition ring-1 ring-white/10"><div className="flex items-center gap-3"><FileText className="w-5 h-5"/><span>Facturació</span></div></Link>
            <Link href="/finances/despeses" className="group block rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition ring-1 ring-white/10"><div className="flex items-center gap-3"><FolderOpen className="w-5 h-5"/><span>Despeses</span></div></Link>
            <Link href="/comunicacio/inbox" className="group block rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition ring-1 ring-white/10"><div className="flex items-center gap-3"><Mail className="w-5 h-5"/><span>Inbox</span></div></Link>
            <Link href="/crm/quotes" className="group block rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition ring-1 ring-white/10"><div className="flex items-center gap-3"><BookOpen className="w-5 h-5"/><span>Pressupostos</span></div></Link>
          </div>
        </div>

        {/* Agenda i Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-white/5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Agenda</h2>
              <Button variant="ghost" size="sm" onClick={() => setTaskDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Nova Tasca</Button>
            </div>
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {pendingTasks.length > 0 ? (
                pendingTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <Checkbox id={`task-${task.id}`} checked={task.is_completed} onCheckedChange={() => handleToggleTask(task.id, task.is_completed)} />
                    <label htmlFor={`task-${task.id}`} className="flex-1 cursor-pointer">{task.title}</label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70">No tens tasques pendents.</p>
              )}
            </div>
          </div>
          {/* ... Aquí aniria el Radar i l'Oracle IA si els vols afegir ... */}
        </div>
      </div>

      <AddTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        contacts={initialData.contacts}
        onTaskCreated={() => {
          // MILLORA: Utilitzem router.refresh() en lloc de recarregar la pàgina.
          // Això torna a executar el Server Component i actualitza les dades de forma eficient.
          router.refresh();
        }}
      />
    </>
  );
}