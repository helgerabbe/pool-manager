/**
 * ThemenfeldEinfuehrungPreviewModal.jsx
 *
 * Lehrer-Vorschau für den Lernpfad-System-Baustein „Einführung in das
 * Themenfeld" (sys_themenfeld_intro). Zeigt den aktuell gespeicherten
 * SchuelerInhaltSnapshot — oder erzeugt ihn, falls noch keiner existiert.
 *
 * „In Schüleransicht übernehmen" generiert den Inhalt NEU und schreibt ihn
 * zentral in die Single Source of Truth (SchuelerInhaltSnapshot) über die
 * Backend-Funktion getOrCreateThemenfeldEinfuehrung mit force=true. Damit gibt
 * es genau EINEN Speicherort — die Schüleransicht liest danach unverändert
 * daraus.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Sparkles, RefreshCw, Loader2, ImageIcon, AlertTriangle, CheckCircle2 } from 'lucide-react';

const LERNTYP_LABEL = {
  minimalist: 'Minimalist',
  pragmatiker: 'Pragmatiker',
  ehrgeizig: 'Ehrgeizig',
  passioniert: 'Passioniert',
};

export default function ThemenfeldEinfuehrungPreviewModal({
  open, onOpenChange, einheitId, einheitTitel, fach, context,
}) {
  // context = { lerntyp, instanceId, themenfeldId, sektorTitel }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [inhalt, setInhalt] = useState(null);
  const [savedOk, setSavedOk] = useState(false);

  const lerntyp = context?.lerntyp;
  const instanceId = context?.instanceId;
  const themenfeldId = context?.themenfeldId || null;

  // Beim Öffnen: vorhandenen Snapshot LESEN (nicht generieren).
  useEffect(() => {
    if (!open || !einheitId || !lerntyp || !instanceId) return;
    let abort = false;
    setLoading(true);
    setError(null);
    setInhalt(null);
    setSavedOk(false);
    base44.entities.SchuelerInhaltSnapshot
      .filter({ einheit_id: einheitId, lerntyp, instance_id: instanceId })
      .then((list) => {
        if (abort) return;
        const snap = Array.isArray(list) ? list[0] : null;
        setInhalt(snap?.inhalt || null);
      })
      .catch(() => { if (!abort) setInhalt(null); })
      .finally(() => { if (!abort) setLoading(false); });
    return () => { abort = true; };
  }, [open, einheitId, lerntyp, instanceId]);

  // Neu generieren + zentral speichern (force=true).
  const regenerateAndSave = useCallback(async () => {
    if (!einheitId || !lerntyp || !instanceId) return;
    setSaving(true);
    setError(null);
    setSavedOk(false);
    try {
      const res = await base44.functions.invoke('getOrCreateThemenfeldEinfuehrung', {
        einheitId, lerntyp, instanceId, themenfeldId, force: true,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      setInhalt(res?.data?.inhalt || null);
      setSavedOk(true);
    } catch (e) {
      setError(e?.message || 'Erzeugung fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }, [einheitId, lerntyp, instanceId, themenfeldId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            Vorschau: Einführung in das Themenfeld
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {LERNTYP_LABEL[lerntyp] || lerntyp}
            {context?.sektorTitel ? ` · ${context.sektorTitel}` : ''} — so sieht die KI-Einführung für die Schüler aus.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 py-2 min-h-[280px]">
          {(loading || saving) && (
            <div className="h-full flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-violet-600" />
              <p className="text-sm font-medium">
                {saving ? 'KI erstellt die Einführung neu …' : 'Lade gespeicherten Inhalt …'}
              </p>
            </div>
          )}

          {error && !loading && !saving && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
              <p className="text-sm text-slate-700 font-medium">{error}</p>
              <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={regenerateAndSave}>
                <RefreshCw className="w-3.5 h-3.5" /> Erneut versuchen
              </Button>
            </div>
          )}

          {!loading && !saving && !error && !inhalt && (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center gap-4">
              <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 text-violet-600">
                <Sparkles className="w-7 h-7" />
              </span>
              <p className="text-sm text-muted-foreground max-w-xs">
                Für diese Instanz wurde noch kein Inhalt erstellt. Lass ihn jetzt
                erzeugen und zentral speichern.
              </p>
            </div>
          )}

          {!loading && !saving && inhalt && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center h-48">
                {inhalt.bild_url ? (
                  <img src={inhalt.bild_url} alt="" className="w-full h-48 object-cover" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-violet-300" />
                )}
              </div>
              <div className="p-6">
                <div className="text-[11px] font-bold uppercase tracking-wider text-violet-500">
                  {fach || 'Fach'}
                </div>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">{inhalt.titel}</h2>
                {inhalt.intro && <p className="mt-2 text-base text-slate-600">{inhalt.intro}</p>}
                <div className="mt-5 space-y-4">
                  {(inhalt.abschnitte || []).map((a, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="text-2xl leading-none shrink-0">{a.emoji || '✨'}</div>
                      <div>
                        {a.ueberschrift && (
                          <h3 className="font-semibold text-slate-800">{a.ueberschrift}</h3>
                        )}
                        {a.text && <p className="text-sm text-slate-600">{a.text}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:flex-row sm:items-center sm:justify-between gap-2">
          {savedOk && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Zentral gespeichert
            </span>
          )}
          <div className="flex items-center gap-2 sm:ml-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Schließen</Button>
            <Button className="gap-1.5" disabled={saving} onClick={regenerateAndSave}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {inhalt ? 'Neu generieren & speichern' : 'Erzeugen & speichern'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}