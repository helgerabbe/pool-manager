/**
 * ExportLifecycleHeaderCard.jsx
 *
 * Phase F.1 — Header-Karte des neuen Tab-8-Cockpits.
 *
 * Zeigt prominent den `export_lifecycle_status` der aktuell geöffneten Einheit
 * und stellt der Fachschaftsleitung/Admins einen „Freigabe aufheben"-Button
 * zur Verfügung, solange der Export noch nicht gestartet wurde.
 *
 * Logik (Variante a — minimal-invasiv):
 *   - Aufheben setzt nur `export_lifecycle_status` → 'draft' zurück.
 *   - Pfad-Locks (LernpfadAufgabeMembership.pfad_status) bleiben unverändert.
 *   - Einzelne Pfade kann die Lehrkraft anschließend bewusst pro Lerntyp
 *     im Tab 7 entsperren.
 *
 * Hinweise:
 *   - Die Aktion ist nur im Status `final_freigegeben` möglich. Sobald das
 *     Export-Center „Export starten" geklickt hat (export_running) oder der
 *     Export bestätigt ist (published), zeigt die Karte nur noch einen
 *     Status-Hinweis ohne Aktionsbutton.
 *   - RBAC-Guard: Nur Administrator + Fachschaftsleitung des Fachs (kommt
 *     vom Server, hier reichen wir nur darfFreigeben durch).
 */

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lock,
  Truck,
  CheckCircle2,
  ShieldOff,
  Loader2,
  AlertCircle,
  Pencil,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useEinheitFreigabeStatus } from '@/hooks/useEinheitFreigabeStatus';
import {
  EXPORT_LIFECYCLE_STATUS,
  EXPORT_LIFECYCLE_LABELS,
} from '@/lib/exportLifecycle';

// Visuelle Metadaten je Lifecycle-Status. Gleiche Farbsprache wie in den
// Einheitenkarten (EinheitExportLifecycleBadge), nur größer/prominenter.
const STATUS_META = {
  [EXPORT_LIFECYCLE_STATUS.DRAFT]: {
    icon: Pencil,
    cls: 'bg-slate-100 text-slate-700 border-slate-200',
    iconCls: 'text-slate-500',
    description:
      'Die Einheit ist in Bearbeitung. Inhalte können von Lehrkräften geändert werden.',
  },
  [EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN]: {
    icon: Lock,
    cls: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    iconCls: 'text-emerald-600',
    description:
      'Alle 4 Dashboards sind geprüft und die Inhalte aller Aufgaben, Lernpakete und Aktivitäten sind gesperrt. Die Einheit wartet auf den Start des Exports.',
  },
  [EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING]: {
    icon: Truck,
    cls: 'bg-orange-50 text-orange-900 border-orange-200',
    iconCls: 'text-orange-600',
    description:
      'Das Export-Team hat den Export gestartet. Aufhebung in der Einheit nicht mehr möglich – nur noch über das Export-Center.',
  },
  [EXPORT_LIFECYCLE_STATUS.PUBLISHED]: {
    icon: CheckCircle2,
    cls: 'bg-blue-50 text-blue-900 border-blue-200',
    iconCls: 'text-blue-600',
    description:
      'Die Einheit ist veröffentlicht. Inhalte sind wieder editierbar; Änderungen werden automatisch als „geändert" markiert.',
  },
};

export default function ExportLifecycleHeaderCard({
  einheitId,
  einheitTitel,
  darfFreigeben = false,
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useEinheitFreigabeStatus(einheitId);

  // Aufheben-Mutation. Identische Server-Schnittstelle wie der bestehende
  // EinheitFreigabeBlock in Tab 7 — Variante (a) ist serverseitig schon
  // korrekt implementiert (setEinheitFreigabeStatus → 'draft' setzt nur den
  // Lifecycle-Status, lässt Pfad-Locks unangetastet).
  const undoMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('setEinheitFreigabeStatus', {
        einheitId,
        newStatus: EXPORT_LIFECYCLE_STATUS.DRAFT,
      });
      if (res?.data?.error) {
        const err = new Error(res.data.error);
        err.code = res.data.code;
        throw err;
      }
      return res?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheitFreigabeStatus', einheitId] });
      queryClient.invalidateQueries({ queryKey: ['aufgabeLock'] });
      toast({
        title: 'Freigabe aufgehoben',
        description:
          'Die Einheit ist wieder im Bearbeitungs-Status. Die einzelnen Lernpfade bleiben gesperrt – sie können bei Bedarf einzeln in Tab 7 entsperrt werden.',
      });
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: 'Aufhebung nicht möglich',
        description: err?.message || 'Bitte erneut versuchen.',
      });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Status wird geladen…
        </div>
      </div>
    );
  }

  const status = data.status || EXPORT_LIFECYCLE_STATUS.DRAFT;
  const meta = STATUS_META[status] || STATUS_META[EXPORT_LIFECYCLE_STATUS.DRAFT];
  const Icon = meta.icon;
  const label = EXPORT_LIFECYCLE_LABELS[status] || EXPORT_LIFECYCLE_LABELS.draft;
  const canUndo =
    darfFreigeben && status === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN;

  return (
    <div className={`rounded-xl border p-5 ${meta.cls}`}>
      <div className="flex items-start gap-4 flex-wrap">
        {/* Icon-Kachel */}
        <div className={`shrink-0 w-12 h-12 rounded-lg bg-white/70 flex items-center justify-center ${meta.iconCls}`}>
          <Icon className="w-6 h-6" />
        </div>

        {/* Status-Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
              Status der Einheit
            </span>
          </div>
          <h2 className="text-xl font-bold mt-0.5">{label}</h2>
          {einheitTitel && (
            <p className="text-sm opacity-80 truncate mt-0.5">{einheitTitel}</p>
          )}
          <p className="text-sm mt-2 leading-snug max-w-2xl">{meta.description}</p>

          {/* Meta-Info: wann/von wem? */}
          {(status === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN ||
            status === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING ||
            status === EXPORT_LIFECYCLE_STATUS.PUBLISHED) &&
            data.changed_by && (
              <p className="text-xs opacity-70 mt-2">
                Zuletzt geändert von <strong>{data.changed_by}</strong>
                {data.changed_at
                  ? ` am ${new Date(data.changed_at).toLocaleString('de-DE')}`
                  : ''}
                .
              </p>
            )}
        </div>

        {/* Aktionsbereich rechts */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {canUndo ? (
            <Button
              variant="outline"
              onClick={() => undoMutation.mutate()}
              disabled={undoMutation.isPending}
              className="gap-1.5 border-red-300 bg-white/70 text-red-700 hover:bg-red-50"
              title="Finale Einheits-Freigabe aufheben (nur Admin oder Fachschaftsleitung)."
            >
              {undoMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldOff className="w-3.5 h-3.5" />
              )}
              Freigabe aufheben
            </Button>
          ) : status === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN && !darfFreigeben ? (
            <span className="text-[11px] italic opacity-70 max-w-[180px] text-right">
              Nur Admin oder Fachschaftsleitung dürfen die Freigabe aufheben.
            </span>
          ) : status === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING ||
            status === EXPORT_LIFECYCLE_STATUS.PUBLISHED ? (
            <span className="inline-flex items-start gap-1.5 text-[11px] italic opacity-80 max-w-[200px] text-right">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
              Aufhebung nur über das Export-Center möglich.
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}