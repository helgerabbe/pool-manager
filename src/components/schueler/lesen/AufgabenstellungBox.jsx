import { ClipboardList } from 'lucide-react';

/**
 * Wiedererkennungs-Anker „Aufgabenstellung".
 *
 * Einheitliche blaue Box mit festem Icon (Klemmbrett), die in allen
 * Schüler-Aktivitäten signalisiert: „Das ist, was du tun sollst." Durch das
 * immer gleiche Symbol + die immer gleiche Farbe erkennt der Schüler den
 * Aufgaben-Block sofort wieder.
 */
export default function AufgabenstellungBox({ children, className = '' }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 ${className}`}>
      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shrink-0">
        <ClipboardList className="w-4 h-4" />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700/80 mb-0.5">Deine Aufgabe</p>
        <div className="text-sm text-blue-900 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}