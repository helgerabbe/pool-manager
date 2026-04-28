/**
 * MBKBulkPreviewDialog.jsx
 *
 * Bestätigungs-/Preview-Modal vor dem Bulk-Apply.
 * Zeigt der Lehrkraft transparent, welche Prompts geschrieben werden, welche
 * übersprungen werden und warum — dann erst schreiben wir.
 */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Sparkles, Lock, PenSquare, FilePlus2, RotateCw } from 'lucide-react';

const SECTION_LABELS = {
  nucleus: '1. Nukleus',
  persona: '2. Persona',
  sektoren: '3. Sektor-Anweisungen',
  erstellungspakete: '4. Erstellungspakete',
};

function StatusBadge({ status }) {
  switch (status) {
    case 'new':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
          <FilePlus2 className="w-3 h-3" /> Neu
        </Badge>
      );
    case 'update':
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1">
          <RotateCw className="w-3 h-3" /> Aktualisieren
        </Badge>
      );
    case 'skip-customized':
      return (
        <Badge className="bg-violet-100 text-violet-700 border-violet-200 gap-1">
          <PenSquare className="w-3 h-3" /> Manuell — übersprungen
        </Badge>
      );
    case 'skip-blocked':
      return (
        <Badge className="bg-slate-100 text-slate-600 border-slate-200 gap-1">
          <Lock className="w-3 h-3" /> Blockiert — übersprungen
        </Badge>
      );
    default:
      return null;
  }
}

export default function MBKBulkPreviewDialog({
  open,
  onOpenChange,
  plan = [],
  summary = { willWrite: 0, skipCustomized: 0, skipBlocked: 0, total: 0 },
  busy = false,
  onConfirm,
}) {
  // Plan nach Section gruppieren (für die UI-Struktur).
  const sections = ['nucleus', 'persona', 'sektoren', 'erstellungspakete'].map((sec) => ({
    section: sec,
    items: plan.filter((it) => it.section === sec),
  })).filter((g) => g.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Bulk-Generierung — Vorschau
          </DialogTitle>
          <DialogDescription>
            Vor dem Schreiben prüfen Sie hier, welche Prompts neu erzeugt, welche aktualisiert
            und welche übersprungen werden. Manuell angepasste oder blockierte Prompts bleiben
            unverändert.
          </DialogDescription>
        </DialogHeader>

        {/* Summary-Zeile */}
        <div className="flex flex-wrap gap-2 px-1 pb-1">
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
            <FilePlus2 className="w-3 h-3" />
            {summary.willWrite} werden geschrieben
          </Badge>
          {summary.skipCustomized > 0 && (
            <Badge className="bg-violet-100 text-violet-700 border-violet-200 gap-1">
              <PenSquare className="w-3 h-3" />
              {summary.skipCustomized} manuell — übersprungen
            </Badge>
          )}
          {summary.skipBlocked > 0 && (
            <Badge className="bg-slate-100 text-slate-600 border-slate-200 gap-1">
              <Lock className="w-3 h-3" />
              {summary.skipBlocked} blockiert
            </Badge>
          )}
          <Badge variant="outline" className="text-muted-foreground">
            {summary.total} insgesamt
          </Badge>
        </div>

        {/* Plan-Liste */}
        <div className="max-h-[50dvh] overflow-y-auto space-y-4 pr-1 -mr-1">
          {sections.map((g) => (
            <div key={g.section} className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {SECTION_LABELS[g.section]}
              </p>
              <ul className="space-y-1">
                {g.items.map((it) => (
                  <li
                    key={it.key}
                    className="flex items-start gap-3 px-3 py-2 rounded-md border bg-card text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{it.label}</p>
                      {it.skipReason && (
                        <p className="text-xs text-muted-foreground mt-0.5">{it.skipReason}</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={it.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Abbrechen
          </Button>
          <Button
            onClick={onConfirm}
            disabled={busy || summary.willWrite === 0}
            className="gap-1.5"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {summary.willWrite === 0
              ? 'Nichts zu tun'
              : `${summary.willWrite} Prompt${summary.willWrite === 1 ? '' : 's'} schreiben`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}