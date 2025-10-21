import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ContactDetailData } from './_components/ContactDetailData';
import { ContactDetailSkeleton } from './_components/ContactDetailSkeleton';

interface ContactDetailPageProps {
    params: Promise<{ contactId: string }>;
}

export async function generateMetadata(props: ContactDetailPageProps): Promise<Metadata> {
    const { contactId } = await props.params;
    const contactIdNumber = Number(contactId);
    const supabase = createClient();
    
    const { data: contact } = await supabase
        .from('contacts')
        .select('nom')
        .eq('id', contactIdNumber)
        .single();

    return { title: `${contact?.nom || 'Contacte'} | Ribot` };
}

export default async function ContactDetailPage(props: ContactDetailPageProps) {
    const { contactId } = await props.params;

    return (
        <Suspense fallback={<ContactDetailSkeleton />}>
            {/* ✅ CORRECCIÓ: Embolcallem 'contactId' dins d'un objecte 'params'. */}
            <ContactDetailData params={{ contactId: contactId }} />
        </Suspense>
    );
}