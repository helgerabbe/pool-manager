/**
 * HtmlEmbedAufgabeView.jsx
 *
 * Dialog fuer externe HTML-Seiten-Aufgaben.
 * Enthaelt: Themenfeld (Pflicht), Titel, HTML-Code (Pflicht),
 * Aufgabenstellung, optionalen Erwartungshorizont (per KI analysierbar).
 *
 * KEIN KI-Tutor-Prompt, KEINE Lernzielanalyse.
 * Der Erwartungshorizont kann per KI aus dem HTML-Code generiert werden.
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAllgemeineAufgabe, updateAllgemeineAufgabe } from '@/services/AllgemeineAufgabeService';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Save, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import MissionPicker from '@/components/missionen/MissionPicker';
import { isMissionApplicable } from '@/lib/missionen';

const EMPTY_FORM = {
  themenfeld_id: null,
  titel: '',
  html_code: '',
  aufgabenstellung: '',
  erwartungshorizont: '',
  schwierigkeitsgrad: null,
  ergebnis_form: '',
  ergebnis_dateiformat: '',
  mission_type: null,
};

export default function HtmlEmbedAufgabeView({
  open,
  onOpenChange,
  einheitId,
  themenfelder = [],
  onSuccess,
  initialData = null,
  defaultAnforderungsebene = '2 - Transfer',
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [kiAnalysiert, setKiAnalysiert] = useState(false);
  const [kiLaeuft, setKiLaeuft] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setFormData({
        themenfeld_id: initialData.themenfeld_id || null,
        titel: initialData.titel || '',
        html_code: initialData.html_code || '',
        aufgabenstellung: initialData.aufgabenstellung || '',
        erwartungshorizont: initialData.erwartungshorizont || '',
        schwierigkeitsgrad: initialData.schwierigkeitsgrad || null,
        ergebnis_form: initialData.ergebnis_form || '',
        ergebnis_dateiformat: initialData.ergebnis_dateiformat || '',
        mission_type: initialData.mission_type || null,
      });
      setKiAnalysiert(!!initialData.erwartungshorizont);
    } else {
      setFormData(EMPTY_FORM);
      setKiAnalysiert(false);
    }
  }, [open, initialData]);

  const set = (field, val) => setFormData((p) => ({ ...p, [field]: val }));

  const isValid = !!formData.themenfeld_id && !!formData.html_code?.trim();

  const createAufgabe = useMutation({
    mutationFn: (data) =>
      createAllgemeineAufgabe({
        einheit_id: einheitId,
        anforderungsebene: defaultAnforderungsebene,
        aufgaben_typ: 'externe_html_seite',
        aufgaben_modus: 'einzeln',
        themenfeld_id: data.themenfeld_id,
        titel: data.titel || null,
        html_code: data.html_code,
        aufgabenstellung: data.aufgabenstellung || null,
        erwartungshorizont: data.erwartungshorizont || null,
        schwierigkeitsgrad: data.schwierigkeitsgrad || null,
        ergebnis_form: data.ergebnis_form || null,
        ergebnis_dateiformat: data.ergebnis_dateiformat || null,
        mission_type: data.mission_type || null,
        content_status: 'draft',
        sync_status: 'new',
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('HTML-Aufgabe erstellt!');
      onSuccess?.(result);
      onOpenChange(false);
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const updateAufgabe = useMutation({
    mutationFn: (data) =>
      updateAllgemeineAufgabe(initialData.id, {
        themenfeld_id: data.themenfeld_id,
        titel: data.titel || null,
        html_code: data.html_code,
        aufgabenstellung: data.aufgabenstellung || null,
        erwartungshorizont: data.erwartungshorizont || null,
        schwierigkeitsgrad: data.schwierigkeitsgrad || null,
        ergebnis_form: data.ergebnis_form || null,
        ergebnis_dateiformat: data.ergebnis_dateiformat || null,
        mission_type: data.mission_type || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('HTML-Aufgabe aktualisiert');
      onSuccess?.();
      onOpenChange(false);
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) {
      toast.error('Bitte ein Themenfeld und HTML-Code eingeben.');
      return;
    }
    if (initialData) updateAufgabe.mutate(formData);
    else createAufgabe.mutate(formData);
  };

  const handleKiAnalyse = async () => {
    const code = formData.html_code?.trim();
    if (!code) {
      toast.error('Bitte zuerst HTML-Code eingeben.');
      return;
    }
    setKiLaeuft(true);
    try {
      const res = await base44.functions.invoke('generateErwartungshorizontFromHtml', { htmlCode: code });
      const ergebnis = res.data;
      if (ergebnis.aufgabenstellung) set('aufgabenstellung', ergebnis.aufgabenstellung);
      if (ergebnis.erwartungshorizont) set('erwartungshorizont', ergebnis.erwartungshorizont);
      if (ergebnis.titel && !formData.titel) set('titel', ergebnis.titel);
      setKiAnalysiert(true);
      toast.success('KI-Analyse abgeschlossen. Felder wurden befüllt.');
    } catch (err) {
      toast.error('KI-Analyse fehlgeschlagen: ' + (err?.message || 'unbekannt'));
    } finally {
      setKiLaeuft(false);
    }
  };

  const isSaving = createAufgabe.isPending || updateAufgabe.isPending;
  const showMissionPicker = isMissionApplicable({ aufgaben_typ: 'externe_html_seite', anforderungsebene: defaultAnforderungsebene });

  // Größenwarnung: Base44 hat ein ~200KB Limit pro Record.
  const htmlSizeKB = Math.round((new TextEncoder().encode(formData.html_code || '').length) / 1024);
  const htmlZuGross = htmlSizeKB > 150;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{initialData ? 'HTML-Aufgabe bearbeiten' : 'Neue externe HTML-Seite'}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-300">
              Externe Seite
            </span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Bette eine externe, interaktive HTML-Seite ein (z.B. GeoGebra, LearningApps). Die Didaktik steuert die externe Seite, der Schüler bestätigt die Bearbeitung.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Themenfeld (Pflicht) */}
          {themenfelder.length > 0 && (
            <div className="space-y-2">
              <Label>
                Themenfeld <span className="text-destructive">*</span>
              </Label>
              <select
                value={formData.themenfeld_id || ''}
                onChange={(e) => set('themenfeld_id', e.target.value || null)}
                className="w-full h-9 px-3 border border-border rounded-lg text-sm bg-white"
              >
                <option value="">-- Bitte wählen --</option>
                {themenfelder.map((tf) => (
                  <option key={tf.id} value={tf.id}>
                    {tf.titel}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Titel */}
          <div className="space-y-2">
            <Label>Titel (optional)</Label>
            <Input
              value={formData.titel}
              onChange={(e) => set('titel', e.target.value)}
              placeholder="z.B. 'Quadratische Funktionen erkunden'"
            />
          </div>

          {/* HTML-Code (Pflicht) */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>HTML-Code <span className="text-destructive">*</span></span>
              {formData.html_code && (
                <span className={`text-xs font-mono ${htmlZuGross ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                  {htmlSizeKB} KB {htmlZuGross ? '– zu groß!' : ''}
                </span>
              )}
            </Label>
            <Textarea
              value={formData.html_code}
              onChange={(e) => set('html_code', e.target.value)}
              placeholder="Füge hier den kompletten HTML-Code ein (z.B. von GeoGebra generiert)..."
              rows={8}
              className={`font-mono text-xs ${htmlZuGross ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
            />
            {htmlZuGross && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                ⚠️ Der HTML-Code ist zu groß ({htmlSizeKB} KB) und kann nicht gespeichert werden (Limit: ~150 KB). Bitte kürze den Code – z.B. externe Bibliotheken per CDN-Link einbinden statt den Code einzufügen.
              </p>
            )}
          </div>

          {/* Aufgabenstellung (optional) */}
          <div className="space-y-2">
            <Label>Aufgabenstellung (optional)</Label>
            <Textarea
              value={formData.aufgabenstellung}
              onChange={(e) => set('aufgabenstellung', e.target.value)}
              placeholder="Was sollen die Schüler auf dieser HTML-Seite tun?"
              rows={3}
            />
          </div>

          {/* KI-Analyse-Button */}
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleKiAnalyse}
              disabled={kiLaeuft || !formData.html_code?.trim()}
              className="gap-2 border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            >
              {kiLaeuft ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> KI analysiert HTML...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Erwartungshorizont per KI generieren</>
              )}
            </Button>
            {kiAnalysiert && (
              <span className="ml-3 text-xs text-green-600 font-medium">✓ Analyse abgeschlossen</span>
            )}
          </div>

          {/* Erwartungshorizont */}
          <div className="space-y-2">
            <Label>Erwartungshorizont (optional)</Label>
            <Textarea
              value={formData.erwartungshorizont}
              onChange={(e) => set('erwartungshorizont', e.target.value)}
              placeholder="Welche Gelingensbedingungen muss der Schüler erfüllen? Kann per KI aus dem HTML generiert werden."
              rows={4}
            />
          </div>

          {/* Schwierigkeitsgrad */}
          <div className="space-y-2">
            <Label>Schwierigkeitsgrad (optional)</Label>
            <div className="flex gap-3">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set('schwierigkeitsgrad', formData.schwierigkeitsgrad === n ? null : n)}
                  className={`px-4 py-1.5 rounded-lg border text-sm transition-colors ${
                    formData.schwierigkeitsgrad === n
                      ? 'border-teal-400 bg-teal-50 text-teal-700 font-semibold'
                      : 'border-border bg-white text-muted-foreground hover:border-teal-300'
                  }`}
                >
                  {n === 1 ? '★' : n === 2 ? '★★' : '★★★'}
                </button>
              ))}
            </div>
          </div>

          {/* Ergebnisform + Dateiformat */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ergebnisform (optional)</Label>
              <select
                value={formData.ergebnis_form || ''}
                onChange={(e) => set('ergebnis_form', e.target.value || null)}
                className="w-full h-9 px-3 border border-border rounded-lg text-sm bg-white"
              >
                <option value="">-- Optional --</option>
                <option value="Fließtext / Essay">Fließtext / Essay</option>
                <option value="Tabelle / Matrix">Tabelle / Matrix</option>
                <option value="Präsentation / Folien">Präsentation / Folien</option>
                <option value="Schema / Konzept-Map / Zeichnung">Schema / Konzept-Map / Zeichnung</option>
                <option value="Stichpunktartige Übersicht">Stichpunktartige Übersicht</option>
                <option value="Mischform / Offen">Mischform / Offen</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Dateiformat (optional)</Label>
              <select
                value={formData.ergebnis_dateiformat || ''}
                onChange={(e) => set('ergebnis_dateiformat', e.target.value || null)}
                className="w-full h-9 px-3 border border-border rounded-lg text-sm bg-white"
              >
                <option value="">-- Optional --</option>
                <option value="Textdokument (Word/PDF)">Textdokument (Word/PDF)</option>
                <option value="Bilddatei (JPG/PNG)">Bilddatei (JPG/PNG)</option>
                <option value="Präsentationsdatei (PowerPoint/PDF)">Präsentationsdatei (PowerPoint/PDF)</option>
                <option value="Offen / Beliebig">Offen / Beliebig</option>
              </select>
            </div>
          </div>

          {/* Mission */}
          {showMissionPicker && (
            <div className="pt-2 border-t border-border">
              <MissionPicker
                value={formData.mission_type}
                onChange={(id) => set('mission_type', id)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSaving || !isValid || htmlZuGross} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird gespeichert…
                </>
              ) : initialData ? (
                <>
                  <Save className="w-4 h-4" />
                  Speichern
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Aufgabe erstellen
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}