import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,

} from '@react-email/components';
import * as React from 'react';
import type { AudioJob } from '@/types/db'; // Importa el teu tipus
// import { TFunction } from 'next-intl'; // Removed, not exported by next-intl

// Definim els tipus basats en la Edge Function
type KeyMoment = {
  topic: string;
  details: string;
  decisions: string[];
  is_work_related: boolean;
}
type Participant = {
  contact_id: number;
  name: string;
  role: string;
}

interface TranscriptionSummaryEmailProps {
  job: AudioJob;
  emailSubject: string;
  t: (key: string) => string; // Funció de traducció
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const TranscriptionSummaryEmail = ({
  job,
  emailSubject,
  t
}: TranscriptionSummaryEmailProps) => {

  const workMoments = (job.key_moments as KeyMoment[] || []).filter(m => m.is_work_related);
  const participants = (job.participants as Participant[] || []);

  return (
    <Html>
      <Head />
      <Preview>{emailSubject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={`${baseUrl}/android-chrome-192x192.png`}
            width="48"
            height="48"
            alt="RibotFlow Logo"
            style={logo}
          />
          <Text style={title}>{emailSubject}</Text>
          <Section style={card}>
            <Text style={cardHeader}>{t('summaryTitle')}</Text>
            <Text style={cardContent}>{job.summary || t('summaryEmpty')}</Text>
          </Section>

          {workMoments.length > 0 && (
            <Section style={card}>
              <Text style={cardHeader}>{t('keyMomentsTitle')}</Text>
              {workMoments.map((moment, index) => (
                <div key={index} style={momentBox}>
                  <Text style={momentTopic}>{moment.topic}</Text>
                  <Text style={momentDetails}>{moment.details}</Text>
                  {moment.decisions.length > 0 && (
                    <>
                      <Text style={momentDecisionTitle}>{t('keyMomentsDecisions')}:</Text>
                      <ul style={list}>
                        {moment.decisions.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </>
                  )}
                  {index < workMoments.length - 1 && <Hr style={hr} />}
                </div>
              ))}
            </Section>
          )}
          
          {participants.length > 0 && (
             <Section style={card}>
              <Text style={cardHeader}>{t('participantsTitle')}</Text>
                <ul style={list}>
                  {participants.map((p, i) => <li key={i}>{p.name} ({p.role})</li>)}
                </ul>
            </Section>
          )}

          <Section style={{ textAlign: 'center', marginTop: '32px' }}>
            <Button
              style={button}
              href={`${baseUrl}/comunicacio/transcripcio/${job.id}`}
            >
              {t('viewFullTranscriptionButton')}
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>RibotFlow | {t('automatedEmail')}</Text>
        </Container>
      </Body>
    </Html>
  );
};

export default TranscriptionSummaryEmail;

// --- Estils per a l'email ---
// (Simplificats per brevetat)

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};
const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};
const logo = {
  margin: '0 auto',
};
const title = {
  fontSize: '24px',
  lineHeight: '1.25',
  fontWeight: '600',
  textAlign: 'center' as const,
  padding: '0 20px',
};
const card = {
  border: '1px solid #dfe1e4',
  borderRadius: '8px',
  margin: '24px 20px 0',
  padding: '20px',
};
const cardHeader = {
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};
const cardContent = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#3c4043',
};
const momentBox = {
  paddingBottom: '16px',
};
const momentTopic = {
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};
const momentDetails = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#3c4043',
  margin: '0',
};
const momentDecisionTitle = {
  fontSize: '14px',
  fontWeight: '600',
  margin: '12px 0 4px 0',
};
const list = {
  margin: '0',
  paddingLeft: '20px',
  fontSize: '14px',
  lineHeight: '1.5',
};
const hr = {
  borderColor: '#dfe1e4',
  margin: '24px 0',
};
const button = {
  backgroundColor: '#5e6ad2',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  padding: '12px 24px',
};
const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
};