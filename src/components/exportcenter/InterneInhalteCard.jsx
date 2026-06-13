/**
 * InterneInhalteCard.jsx
 *
 * Export-Center-Trigger „Interne Inhalte erzeugen" – erweitert.
 *
 * Zeigt VOR der Erzeugung, welche KI-Snapshots für diese Einheit
 * erwartet werden und welche davon noch fehlen. Die Lehrkraft kann
 * gezielt „Fehlende erzeugen" oder alles neu generieren.
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Sparkles, Loader2, CheckCircle2, RefreshCw, AlertTriangle,
  ChevronDown, ChevronRight, Eye,
} from 'lucide-react';
import { toast } from 'sonner';

const LERNTYP_LABELS = {
  minimalist: 'Minimalist',
  pragmatiker: 'Pragmatiker',
  ehrgeizig: 'Ehrgeizig',
  passioniert: 'Passioniert',
};

const LERNTYP_COLORS = {
  minimalist: 'bg-slate-100 text-slate-700',
  pragmatiker: 'bg-blue-100 text-blue-700',
  ehrgeizig: 'bg-amber-100 text-amber-700',
  passioniert: 'bg-violet-100 text-violet-700',
};

export default function InterneInhalteCard({ einheitId }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Einheit laden für lernpfade_konfiguration
  const { data: einheit } = useQuery({
    queryKey: ['einheit', einheitId],
    queryFn: () => base44.entities.Einheiten.get(einheitId),
    enabled: !!einheitId,
  });

  // Bestehende Snapshots
  const { data: snapshots = [] } = useQuery({
    queryKey: ['schuelerInhaltSnapshots', einheitId],
    queryFn: () => base44.entities.SchuelerInhaltSnapshot.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  // Erwartete KI-Bausteine aus lernpfade_konfiguration
  const expectedItems = useMemo(() => {
    if (!einheit?.lernpfade_konfiguration) return [];
    const items = [];
    const konfig = einheit.lernpfade_konfiguration;
    for (const lerntyp of Object.keys(LERNTYP_LABELS)) {
      const sektoren = konfig[lerntyp] || [];
      for (const sektor of sektoren) {
        for (const item of sektor?.items || []) {
          if (item?.type === 'system' && item.ref_id?.startsWith('sys_')) {
            items.push({
              lerntyp,
              instanceId: item.instance_id,
              bausteinId: item.ref_id,
              themenfeldId: sektor.themenfeld_id || null,
              sektorTitel: sektor.titel || 'Unbekannter Sektor',
            });
          }
        }
      }
    }
    return items;
  }, [einheit]);

  // Snapshots indizieren
  const snapByKey = useMemo(() => {
    const map = new Map();
    for (const s of snapshots) {
      map.set(`${s.lerntyp}::${s.instance_id}`, s);
    }
    return map;
  }, [snapshots]);

  // Fehlende Items
  const missingItems = useMemo(() => {
    return expectedItems.filter((item) => {
      const key = `${item.lerntyp}::${item.instanceId}`;
      return !snapByKey.has(key);
    });
  }, [expectedItems, snapByKey]);

  const vorhanden = expectedItems.length - missingItems.length;

  // Gruppiert nach Lerntyp für Anzeige
  const groupedByLerntyp = useMemo(() => {
    const groups = {};
    for (const item of expectedItems) {
      if (!groups[item.lerntyp]) {
        groups[item.lerntyp] = { items: [], vorhanden: 0, fehlend: 0 };
      }
      const key = `${item.lerntyp}::${item.instanceId}`;
      const exists = snapByKey.has(key);
      groups[item.lerntyp].items.push({ ...item, exists });
      if (exists) groups[item.lerntyp].vorhanden++;
      else groups[item.lerntyp].fehlend++;
    }
    return groups;
  }, [expectedItems, snapByKey]);

  const run = async (force) => {
    setRunning(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('generateInterneInhalte', { einheitId, force });
      if (res?.data?.error) throw new Error(res.data.error);
      setResult(res.data);
      const { erzeugt = 0, uebersprungen = 0, fehler = 0 } = res.data || {};
      toast.success(`${erzeugt} erzeugt, ${uebersprungen} übersprungen${fehler ? `, ${fehler} fehlerhaft` : ''}.`);
    } catch (e) {
      toast.error(e?.message || 'Erzeugung fehlgeschlagen.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10 text-violet-600 shrink-0">
          <Sparkles className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Interne Inhalte erzeugen</h3>
            {expectedItems.length > 0 && (
              <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${
                missingItems.length === 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {missingItems.length === 0 ? (
                  <><CheckCircle2 className="w-3 h-3 inline mr-0.5" />Vollständig</>
                ) : (
                  <><AlertTriangle className="w-3 h-3 inline mr-0.5" />{missingItems.length} fehlen</>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            KI-generierte Baustein-Inhalte (z.B. Themenfeld-Einführungen) für alle
            vier Lerntypen erzeugen. Schüler lesen daraus ohne Wartezeit.
          </p>

          {/* Status-Übersicht mit Aufklapp-Details */}
          {expectedItems.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                {vorhanden} von {expectedItems.length} Inhalten vorhanden
                {missingItems.length > 0 && (
                  <span className="text-amber-600 font-medium">
                    – {missingItems.length} fehlen
                  </span>
                )}
              </button>

              {expanded && (
                <div className="mt-2 space-y-2 pl-2 border-l-2 border-muted">
                  {Object.entries(groupedByLerntyp).map(([lerntyp, group]) => (
                    <div key={lerntyp}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 ${LERNTYP_COLORS[lerntyp] || 'bg-slate-100 text-slate-700'}`}>
                          {LERNTYP_LABELS[lerntyp] || lerntyp}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {group.vorhanden}/{group.items.length}
                        </span>
                      </div>
                      <ul className="space-y-0.5">
                        {group.items.map((item) => (
                          <li key={item.instanceId} className="flex items-center gap-2 text-xs pl-1">
                            {item.exists ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                            )}
                            <span className={item.exists ? 'text-muted-foreground' : 'text-foreground font-medium'}>
                              {item.sektorTitel}
                            </span>
                            {item.exists && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                                title="Snapshot ansehen (in Entwicklung)"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={running || missingItems.length === 0}
              onClick={() => run(false)}
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Fehlende erzeugen
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={running}
              onClick={() => run(true)}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Alle neu generieren
            </Button>
          </div>

          {result && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> {result.erzeugt} erzeugt
              </span>
              <span className="text-muted-foreground">{result.uebersprungen} übersprungen</span>
              {result.fehler > 0 && (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5" /> {result.fehler} fehlerhaft
                </span>
              )}
              <span className="text-muted-foreground">({result.gesamt} gesamt)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}