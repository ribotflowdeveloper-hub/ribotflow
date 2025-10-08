"use client";

import { useState, useTransition, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

type Contact = { id: string; nom: string };

interface UseAddTaskProps {
  onTaskCreated?: () => void;
}

export function useAddTask({ onTaskCreated }: UseAddTaskProps = {}) {
  const t = useTranslations("DashboardClient.addTaskDialog");
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const addTask = useCallback(
    async (title: string) => {
      if (!title.trim()) {
        toast.error(t("toast.errorTitle"), { description: t("toast.emptyTitle") });
        return;
      }

      startTransition(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error(t("toast.errorTitle"), { description: t("toast.unauthenticated") });
          return;
        }

        const { error } = await supabase.from("tasks").insert({
          title,
          contact_id: selectedContact?.id || null,
          user_id: user.id,
        });

        if (error) {
          toast.error(t("toast.saveError"), { description: error.message });
          return;
        }

        toast.success(t("toast.successTitle"), {
          description: t("toast.successDescription"),
        });
        onTaskCreated?.();
      });
    },
    [supabase, selectedContact, onTaskCreated, t]
  );

  return {
    addTask,
    isPending,
    selectedContact,
    setSelectedContact,
  };
}
