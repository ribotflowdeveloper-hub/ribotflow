import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mentre comprovem la sessió, mostrem un indicador per evitar parpellejos
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Si no hi ha usuari, redirigim a /login
  // La clau és 'state={{ from: location }}', que guarda la pàgina de destí
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si hi ha usuari, permetem el pas i mostrem el contingut protegit (el layout)
  return children;
};

export default ProtectedRoute;
