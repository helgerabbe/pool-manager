// Stapel der KI-Vorsortierung von MBK-Hinweisen (Feld Pruefbefund.ki_stapel).
export const MBK_STAPEL = {
  uebernehmen: { label: 'Im Kurs schon repariert', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  reparieren: { label: 'KI kann reparieren', cls: 'bg-blue-50 text-blue-800 border-blue-200' },
  lehrkraft: { label: 'Braucht dich', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  schliessen: { label: 'Kann geschlossen werden', cls: 'bg-slate-50 text-slate-700 border-slate-200' },
};

export function formatDatum(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}