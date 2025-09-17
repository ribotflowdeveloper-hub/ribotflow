/**
 * @file RecentActivities.tsx
 * @summary Renderitza el feed d'activitats recents del Dashboard.
 */
"use client";

import React, { useMemo} from 'react';
import { useTranslations } from 'next-intl';
import { FileWarning, CheckCircle2, Clock3, Users } from 'lucide-react';
import type { Invoice, Task, Contact } from '../types';
import { ActivityItem } from './ActivityItem';

interface RecentActivitiesProps {
  overdueInvoices: Invoice[];
  tasks: Task[];
  contacts: Contact[];
}

export function RecentActivities({ overdueInvoices, tasks, contacts }: RecentActivitiesProps) {
  const t = useTranslations('DashboardClient');

  /**
   * @summary Combina diferents tipus de dades en un sol feed d'activitats.
   * 'useMemo' optimitza aquest càlcul perquè només es faci quan les dades canviïn.
   */
  const activities = useMemo(() => {
    const a: React.ComponentProps<typeof ActivityItem>[] = [];
    
    overdueInvoices.forEach((inv) => a.push({ 
      icon: FileWarning, 
      tone: { bg: 'bg-red-500/15', text: 'text-red-300' }, 
      title: t('overdueInvoice', { clientName: inv.contacts?.nom ?? 'client' }), 
      meta: t('dueDate', { dueDate: new Date(inv.due_date).toLocaleDateString() }), 
      href: '/finances/facturacio' 
    }));
    
    tasks.slice(0, 4).forEach((task) => a.push({ 
      icon: task.is_completed ? CheckCircle2 : Clock3, 
      tone: { bg: task.is_completed ? 'bg-emerald-500/15' : 'bg-yellow-500/15', text: task.is_completed ? 'text-emerald-300' : 'text-yellow-300' }, 
      title: task.is_completed ? t('taskCompleted', { taskTitle: task.title }) : t('taskCreated', { taskTitle: task.title }), 
      meta: new Date(task.created_at).toLocaleString(), 
      href: '/dashboard' 
    }));

    contacts.slice(0, 3).forEach((c) => a.push({ 
      icon: Users, 
      tone: { bg: 'bg-blue-500/15', text: 'text-blue-300' }, 
      title: t('newContact', { contactName: c.nom }), 
      meta: new Date(c.created_at).toLocaleDateString(), 
      href: '/crm/contactes' 
    }));

    return a.slice(0, 6);
  }, [overdueInvoices, tasks, contacts, t]);

  return (
    <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-white/5">
      <h2 className="text-xl font-bold text-white mb-4">{t('recentActivities')}</h2>
      <div className="space-y-4">
        {activities.length > 0 
          ? activities.map((act, idx) => <ActivityItem key={idx} {...act} />) 
          : <p className="text-sm text-white/70">{t('noActivities')}</p>
        }
      </div>
    </div>
  );
}