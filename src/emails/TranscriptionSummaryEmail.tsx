// Ubicació: src/emails/TranscriptionSummaryEmail.tsx (FITXER COMPLET I CORREGIT)

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

} from '@react-email/components'
import * as React from 'react'
import type { AudioJob } from '@/types/db'

// ✅ 1. DEFINIM ELS TIPUS CORRECTES (basats en la nostra Edge Function)
type KeyMoment = {
  topic: string
  summary: string // Abans era 'details'
  decisions: string[]
  action_items: string[] // Nou
  participants_involved: string[] // Nou
}

type Participant = {
  contact_id: number
  name: string
  role: string
}

// ✅ 2. NOU TIPUS: El resum de tasques per persona
type AssignedTaskSummary = {
  assignee_name: string
  tasks: string[]
}

interface TranscriptionSummaryEmailProps {
  job: AudioJob
  emailSubject: string
  // La funció 't' rep el 'key' i un objecte de valors
  t: (key: string, values?: Record<string, unknown>) => string
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// Funció 't' de fallback per si de cas
const fallbackT = (key: string) => key

export const TranscriptionSummaryEmail = ({
  job,
  emailSubject,
  t = fallbackT,
}: TranscriptionSummaryEmailProps) => {
  
  // ✅ 3. OBTENIM LES NOVES DADES (amb 'type assertion')
  const keyMoments = (job.key_moments as KeyMoment[]) || []
  const participants = (job.participants as Participant[]) || []
  const assignedTasks = (job.assigned_tasks_summary as AssignedTaskSummary[]) || []
  
  // Helper per a traduccions (react-email no és compatible amb hooks)
  const tStr = (key: string) => (typeof t === 'function' ? t(key) : key)

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

          {/* --- RESUM EXECUTIU --- */}
          <Section style={card}>
            <Text style={cardHeader}>{tStr('summaryTitle')}</Text>
            <Text style={cardContent}>{job.summary || tStr('summaryEmpty')}</Text>
          </Section>

          {/* --- ✅ 4. NOU BLOC: RESUM DE TASQUES PER PERSONA --- */}
          {/* Aquest és el "resum de que ha de fer cada persona" */}
          {assignedTasks.length > 0 && (
            <Section style={card}>
              <Text style={cardHeader}>{tStr('assignedTasksTitle')}</Text>
              {assignedTasks.map((group, index) => (
                <div key={index} style={momentBox}>
                  <Text style={momentTopic}>{group.assignee_name}</Text>
                  <ul style={list}>
                    {group.tasks.map((task, i) => (
                      <li key={i}>{task}</li>
                    ))}
                  </ul>
                  {index < assignedTasks.length - 1 && <Hr style={hr} />}
                </div>
              ))}
            </Section>
          )}

          {/* --- ✅ 5. BLOC MILLORAT: MOMENTS CLAU (El "diagrama") --- */}
          {keyMoments.length > 0 && (
            <Section style={card}>
              <Text style={cardHeader}>{tStr('keyMomentsTitle')}</Text>
              {keyMoments.map((moment, index) => (
                <div key={index} style={momentBox}>
                  <Text style={momentTopic}>{moment.topic}</Text>
                  <Text style={momentDetails}>{moment.summary}</Text>
                  
                  {moment.decisions.length > 0 && (
                    <>
                      <Text style={momentDecisionTitle}>{tStr('keyMomentsDecisions')}:</Text>
                      <ul style={list}>
                        {moment.decisions.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </>
                  )}
                  
                  {/* Afegim les accions esmentades */}
                  {moment.action_items.length > 0 && (
                    <>
                      <Text style={momentActionTitle}>{tStr('keyMomentsActions')}:</Text>
                      <ul style={list}>
                        {moment.action_items.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </>
                  )}
                  {index < keyMoments.length - 1 && <Hr style={hr} />}
                </div>
              ))}
            </Section>
          )}
          
          {/* --- PARTICIPANTS (sense canvis) --- */}
          {participants.length > 0 && (
             <Section style={card}>
               <Text style={cardHeader}>{tStr('participantsTitle')}</Text>
                 <ul style={list}>
                   {participants.map((p, i) => <li key={i}>{p.name} ({p.role})</li>)}
                 </ul>
             </Section>
           )}

          {/* --- BOTÓ I FOOTER (sense canvis) --- */}
          <Section style={{ textAlign: 'center', marginTop: '32px' }}>
            <Button
              style={button}
              href={`${baseUrl}/comunicacio/transcripcio/${job.id}`}
            >
              {tStr('viewFullTranscriptionButton')}
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>RibotFlow | {tStr('automatedEmail')}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default TranscriptionSummaryEmail

// --- Estils ---
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}
const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}
const logo = {
  margin: '0 auto',
}
const title = {
  fontSize: '24px',
  lineHeight: '1.25',
  fontWeight: '600',
  textAlign: 'center' as const,
  padding: '0 20px',
}
const card = {
  border: '1px solid #dfe1e4',
  borderRadius: '8px',
  margin: '24px 20px 0',
  padding: '20px',
}
const cardHeader = {
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
}
const cardContent = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#3c4043',
}
const momentBox = {
  paddingBottom: '16px',
}
const momentTopic = {
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px 0',
}
const momentDetails = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#3c4043',
  margin: '0',
}
const momentDecisionTitle = {
  fontSize: '14px',
  fontWeight: '600',
  margin: '12px 0 4px 0',
  color: '#16a34a', // Green
}
const momentActionTitle = {
  fontSize: '14px',
  fontWeight: '600',
  margin: '12px 0 4px 0',
  color: '#2563eb', // Blue
}
const list = {
  margin: '0',
  paddingLeft: '20px',
  fontSize: '14px',
  lineHeight: '1.5',
}
const hr = {
  borderColor: '#dfe1e4',
  margin: '24px 0',
}
const button = {
  backgroundColor: '#5e6ad2',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  padding: '12px 24px',
}
const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
}