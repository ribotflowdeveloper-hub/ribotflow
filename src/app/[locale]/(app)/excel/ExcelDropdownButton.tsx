import React, { useState, useRef, useEffect } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Defineix la forma d'una opció del desplegable.
 * Ara inclou una icona i un 'label' que actuarà com a tooltip.
 */
export interface DropdownOption {
  value: string;
  label: string;
  icon: React.ElementType;
}

/**
 * Defineix les propietats (props) que rep el component DropdownButton.
 */
interface DropdownButtonProps {
  /** Un array d'opcions per mostrar al menú desplegable. */
  options: DropdownOption[];
  /** Funció que s'executa quan l'usuari selecciona una opció. */
  onSelect: (selectedOption: DropdownOption) => void;

  disabled?: boolean; // ⬅️ AFEGEIX AQUESTA LÍNIA

}

/**
 * Un component de UI per a un botó desplegable que mostra una llista d'opcions.
 */
const DropdownButton: React.FC<DropdownButtonProps> = ({ options, onSelect }) => {
  // Estat per controlar si el menú està obert o tancat.
  const [isOpen, setIsOpen] = useState(false);

  // Ref per al contenidor principal del desplegable.
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * Canvia l'estat d'obertura del menú.
   */
  const toggleDropdown = () => {
    setIsOpen(prevIsOpen => !prevIsOpen);
  };

  /**
   * Gestiona el clic en una de les opcions.
   * Crida la funció onSelect i tanca el menú.
   */
  const handleOptionClick = (option: DropdownOption) => {
    onSelect(option);
    setIsOpen(false);
  };

  // Efecte per tancar el menú si l'usuari fa clic fora del component.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Afegim l'event listener quan el component es munta.
    document.addEventListener('mousedown', handleClickOutside);

    // Netegem l'event listener quan el component es desmunta.
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // L'array buit assegura que l'efecte només s'executa un cop.

  return (
    <div className="relative inline-block font-sans" ref={dropdownRef}>
      <button
        onClick={toggleDropdown} // Canviem l'estil per a que sigui un botó d'icona
        className="flex items-center justify-center h-9 px-3 bg-green-700 text-white rounded-md hover:bg-green-800 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
        aria-label="Opcions d'Excel"
      >
        <FileSpreadsheet className="h-6 w-6" />
      </button>
      {isOpen && (
        <ul className="absolute block list-none p-1 m-0 mt-2 bg-green-700/25 backdrop-blur-sm border border-green-600 rounded-md shadow-lg z-10">
          <TooltipProvider delayDuration={100}>
            {options.map((option) => (
              <Tooltip key={option.value}>
                <TooltipTrigger asChild>
                  <li
                    className="p-2 rounded-md cursor-pointer hover:bg-white/20"
                    onClick={() => handleOptionClick(option)}
                  >
                    <option.icon className="h-5 w-5 text-white" />
                  </li>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-green-900/70 text-zinc-50 border-zinc-800">
                  <p>{option.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </ul>
      )}
    </div>
  );
};

export default DropdownButton;
