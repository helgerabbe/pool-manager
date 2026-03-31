import React from 'react';
import { FlaskConical, ChevronDown, X, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLLEN } from '@/lib/rbac';
import { useMockedRole } from '@/lib/RoleContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ROLLEN_LISTE = [
  { value: ROLLEN.ADMIN,      label: 'Administrator',      badge: 'bg-red-100 text-red-700' },
  { value: ROLLEN.FACHSCHAFT, label: 'Fachschaftsleitung', badge: 'bg-purple-100 text-purple-700' },
  { value: ROLLEN.LEHRKRAFT,  label: 'Fachlehrkraft',      badge: 'bg-blue-100 text-blue-700' },
  { value: ROLLEN.BETRACHTER, label: 'Betrachter',         badge: 'bg-gray-100 text-gray-600' },
  { value: ROLLEN.MOODLE,     label: 'Moodle-Designer',    badge: 'bg-green-100 text-green-700' },
];

const REAL_BADGE = {
  Administrator:      'bg-red-100 text-red-700',
  Fachschaftsleitung: 'bg-purple-100 text-purple-700',
  Fachlehrkraft:      'bg-blue-100 text-blue-700',
  Betrachter:         'bg-gray-100 text-gray-600',
  'Moodle-Designer':  'bg-green-100 text-green-700',
};

/**
 * RoleSwitcher — sichtbar und funktional NUR für Administratoren.
 *
 * Props:
 *  realRolle  — tatsächliche Rolle aus der Datenbank
 *  anzeigRolle — aktuell angezeigte Rolle (ggf. gemockt)
 */
export default function RoleSwitcher({ realRolle, anzeigeRolle }) {
  const { mockedRole, setMockedRole } = useMockedRole();
  const isMocked = !!mockedRole;

  // Immer klickbares Dropdown (Dev-Modus)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
            isMocked
              ? 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
              : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
          )}
          title={isMocked ? 'Testansicht aktiv – klicken zum Wechseln' : 'Rolle simulieren'}
        >
          {isMocked ? (
            <FlaskConical className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="max-w-[130px] truncate">
            {isMocked ? `Test: ${mockedRole}` : realRolle}
          </span>
          <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Rolle simulieren (nur für Tests)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {ROLLEN_LISTE.map(r => {
          const isActive = mockedRole === r.value || (!mockedRole && r.value === ROLLEN.ADMIN);
          return (
            <DropdownMenuItem
              key={r.value}
              onClick={() => setMockedRole(r.value)}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                isActive && 'bg-muted'
              )}
            >
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${r.badge}`}>
                {r.label}
              </span>
              {isActive && <span className="ml-auto text-xs text-muted-foreground">aktiv</span>}
            </DropdownMenuItem>
          );
        })}

        {isMocked && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setMockedRole(null)}
              className="flex items-center gap-2 text-orange-700 cursor-pointer hover:bg-orange-50"
            >
              <X className="w-3.5 h-3.5" />
              Testansicht beenden
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}