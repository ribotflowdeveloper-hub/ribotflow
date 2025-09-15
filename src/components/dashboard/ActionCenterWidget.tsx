/**
 * @file ActionCenterWidget.tsx
 * @summary Aquest fitxer defineix un component de client purament presentacional.
 * La seva funció és mostrar una llista d'elements d'acció (el "Radar") al Dashboard.
 * Rep les dades i un estat de càrrega com a propietats i s'encarrega només de la visualització.
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { FC, ElementType } from 'react';

// Objecte per mapejar un nom de color a les classes de Tailwind CSS corresponents.
// Aquest patró és útil per evitar que Tailwind purgui classes dinàmiques.
const colorVariants = {
  red: { bg: 'bg-red-500/10', text: 'text-red-400' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
};

// Definim el tipus de dades per a un únic element d'acció.
type ActionItemData = {
  id: string | number;
  icon: ElementType; // Permet passar un component d'icona (ex: <User />).
  color: keyof typeof colorVariants;
  title: string;
  description: string;
  linkTo: string;
  actionText: string;
};

/**
 * @summary Sub-component que renderitza un únic element a la llista del radar.
 */
const ActionItem: FC<ActionItemData> = ({ icon: Icon, color, title, description, linkTo, actionText }) => {
  const variant = colorVariants[color] || colorVariants.blue; // Variant de color per defecte.

  return (
    <div className="flex items-start gap-4">
      <div className={`mt-1 w-8 h-8 flex items-center justify-center rounded-full ${variant.bg} shrink-0`}>
        <Icon className={`w-5 h-5 ${variant.text}`} />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {actionText && (
          <Button asChild variant="link" className="p-0 h-auto text-primary mt-1">
            <Link href={linkTo}>{actionText}</Link>
          </Button>
        )}
      </div>
    </div>
  );
};

interface ActionCenterWidgetProps {
  items: ActionItemData[];
  loading: boolean;
}

/**
 * @summary El component principal del widget del Radar.
 */
const ActionCenterWidget: FC<ActionCenterWidgetProps> = ({ items, loading }) => {
  return (
    <div className="glass-effect rounded-xl p-6 h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4 flex-shrink-0">📡 Radar del Regne</h2>
      <div className="flex-1 space-y-6 overflow-y-auto -mr-2 pr-2">
        {/* Renderització condicional: mostrem un missatge de càrrega, la llista d'elements, o un missatge de "tot en ordre". */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Analitzant...</p>
        ) : items.length > 0 ? (
          items.map(item => <ActionItem key={item.id} {...item} />)
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Tot en calma. El teu regne està en ordre.</p>
        )}
      </div>
    </div>
  );
};

export default ActionCenterWidget;
