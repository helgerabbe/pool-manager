import { AlertTriangle } from 'lucide-react';

/**
 * Wiedererkennungs-Anker „Hinweis".
 *
 * Einheitliche gelbe Box mit festem Warn-/Ausrufezeichen-Icon, die überall in
 * den Schüler-Aktivitäten dasselbe signalisiert: „Achtung, lies das aufmerksam."
 * Gleiche Farbe + gleiches Symbol = sofortige Wiedererkennung.
 */
export default function HinweisBox({ children, className = '' }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 ${className}`}>
      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500 text-white shrink-0">
        <AlertTriangle className="w-4 h-4" />
      </span>
      <div className="min-w-0 pt-0.5 text-sm text-amber-900 leading-relaxed">{children}</div>
    </div>
  );
}