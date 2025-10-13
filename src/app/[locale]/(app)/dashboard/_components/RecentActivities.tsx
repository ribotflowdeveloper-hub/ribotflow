"use client";

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { FileWarning, CheckCircle2, Clock3, Users } from 'lucide-react';
import { ActivityItem } from '@/components/shared/ActivityItem';
import { Tables } from '@/types/supabase';
import { TaskWithContact } from '@/types/dashboard/types';

interface RecentActivitiesProps {
  overdueInvoices: (Tables<'invoices'> & { contacts: { nom: string } | null })[];
  tasks: TaskWithContact[]; // Utilitzem el tipus enriquit
  contacts: Tables<'contacts'>[];
}

export function RecentActivities({ overdueInvoices, tasks, contacts }: RecentActivitiesProps) {
  const t = useTranslations('DashboardClient');

  const activities = useMemo(() => {
    const a: React.ComponentProps<typeof ActivityItem>[] = [];
    
    overdueInvoices.forEach((inv) => a.push({ 
      icon: FileWarning, 
      tone: { bg: 'bg-destructive/10', text: 'text-destructive' }, 
      title: t('overdueInvoice', { clientName: inv.contacts?.nom ?? 'client' }), 
      meta: inv.due_date ? t('dueDate', { dueDate: new Date(inv.due_date).toLocaleDateString() }) : '',
      href: '/finances/facturacio' 
    }));
    
    // Mostrem les tasques més recents, independentment del seu estat
    tasks.slice(0, 2).forEach((task) => a.push({ 
      icon: task.is_completed ? CheckCircle2 : Clock3, 
      tone: { bg: task.is_completed ? 'bg-success/10' : 'bg-yellow-500/10', text: task.is_completed ? 'text-success' : 'text-yellow-600' }, 
      title: task.title, 
      meta: task.created_at ? new Date(task.created_at).toLocaleString() : '', 
      href: '/dashboard' 
    }));

    contacts.slice(0, 2).forEach((c) => a.push({ 
      icon: Users, 
      tone: { bg: 'bg-primary/10', text: 'text-primary' }, 
      title: t('newContact', { contactName: c.nom }), 
      meta: c.created_at ? new Date(c.created_at).toLocaleDateString() : '', 
      href: '/crm/contactes' 
    }));

    // Ordenem per data si tenim una manera consistent de fer-ho
    return a.slice(0, 5);
  }, [overdueInvoices, tasks, contacts, t]);

  // ✅ HEM ELIMINAT EL 'div' contenidor i el 'h2'. Retornem directament la llista.
  return (
    <div className="space-y-4">
      {activities.length > 0 
        ? activities.map((act, idx) => <ActivityItem key={idx} {...act} />) 
        : <p className="text-sm text-muted-foreground">{t('noActivities')}</p>
      }
    </div>
  );
}