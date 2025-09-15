import { Building2 } from 'lucide-react';
import { PublicProfile } from '@/types';
// Importem el component 'Image' de Next.js. És una versió optimitzada de l'etiqueta <img>.
import Image from 'next/image';

// Definim les propietats que rep aquest component.
interface ProfileCardProps {
  profile: PublicProfile;      // L'objecte amb les dades d'un únic perfil.
  isSelected: boolean;         // Un booleà que indica si aquesta targeta està seleccionada actualment.
  onClick: () => void;         // Una funció que s'executarà quan l'usuari faci clic a la targeta.
}

/**
 * Aquest és un "component presentacional" o "dumb component".
 * La seva única funció és mostrar les dades d'un perfil en format de targeta.
 * No té lògica interna; rep totes les dades i funcions del seu component pare.
 * Això el fa altament reutilitzable.
 */
export default function ProfileCard({ profile, isSelected, onClick }: ProfileCardProps) {
  return (
    // El 'div' principal gestiona el clic i canvia d'estil segons si està seleccionat.
    <div
      onClick={onClick}
      // Les classes CSS es canvien dinàmicament amb un 'template literal'.
      // Si 'isSelected' és cert, s'aplica un fons i una vora de color porpra.
      className={`p-4 mb-2 rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected ? 'bg-purple-800/50 ring-2 ring-purple-500' : 'bg-gray-800/50 hover:bg-gray-700/50'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Renderitzat condicional: si el perfil té 'logo_url', mostrem la imatge. */}
        {profile.logo_url ? (
          // El component <Image> de Next.js optimitza les imatges automàticament (mida, format, lazy loading).
          // Requereix 'width' i 'height' per evitar salts de disseny durant la càrrega.
          <Image 
            src={profile.logo_url} 
            alt={`Logo de ${profile.company_name}`}
            width={48} 
            height={48}
            className="rounded-full object-cover bg-gray-700"
          />
        ) : (
          // Si no hi ha logo, mostrem una icona per defecte.
          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-gray-400" />
          </div>
        )}
        <div>
          <h3 className="font-bold">{profile.company_name}</h3>
          <p className="text-sm text-gray-400 truncate">{profile.summary}</p>
        </div>
      </div>
    </div>
  );
}