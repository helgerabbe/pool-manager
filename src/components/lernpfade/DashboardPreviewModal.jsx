/**
 * DashboardPreviewModal.jsx
 *
 * Schüler-Vorschau für ein Lerntyp-Dashboard.
 * Schritt 1 (Gerüst): Öffnet ein Fenster, das den aktiven Lerntyp anzeigt
 * und einen Platzhalter ("Inhalte folgen"). Wird schrittweise zur
 * authentischen Schüler-Ansicht ausgebaut.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Sparkles, Layers, Trophy, Star } from 'lucide-react';

const LERNTYP_META = {
  minimalist: { label: 'Minimalist', icon: Sparkles, accent: 'from-slate-600 to-slate-800' },
  pragmatiker: { label: 'Pragmatiker', icon: Layers, accent: 'from-blue-500 to-blue-700' },
  ehrgeizig: { label: 'Ehrgeizig', icon: Trophy, accent: 'from-amber-500 to-amber-700' },
  passioniert: { label: 'Passioniert', icon: Star, accent: 'from-violet-500 to-violet-700' },
};

export default function DashboardPreviewModal({ open, onOpenChange, lerntyp, einheitTitel }) {
  const meta = LERNTYP_META[lerntyp] || { label: lerntyp || 'Dashboard', icon: Eye, accent: 'from-slate-500 to-slate-700' };
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[1100px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-blue-600" />
            Schüler-Vorschau
            {einheitTitel && <span className="text-xs font-normal text-slate-500 ml-1">· {einheitTitel}</span>}
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So sieht das Dashboard für die Schüler aus (wird schrittweise ausgebaut).
          </p>
        </DialogHeader>

        <div className="pt-4">
          <div className={`rounded-2xl bg-gradient-to-br ${meta.accent} text-white px-6 py-8 flex items-center gap-4 shadow-lg`}>
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">Dashboard</div>
              <div className="text-2xl font-bold leading-tight">{meta.label}</div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="text-base font-semibold text-slate-700">Inhalte folgen</p>
            <p className="text-sm text-slate-500 mt-1">
              Hier entsteht in den nächsten Schritten die authentische Schüler-Ansicht für „{meta.label}".
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}