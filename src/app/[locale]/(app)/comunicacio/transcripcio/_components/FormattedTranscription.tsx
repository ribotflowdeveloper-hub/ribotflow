"use client";

import React from 'react';

interface FormattedTranscriptionProps {
  text: string | null;
}

export function FormattedTranscription({ text }: FormattedTranscriptionProps) {
  if (!text) {
    return (
      <p className="text-muted-foreground italic">
        No s'ha generat cap transcripció.
      </p>
    );
  }

  return (
    <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
      {/* 'whitespace-pre-wrap' és clau aquí: 
        Respecta els salts de línia i els espais en blanc del text original, 
        però fa un 'wrap' del text si se surt del contenidor.
      */}
      <p style={{ whiteSpace: 'pre-wrap' }}>{text}</p>
    </div>
  );
}