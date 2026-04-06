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
import { AlertCircle, Sparkles, Loader2, Save } from 'lucide-react';
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

  const isEbene3 = aufgabe?.anforderungsebene === '3 - Projekt';

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

  const handleGenerateWithAI = async () => {
    if (!aufgabe.aufgabenstellung?.trim()) {
      toast.error('Bitte füllen Sie zuerst die Aufgabenstellung aus.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateErwartungshorizont', {
        aufgabenstellung: aufgabe.aufgabenstellung,
        lernziele: mappedLernziele.map(lz => ({
          formulierung_fachsprache: lz.formulierung_fachsprache || lz.title,
          title: lz.title
        })),
        lernpakete: [],
      });

      if (response.data?.erwartungshorizont) {
        setEditText(response.data.erwartungshorizont);
        setIsDirty(true);
        toast.success('Erwartungshorizont generiert. Bitte überprüfen und speichern.');
      } else {
        toast.error('KI konnte keinen Erwartungshorizont generieren.');
      }
    } catch (err) {
      toast.error('Fehler bei der KI-Generierung: ' + err.message);
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isEbene3) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3 max-w-md">
          <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Der Erwartungshorizont ist nur für <strong>Ebene-3-Aufgaben (Projekte/Anwendungen)</strong> relevant.
          </p>
          <p className="text-xs text-muted-foreground">
            Aktuell: {aufgabe?.anforderungsebene || 'Keine Ebene gesetzt'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header mit Generierung-Button */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Erwartungshorizont</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Definieren Sie die Kriterien für erfolgreiche Bearbeitung. Dies wird als Leitplanke für den KI-Tutor verwendet.
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
  );
}