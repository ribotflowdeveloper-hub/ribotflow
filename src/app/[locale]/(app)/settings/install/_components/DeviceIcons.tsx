// src/app/[locale]/(app)/settings/install/_components/DeviceIcons.tsx

import { Monitor, type LucideProps } from 'lucide-react';

// Icona per a Apple (iOS)
export const AppleIcon = (props: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
    <path d="M10 2c1 .5 2 2 2 5" />
  </svg>
);

// Icona per a Android
export const AndroidIcon = (props: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M14 8V4.83A1 1 0 0 0 12.17 4a14.24 14.24 0 0 0-8.34 0A1 1 0 0 0 2 4.83V8" />
    <path d="M6 12v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4" />
    <path d="M12 12v8" />
    <path d="M4.2 10.2a6.5 6.5 0 0 1 15.6 0" />
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H8" />
    <path d="M16 2h1.5A2.5 2.5 0 0 1 20 4.5" />
  </svg>
);

// Re-exportem Monitor per mantenir la consistència
export const DesktopIcon = Monitor;