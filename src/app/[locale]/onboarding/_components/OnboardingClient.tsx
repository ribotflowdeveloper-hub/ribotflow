// /app/[locale]/onboarding/_components/OnboardingClient.tsx
"use client";

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { OnboardingProvider, useOnboarding } from './OnboardingContext';
import { OnboardingLayout } from './OnboardingLayout'; // Nou component per l'estructura
import { Step1, Step2, Step3 } from './steps'; // Components per a cada pas

interface OnboardingClientProps {
    initialFullName: string;
    availableServices: { id: number; name: string }[];
}

// Component intern que renderitza el pas actual
function OnboardingSteps({ availableServices }: { availableServices: { id: number; name: string }[] }) {
    const { step } = useOnboarding(); // Obtenim l'estat del context
    
    return (
        <AnimatePresence mode="wait">
            {step === 1 && <Step1 key="step1" />}
            {step === 2 && <Step2 key="step2" />}
            {step === 3 && <Step3 key="step3" availableServices={availableServices} />}
        </AnimatePresence>
    );
}

// El component principal ara és molt més net
export function OnboardingClient({ initialFullName, availableServices }: OnboardingClientProps) {
    return (
        <OnboardingProvider initialFullName={initialFullName}>
            <OnboardingLayout>
                <OnboardingSteps availableServices={availableServices} />
            </OnboardingLayout>
        </OnboardingProvider>
    );
}