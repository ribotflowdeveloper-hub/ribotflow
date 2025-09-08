import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers"; // Importem la funció cookies
import { CustomizationClient } from './_components/CustomizationClient';
import { redirect } from 'next/navigation';

export default async function CustomizationPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Carreguem les dades en paral·lel per ser més eficients
  const stagesPromise = supabase.from('pipeline_stages').select('*').eq('user_id', user.id).order('position');
  const tagsPromise = supabase.from('contact_tags').select('*').eq('user_id', user.id).order('name');
  
  const [stagesResult, tagsResult] = await Promise.all([stagesPromise, tagsPromise]);

  const stages = stagesResult.data || [];
  const tags = tagsResult.data || [];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Personalització</h1>
      <CustomizationClient initialStages={stages} initialTags={tags} />
    </div>
  );
}
