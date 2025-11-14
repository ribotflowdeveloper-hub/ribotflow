// @/app/[locale]/(app)/excel/ExcelDropdownButton.tsx
import React, { useState, useRef, useEffect } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// 💡 1. Importem el tipus des del nou fitxer
import { type DropdownOption } from './types'; 

/**
 * Defineix les propietats (props) que rep el component DropdownButton.
 */
interface DropdownButtonProps {
  /** Un array d'opcions per mostrar al menú desplegable. */
  options: DropdownOption[];
  /** Funció que s'executa quan l'usuari selecciona una opció. */
  onSelect: (selectedOption: DropdownOption) => void;
  /** Indica si el botó ha d'estar desactivat. */
  disabled?: boolean;
}

/**
 * Un component de UI per a un botó desplegable que mostra una llista d'opcions.
 */
const DropdownButton: React.FC<DropdownButtonProps> = ({ 
  options, 
  onSelect, 
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(prevIsOpen => !prevIsOpen);
  };

  const handleOptionClick = (option: DropdownOption) => {
    onSelect(option);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); 

  return (
    <div className="relative inline-block font-sans" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        disabled={disabled} 
        className="flex items-center justify-center h-9 px-3 bg-green-700 text-white rounded-md hover:bg-green-800 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Opcions d'Excel"
      >
        <FileSpreadsheet className="h-6 w-6" />
      </button>
      {isOpen && (
        // 💡 2. CORRECCIÓ DE Z-INDEX: Canviat de z-10 a z-50
        <ul className="absolute block list-none p-1 m-0 mt-2 bg-green-700/25 backdrop-blur-sm border border-green-600 rounded-md shadow-lg z-50">
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