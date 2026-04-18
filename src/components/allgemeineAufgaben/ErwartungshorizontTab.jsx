/**
 * ErwartungshorizontTab.jsx
 *
 * Tab für die Verwaltung des Erwartungshorizonts mit KI-Generierung.
 * Nur für Ebene-3-Aufgaben (Anwendungs- und Projektaufgaben).
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, Sparkles, Loader2, Save, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ErwartungshorizontTab({
  aufgabe,
  einheit,
  mappedLernziele = [],
  mappedBasisLernziele = [],
  kannBearbeiten = false,
}) {
  const queryClient = useQueryClient();
  const [editText, setEditText] = useState(aufgabe?.erwartungshorizont || '');
  const [isDirty, setIsDirty] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [wasGenerated, setWasGenerated] = useState(false);
  const [refinementText, setRefinementText] = useState('');

  const isEbene2 = aufgabe?.anforderungsebene === '2 - Transfer';
  const isEbene3 = aufgabe?.anforderungsebene === '3 - Projekt';
  const hasErwartungshorizont = isEbene2 || isEbene3;

  // Dialog-State für Zusatzinfos
  const [showContextDialog, setShowContextDialog] = useState(false);
  const [extraContext, setExtraContext] = useState('');

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.AllgemeineAufgabe.update(aufgabe.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      setIsDirty(false);
      toast.success('Erwartungshorizont gespeichert');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const handleSave = () => {
    updateMutation.mutate({ erwartungshorizont: editText });
  };

  const doGenerate = async (additionalContext = '') => {
    setIsGenerating(true);
    setShowContextDialog(false);
    try {
      const aufgabenstellungMitKontext = additionalContext?.trim()
        ? `${aufgabe.aufgabenstellung}\n\nZusätzlicher Kontext: ${additionalContext}`
        : aufgabe.aufgabenstellung;

      const response = await base44.functions.invoke('generateErwartungshorizont', {
        aufgabenstellung: aufgabenstellungMitKontext,
        lernziele: mappedLernziele.map(lz => ({
          formulierung_fachsprache: lz.formulierung_fachsprache || lz.title,
          title: lz.title
        })),
        lernpakete: [],
      });

      if (response.data?.erwartungshorizont) {
        setEditText(response.data.erwartungshorizont);
        setIsDirty(true);
        setWasGenerated(true);
        setRefinementText('');
        toast.success('Erwartungshorizont generiert. Bitte überprüfen und speichern.');
      } else {
        toast.error('KI konnte keinen Erwartungshorizont generieren.');
      }
    } catch (err) {
      toast.error('Fehler bei der KI-Generierung: ' + err.message);
    } finally {
      setIsGenerating(false);
      setExtraContext('');
    }
  };

  const handleRefine = async () => {
    if (!refinementText.trim()) return;
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateErwartungshorizont', {
        aufgabenstellung: aufgabe.aufgabenstellung,
        lernziele: mappedLernziele.map(lz => ({
          formulierung_fachsprache: lz.formulierung_fachsprache || lz.title,
          title: lz.title
        })),
        lernpakete: [],
        bisheriger_entwurf: editText,
        nachbesserung: refinementText,
      });
      if (response.data?.erwartungshorizont) {
        setEditText(response.data.erwartungshorizont);
        setIsDirty(true);
        setRefinementText('');
        toast.success('Erwartungshorizont überarbeitet.');
      } else {
        toast.error('KI konnte den Erwartungshorizont nicht überarbeiten.');
      }
    } catch (err) {
      toast.error('Fehler bei der Überarbeitung: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWithAI = () => {
    if (!aufgabe.aufgabenstellung?.trim()) {
      toast.error('Bitte füllen Sie zuerst die Aufgabenstellung aus.');
      return;
    }
    // Wenn keine Lernziele verknüpft: Rückfrage-Dialog zeigen
    if (mappedLernziele.length === 0) {
      setShowContextDialog(true);
    } else {
      doGenerate();
    }
  };

  if (!hasErwartungshorizont) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3 max-w-md">
          <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Der Erwartungshorizont ist für <strong>Ebene-2- und Ebene-3-Aufgaben</strong> verfügbar.
          </p>
          <p className="text-xs text-muted-foreground">
            Aktuell: {aufgabe?.anforderungsebene || 'Keine Ebene gesetzt'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    {/* Rückfrage-Dialog wenn keine Lernziele */}
    <Dialog open={showContextDialog} onOpenChange={setShowContextDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-accent" />
            Zusätzlicher Kontext für die KI
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Es sind noch keine Lernziele mit dieser Aufgabe verknüpft. Die KI kann trotzdem einen Erwartungshorizont erstellen – aber ein kurzer Hinweis hilft ihr dabei.
          </p>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Was sollen die Schüler zeigen oder können? (optional)
            </label>
            <textarea
              value={extraContext}
              onChange={e => setExtraContext(e.target.value)}
              placeholder="z.B. Die Schüler sollen die Ursachen des Attentats erklären und in den historischen Kontext einordnen können…"
              className="w-full h-28 p-3 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground italic">
            Kein Hinweis? Kein Problem – die KI erstellt auf Basis der Aufgabenstellung einen Vorschlag.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setShowContextDialog(false)}>
            Abbrechen
          </Button>
          <Button variant="outline" onClick={() => doGenerate('')} className="gap-2">
            Ohne Hinweis generieren
          </Button>
          <Button onClick={() => doGenerate(extraContext)} className="gap-2">
            <Sparkles className="w-4 h-4" />
            Generieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header mit Generierung-Button */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Erwartungshorizont</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {isEbene2
                ? 'Definieren Sie die Lösungserwartung auf Basis der Aufgabenstellung und zugeordneter Kompetenzen. Wird als Leitplanke für den KI-Tutor verwendet.'
                : 'Definieren Sie die Kriterien für erfolgreiche Bearbeitung (Inhalte, Umfang, Qualität). Wird als Leitplanke für den KI-Tutor verwendet.'}
            </p>
          </div>
          {kannBearbeiten && (
            <Button
              onClick={handleGenerateWithAI}
              disabled={isGenerating || !aufgabe.aufgabenstellung?.trim()}
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird generiert…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  KI: Generieren
                </>
              )}
            </Button>
          )}
        </div>

        {/* Textarea */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Erwartungshorizont / Zielvorgaben
          </label>
          <textarea
            value={editText}
            onChange={e => {
              setEditText(e.target.value);
              setIsDirty(true);
            }}
            disabled={!kannBearbeiten}
            placeholder={
              !kannBearbeiten
                ? 'Kein Erwartungshorizont definiert'
                : 'Strukturieren Sie die Erwartungen:\n1. Inhaltliche Kriterien\n2. Umfang & Struktur\n3. Methoden & Prozess\n4. Qualitätsmerkmale\n5. Lernziel-Bezug'
            }
            className="w-full h-96 p-4 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-muted/20 disabled:text-muted-foreground"
          />
        </div>

        {/* Nachbessern-Bereich – erscheint nach erster KI-Generierung */}
        {wasGenerated && kannBearbeiten && (
          <div className="space-y-2 p-3 rounded-lg bg-amber-50/50 border border-amber-200">
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              KI-Nachbesserung
            </p>
            <p className="text-xs text-amber-700">
              Nicht zufrieden? Gib der KI eine kurze Anweisung, was geändert werden soll.
            </p>
            <textarea
              value={refinementText}
              onChange={e => setRefinementText(e.target.value)}
              placeholder={'z.B. "Bitte den Punkt Methoden kürzen und stärker auf inhaltliche Kriterien eingehen."'}
              className="w-full h-20 p-2.5 border border-amber-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
            />
            <Button
              onClick={handleRefine}
              disabled={isGenerating || !refinementText.trim()}
              size="sm"
              variant="outline"
              className="gap-2 border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              {isGenerating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Wird überarbeitet…</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Nochmal überarbeiten</>
              )}
            </Button>
          </div>
        )}

        {/* Verknüpfte Lernziele anzeigen */}
        {mappedLernziele.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg bg-blue-50/30 border border-blue-200/30">
            <p className="text-xs font-semibold text-muted-foreground">
              Verknüpfte Lernziele ({mappedLernziele.length}):
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {mappedLernziele.map(lz => (
                <li key={lz.id} className="list-disc list-inside">
                  {lz.formulierung_fachsprache || lz.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Hinweis */}
        <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-2">
          <p className="text-xs font-semibold">💡 Tipps für einen guten Erwartungshorizont:</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Konkrete Inhalte: Was soll gelernt/verstanden werden?</li>
            <li>Qualitätsmerkmale: Woran erkennt man gute/mittelmäßige/schlechte Arbeit?</li>
            <li>Prozess-Anforderungen: Welche Arbeitsschritte sind sinnvoll?</li>
            <li>Umfang: Wie detailliert sollte das Ergebnis sein?</li>
          </ul>
        </div>
      </div>

      {/* Footer mit Speichern-Button */}
      {kannBearbeiten && isDirty && (
        <div className="shrink-0 p-4 border-t border-border bg-muted/10 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditText(aufgabe?.erwartungshorizont || '');
              setIsDirty(false);
            }}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="gap-2"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Wird gespeichert…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Speichern
              </>
            )}
          </Button>
        </div>
      )}
    </div>
    </>
  );
}