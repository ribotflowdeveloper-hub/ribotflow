"use server";

import { createClient } from "@/lib/supabase/server"; // ✅ client Supabase
import { revalidatePath } from "next/cache";          // ✅ per invalidar caches
import { cookies } from "next/headers";              // ✅ per recuperar cookies


export async function saveOpportunityAction(formData: FormData) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
  
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: { message: "No autenticat." } };
  
    const rawData = Object.fromEntries(formData.entries());
  
    const dataToSave = {
      name: rawData.name as string,
      description: rawData.description as string,
      contact_id: rawData.contact_id as string,
      stage_name: rawData.stage_name as string,
      value: rawData.value ? parseFloat(rawData.value as string) : null,
      close_date: rawData.close_date
        ? new Date(rawData.close_date as string).toISOString()
        : null,
      user_id: user.id,
    };
  
    try {
      const { error } = await (rawData.id
        ? supabase.from("opportunities").update(dataToSave).eq("id", rawData.id)
        : supabase.from("opportunities").insert(dataToSave));
      if (error) throw error;
  
      revalidatePath("/crm/pipeline");
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { error: { message: error.message } };
      }
      return { error: { message: "Error desconegut" } };
    }
  }
  
  export async function updateOpportunityStageAction(
    opportunityId: string,
    newStage: string
  ) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
  
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: { message: "No autenticat." } };
  
    try {
      const { error } = await supabase
        .from("opportunities")
        .update({ stage_name: newStage })
        .eq("id", opportunityId)
        .eq("user_id", user.id);
  
      if (error) throw error;
  
      revalidatePath("/crm/pipeline");
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { error: { message: error.message } };
      }
      return { error: { message: "Error desconegut" } };
    }
  }
  