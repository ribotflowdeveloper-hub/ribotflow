import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import { type ExpenseAttachment } from '@/types/finances/index';
import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadAttachment(
    supabase: SupabaseClient<Database>,
    expenseId: number,
    formData: FormData,
    userId: string,
    teamId: string
): Promise<ExpenseAttachment> {
    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No fitxer.");

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${teamId}/${expenseId}/${Date.now()}-${sanitizedName}`;
    
    const { error: uploadError } = await supabase.storage
        .from("despeses-adjunts") 
        .upload(filePath, file);
        
    if (uploadError) throw new Error(`Storage error: ${uploadError.message}`);

    const { data, error } = await supabase
        .from("expense_attachments")
        .insert({
            expense_id: expenseId,
            user_id: userId,
            team_id: teamId,
            file_path: filePath,
            filename: file.name, 
            mime_type: file.type,
        })
        .select()
        .single();
        
    if (error) throw new Error(`DB error: ${error.message}`);
    return data as unknown as ExpenseAttachment;
}

export async function deleteAttachment(
    supabase: SupabaseClient<Database>,
    adminSupabase: SupabaseClient<Database>,
    attachmentId: string, 
    filePath: string,
    teamId: string
): Promise<void> {
    const { error } = await supabase
        .from('expense_attachments')
        .delete()
        .eq('id', attachmentId)
        .eq('team_id', teamId);

    if (error) throw new Error(`DB Delete error: ${error.message}`);

    await adminSupabase.storage.from('despeses-adjunts').remove([filePath]);
}

export async function getAttachmentSignedUrl(filePath: string, teamId: string): Promise<string> {
    if (!filePath.startsWith(`${teamId}/`)) throw new Error("Unauthorized access.");
    
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.storage
        .from('despeses-adjunts')
        .createSignedUrl(filePath, 900); // 15 min

    if (error) throw new Error(error.message);
    return data.signedUrl;
}