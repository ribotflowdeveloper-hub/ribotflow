"use client";

import React from 'react';
import { Avatar, AvatarFallback} from '@/components/ui/avatar';
import type { AudioJob } from '@/types/db';
// Helpers per generar inicials i colors únics per als avatars
const getInitials = (name: string) => {
  const names = name.split(' ');
  if (names.length === 1) return names[0][0]?.toUpperCase() || '?';
  return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
};

const generateAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  // Retornem colors pastel HSL (saturació 70%, lluminositat 80%)
  return `hsl(${h}, 70%, 80%)`;
};

const generateTextColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    // Retornem colors foscos HSL (saturació 70%, lluminositat 30%)
    return `hsl(${h}, 70%, 30%)`;
}

// El tipus 'participants' és un Json, el definim basat en la Edge Function
type Participant = {
  contact_id: number;
  name: string;
  role: string;
}

interface ParticipantsListProps {
  participants: AudioJob['participants'];
}

export function ParticipantsList({ participants }: ParticipantsListProps) {
  if (!Array.isArray(participants) || participants.length === 0) {
    return <p className="text-sm text-muted-foreground">No s'han assignat participants.</p>;
  }

  // Assegurem el tipat de les dades JSON
  const typedParticipants = participants as Participant[];

  return (
    <ul className="space-y-4">
      {typedParticipants.map((p) => (
        <li key={p.contact_id || p.name} className="flex items-center gap-3">
          <Avatar>
            {/* <AvatarImage src={p.avatarUrl} /> */}
            <AvatarFallback 
              style={{ 
                backgroundColor: generateAvatarColor(p.name), 
                color: generateTextColor(p.name),
                fontWeight: 600 
              }}
            >
              {getInitials(p.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{p.name}</p>
            <p className="text-sm text-muted-foreground">{p.role}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}