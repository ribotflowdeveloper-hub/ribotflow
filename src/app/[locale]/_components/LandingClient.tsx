"use client";

import { useEffect, useState } from 'react';

// Importem les dues vistes que podem mostrar
import { CountdownView } from './CountdownView'; // Aquest serà el teu component de compte enrere
import { MainLandingView } from './MainLandingView'; // Aquest és el nou component professional

// Definim la data de llançament
const LAUNCH_DATE = new Date("Jan 1, 2024 00:00:00");

export function LandingClient() {
  const [isLaunchTime, setIsLaunchTime] = useState(false);
  
  // Aquest efecte comprova la data només al client
  useEffect(() => {
    if (new Date() > LAUNCH_DATE) {
      setIsLaunchTime(true);
    }
  }, []);

  // Renderitzem una vista o l'altra segons si ha arribat la data de llançament
  if (isLaunchTime) {
    return <MainLandingView />;
  } else {
    // Has de moure el teu codi antic del compte enrere a un nou component 'CountdownView.tsx'
    return <CountdownView />;
  }
}