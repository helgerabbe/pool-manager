/**
 * HandlungAufgabeView.jsx
 *
 * Verschlankter Dialog für Handlungsaufgaben (physische Aufgaben ohne KI-Tutor).
 * Enthält nur das Nötigste: Themenfeld (Pflicht), Titel, Aufgabenstellung,
 * Foto, Material-Hinweise, Ergebnisform, Mission.
 *
 * KEIN Erwartungshorizont, KEIN KI-Tutor-Prompt, KEINE Lernzielanalyse.
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAllgemeineAufgabe, updateAllgemeineAufgabe } from '@/services/AllgemeineAufgabeService';
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
import { Save, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import MissionPicker from '@/components/missionen/MissionPicker';
import { isMissionApplicable } from '@/lib/missionen';
import AufgabenstellungDateiUpload from './AufgabenstellungDateiUpload';

const EMPTY_FORM = {
  themenfeld_id: null,
  titel: '',
  aufgabenstellung: '',
  aufgaben_bild_url: '',
  hinweise_zum_material: '',
  aufgabenstellung_datei_url: '',
  aufgabenstellung_datei_name: '',
  mission_type: null,
};

export default function HandlungAufgabeView({
  open,
  onOpenChange,
  einheitId,
  themenfelder = [],
  onSuccess,
  initialData = null,
  defaultAnforderungsebene = '2 - Transfer',
  // Vorbelegtes Themenfeld beim Erstellen (z. B. aus der Themenfeld-Übersicht).
  defaultThemenfeldId = null,
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setFormData({
        themenfeld_id: initialData.themenfeld_id || null,
        titel: initialData.titel || '',
        aufgabenstellung: initialData.aufgabenstellung || '',
        aufgaben_bild_url: initialData.aufgaben_bild_url || '',
        hinweise_zum_material: initialData.hinweise_zum_material || '',
        aufgabenstellung_datei_url: initialData.aufgabenstellung_datei_url || '',
        aufgabenstellung_datei_name: initialData.aufgabenstellung_datei_name || '',
        mission_type: initialData.mission_type || null,
      });
    } else {
      setFormData({ ...EMPTY_FORM, themenfeld_id: defaultThemenfeldId || null });
    }
  }, [open, initialData, defaultThemenfeldId]);

  const set = (field, val) => setFormData((p) => ({ ...p, [field]: val }));

  const isValid = !!formData.themenfeld_id;

  const createAufgabe = useMutation({
    mutationFn: (data) =>
      createAllgemeineAufgabe({
        einheit_id: einheitId,
        anforderungsebene: defaultAnforderungsebene,
        aufgaben_typ: 'handlung',
        aufgaben_modus: 'einzeln',
        themenfeld_id: data.themenfeld_id,
        titel: data.titel || null,
        aufgabenstellung: data.aufgabenstellung || null,
        aufgaben_bild_url: data.aufgaben_bild_url || null,
        hinweise_zum_material: data.hinweise_zum_material || null,
        aufgabenstellung_datei_url: data.aufgabenstellung_datei_url || null,
        aufgabenstellung_datei_name: data.aufgabenstellung_datei_name || null,
        mission_type: data.mission_type || null,
        content_status: 'draft',
        sync_status: 'new',
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('Handlungsaufgabe erstellt!');
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
        aufgabenstellung: data.aufgabenstellung || null,
        aufgaben_bild_url: data.aufgaben_bild_url || null,
        hinweise_zum_material: data.hinweise_zum_material || null,
        aufgabenstellung_datei_url: data.aufgabenstellung_datei_url || null,
        aufgabenstellung_datei_name: data.aufgabenstellung_datei_name || null,
        mission_type: data.mission_type || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('Handlungsaufgabe aktualisiert');
      onSuccess?.();
      onOpenChange(false);
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) {
      toast.error('Bitte ein Themenfeld auswählen.');
      return;
    }
    if (initialData) updateAufgabe.mutate(formData);
    else createAufgabe.mutate(formData);
  };

  const isSaving = createAufgabe.isPending || updateAufgabe.isPending;
  const showMissionPicker = isMissionApplicable({ aufgaben_typ: 'handlung', anforderungsebene: defaultAnforderungsebene });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{initialData ? 'Handlungsaufgabe bearbeiten' : 'Neue Handlungsaufgabe'}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
              Physische Aufgabe
            </span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Eine Aufgabe, die Schüler mit physischem Material in der Realität bearbeiten – ohne KI-Tutor.
          </p>
        </DialogHeader>

        {/* Lehrer-Hinweis: So ist die Handlungsaufgabe gedacht */}
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed space-y-1">
            <p className="font-semibold">So funktioniert eine Handlungsaufgabe:</p>
            <p>
              Sie findet im echten Leben statt: Das Material und der Aufgabenzettel liegen
              im Fachraum bereit. Die Schüler bearbeiten die Aufgabe dort und <strong>zeigen
              ihr Ergebnis anschließend kurz der Lehrkraft vor</strong> – eine digitale
              Abgabe ist hier bewusst nicht vorgesehen.
            </p>
          </div>
        </div>

        {/* Hinweis: das sieht der Schüler später */}
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 leading-relaxed">
            <p className="font-semibold mb-0.5">Das sieht der Schüler beim Abschluss:</p>
            <p className="italic">
              „Zeig dein Ergebnis jetzt bitte einmal kurz deiner Lehrkraft vor und
              räume die Materialien wieder sauber weg – der Nächste möchte auch damit
              arbeiten."
            </p>
          </div>
        </div>

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
              placeholder="z.B. 'Kartoffel-Experiment durchführen'"
            />
          </div>

          {/* Aufgabenstellung (optional) */}
          <div className="space-y-2">
            <Label>Aufgabenstellung (optional)</Label>
            <Textarea
              value={formData.aufgabenstellung}
              onChange={(e) => set('aufgabenstellung', e.target.value)}
              placeholder="Was sollen die Schüler tun? (Kann auch auf einer laminierten Karte stehen)"
              rows={4}
            />
          </div>

          {/* Foto vom Material */}
          <div className="space-y-2">
            <Label>Foto / Bild (optional)</Label>
            <Input
              value={formData.aufgaben_bild_url}
              onChange={(e) => set('aufgaben_bild_url', e.target.value)}
              placeholder="https://... URL zu einem Foto des Materials"
            />
            {formData.aufgaben_bild_url && (
              <img
                src={formData.aufgaben_bild_url}
                alt="Vorschau"
                className="max-h-32 rounded-lg border border-border object-contain bg-muted/20"
              />
            )}
          </div>

          {/* Material-Hinweise (wo findet der Schüler was?) */}
          <div className="space-y-2">
            <Label>Hinweise zum Material (optional)</Label>
            <Textarea
              value={formData.hinweise_zum_material}
              onChange={(e) => set('hinweise_zum_material', e.target.value)}
              placeholder="z.B. 'Im Karton unter dem Tisch, mit der Aufschrift Klasse 8b'"
              rows={3}
            />
          </div>

          {/* Aufgabenstellung als Datei (optional, digitale Sicherung) */}
          <div className="space-y-2 border-t border-border pt-4">
            <Label>Aufgabenstellung als Datei (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Normalerweise liegt der Aufgabenzettel direkt beim Material. Du kannst die
              Aufgabenstellung hier zusätzlich als PDF, Doc oder Bild hochladen – damit der
              Schüler sie auch digital nachlesen kann, falls der Zettel mal verloren geht.
            </p>
            <AufgabenstellungDateiUpload
              fileUrl={formData.aufgabenstellung_datei_url}
              fileName={formData.aufgabenstellung_datei_name}
              onChange={({ url, name }) => {
                set('aufgabenstellung_datei_url', url);
                set('aufgabenstellung_datei_name', name);
              }}
            />
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
            <Button type="submit" disabled={isSaving || !isValid} className="gap-2">
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