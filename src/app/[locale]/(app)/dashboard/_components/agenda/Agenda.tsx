// src/app/[locale]/(app)/dashboard/_components/agenda/Agenda.tsx (COMPLET I CORREGIT)

"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { LayoutGrid, Search, ClipboardCheck } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { TaskCard } from './TaskCard';
import { EnrichedTask } from '@/components/features/tasks/TaskDialogManager';
import { Tables } from '@/types/supabase';
import { cn } from '@/lib/utils/utils';

export type TaskFilterStatus = 'pendents' | 'assignades' | 'completes';

interface AgendaProps {
  tasks: EnrichedTask[];
  activeFilter: TaskFilterStatus;
  onFilterChange: (filter: TaskFilterStatus) => void;
  onViewTask: (task: EnrichedTask) => void;
  pendingCount: number;
  assignedCount: number;
  completedCount: number;
  departments: Tables<'departments'>[];
  departmentFilter: number | 'all';
  onDepartmentFilterChange: (filter: number | 'all') => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onToggleTask: (task: EnrichedTask) => void;
  onTaskMutation: () => void;
}

const filterOptions: { value: TaskFilterStatus; labelKey: string; count: (props: AgendaProps) => number }[] = [
  { value: 'pendents', labelKey: 'pending', count: (props) => props.pendingCount },
  { value: 'assignades', labelKey: 'assigned', count: (props) => props.assignedCount },
  { value: 'completes', labelKey: 'completed', count: (props) => props.completedCount },
];

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 },
  },
  exit: {
    y: -20,
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

export function Agenda(props: AgendaProps) {
  const {
    tasks,
    activeFilter,
    onFilterChange,
    onViewTask,
    departments,
    departmentFilter,
    onDepartmentFilterChange,
    searchTerm,
    onSearchChange,
    onToggleTask,
    onTaskMutation
  } = props;
  const t = useTranslations('DashboardClient.agenda');

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* --- SECCIÓ DE FILTRES I CERCA (Contingut fix) --- */}
      <div className="flex-shrink-0 space-y-4">
        {/* Aquesta estructura flex-col sm:flex-row és perfectament responsive */}
        <div className="flex flex-col sm:flex-row gap-2">

          {/* FILTRE ESTAT — Responsive: icones o dropdown en mòbil */}
          <div className="w-full sm:w-auto">
            {/* Desktop */}
            <div className="hidden sm:grid grid-cols-3 gap-1 bg-green-300/10 rounded-lg border border-green-500/20">
              {filterOptions.map(option => (
                <Button
                  key={option.value}
                  variant={activeFilter === option.value ? 'default' : 'ghost'}
                  onClick={() => onFilterChange(option.value)}
                  className={cn(
                    "w-full justify-center transition-all duration-200",
                    activeFilter === option.value
                      ? 'bg-green-600 text-white shadow hover:bg-green-700'
                      : 'text-green-800 hover:bg-green-500/20 dark:text-green-300'
                  )}
                >
                  {t(option.labelKey)}
                  <span className={cn(
                    "ml-2 text-xs font-semibold rounded-full px-2 py-0.5",
                    activeFilter === option.value
                      ? "bg-white/20 text-white"
                      : "bg-green-600/10 text-green-700 dark:bg-green-300/10 dark:text-green-300"
                  )}>
                    {option.count(props)}
                  </span>
                </Button>
              ))}
            </div>

            {/* Mòbil */}
            <div className="sm:hidden">
              <Select
                value={activeFilter}
                onValueChange={(value: TaskFilterStatus) => onFilterChange(value)}
              >
                <SelectTrigger className="w-full bg-green-300/10 border-green-500/20">
                  <SelectValue placeholder={t('filter.statusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)} ({option.count(props)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>


          <Select
            value={String(departmentFilter)}
            onValueChange={(value) => onDepartmentFilterChange(value === 'all' ? 'all' : Number(value))}
          >
            {/* Aquestes classes w-full sm:w-[180px] són correctes per responsive */}
            <SelectTrigger className="w-full sm:w-[180px] bg-green-300/10 border-green-500/20 focus:ring-green-500">
              {/* Amagar la icona en mòbil (hidden sm:block) és una bona pràctica */}
              <LayoutGrid className="w-4 h-4 mr-2 text-muted-foreground hidden sm:block" />
              <SelectValue placeholder={t('filter.departmentPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter.allDepartments')}</SelectItem>
              {departments.map(dep => (
                <SelectItem key={dep.id} value={String(dep.id)}>{dep.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-green-800/50 dark:text-green-300/50" />
            <Input
              type="search"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-11 w-full bg-green-500/10 border-green-00/20 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
            />
          </div>
        </div>
      </div>

      {/* Aquest contenidor de scroll és clau i funciona perfectament */}
      <div className="flex-1 overflow-y-auto pr-2 -mr-2 mt-4 min-h-0 space-y-3">
        <AnimatePresence>
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <motion.div
                key={task.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <TaskCard
                  task={task}
                  onViewTask={onViewTask}
                  onToggleTask={onToggleTask}
                  onTaskMutation={onTaskMutation}
                />
              </motion.div>
            ))
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center h-full pt-10 text-center"
            >
              <ClipboardCheck className="w-16 h-16 text-green-500/30 mb-4" />
              <h4 className="font-semibold text-lg text-foreground">Tot en ordre!</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {t('noTasksFound')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}