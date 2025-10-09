// /app/[locale]/onboarding/_context/OnboardingContext.tsx
"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useOnboardingForm } from '../_hooks/useOnboardingForm';

// El 'ReturnType' ens estalvia haver de reescriure tots els tipus del hook
type OnboardingContextType = ReturnType<typeof useOnboardingForm> | null;

const OnboardingContext = createContext<OnboardingContextType>(null);

export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error("useOnboarding ha de ser utilitzat dins d'un OnboardingProvider");
    }
    return context;
}

export function OnboardingProvider({ children, initialFullName }: { children: ReactNode, initialFullName: string }) {
    const value = useOnboardingForm(initialFullName);
    return (
        <OnboardingContext.Provider value={value}>
            {children}
        </OnboardingContext.Provider>
    );
}