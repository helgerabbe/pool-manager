import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAllgemeineAufgabe,
  updateAllgemeineAufgabe,
} from '@/services/AllgemeineAufgabeService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAufgabenTyp } from '@/lib/aufgabenTypen';
import AufgabeLockBanner from '@/components/allgemeineAufgaben/AufgabeLockBanner';
import { useAufgabeLock } from '@/hooks/useAufgabeLock';

// Typ-spezifische Sub-Komponenten — die App reduziert die Aufgaben-Typen in
// Ebene 2 auf 'inhalt' (Brian-Aufgabe) und 'handlung' (Handlungsaufgabe);
// die früheren Typen Bündel/Prozess/Projekt-Anker leben jetzt im
// Lernpfad-Dashboard als System-Bausteine bzw. Bündel-Items.
import InhaltSection from '@/components/allgemeineAufgaben/aufgabeSections/InhaltSection';
import HandlungSection from '@/components/allgemeineAufgaben/aufgabeSections/HandlungSection';

// ── Default-Form ──────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  titel: '',
  aufgabenstellung: '',
  aufgaben_bild_url: '',
  schwierigkeitsgrad: null,
  themenfeld_id: null,
  materialien: [],
  ergebnis_form: '',
  ergebnis_dateiformat: '',
  erwartungshorizont: '',
  aufgaben_typ: 'inhalt',
  hinweise_zum_material: '',
};

// ── Validierung pro Aufgaben-Typ ──────────────────────────────────────────────
function validateForm(formData) {
  const typ = formData.aufgaben_typ || 'inhalt';
  if (typ === 'handlung') return !!formData.aufgabenstellung?.trim();
  // 'inhalt' (default): Text ODER Bild
  return !!(formData.aufgabenstellung?.trim() || formData.aufgaben_bild_url);
}

function invalidMessageForType(typ) {
  if (typ === 'handlung') return 'Bitte einen Aufgabentext / Auftrag eingeben.';
  return 'Bitte Text eingeben oder Bild hochladen.';
}

// ── Payload-Builder: nur die für den Typ relevanten Felder ────────────────────
function buildPayload(formData, einheitId, defaultAnforderungsebene, isUpdate) {
  // Legacy-Typen (buendel/prozess/projekt_anker/auswahl_buendel) werden beim
  // Bearbeiten transparent auf 'inhalt' migriert — der Picker bietet sie
  // nicht mehr an.
  const typ = formData.aufgaben_typ === 'handlung' ? 'handlung' : 'inhalt';
  const base = {
    aufgaben_typ: typ,
    themenfeld_id: formData.themenfeld_id || null,
    titel: formData.titel || null,
    aufgabenstellung: formData.aufgabenstellung || '',
  };
  if (!isUpdate) {
    base.einheit_id = einheitId;
    base.anforderungsebene = defaultAnforderungsebene;
  }

  if (typ === 'handlung') {
    return {
      ...base,
      hinweise_zum_material: formData.hinweise_zum_material || '',
    };
  }
  // 'inhalt'
  return {
    ...base,
    aufgaben_bild_url: formData.aufgaben_bild_url || null,
    schwierigkeitsgrad: formData.schwierigkeitsgrad || null,
    materialien: formData.materialien || [],
    ergebnis_form: formData.ergebnis_form || null,
    ergebnis_dateiformat: formData.ergebnis_dateiformat || null,
    erwartungshorizont: formData.erwartungshorizont || null,
  };
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function AufgabeCreateView({
  open,
  onOpenChange,
  einheitId,
  themenfelder = [],
  onSuccess,
  initialData = null,
  defaultAnforderungsebene = '2 - Transfer',
  defaultAufgabenTyp = 'inhalt',
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [bildUploading, setBildUploading] = useState(false);
  const [materialUploading, setMaterialUploading] = useState(false);
  const isUploading = bildUploading || materialUploading;

  // Form bei Öffnen/Initial-Daten neu aufsetzen.
  // Wichtig: `initialData` aus der DB kann typ-fremde Felder als `null`
  // enthalten (z. B. `aufgabenstellung: null` bei einem Buendel). Damit
  // controlled <textarea>/<input>-Felder nicht in den uncontrolled-Modus
  // rutschen, mergen wir nicht-leere Felder über die EMPTY_FORM-Defaults
  // (die garantiert Strings/Arrays liefern).
  useEffect(() => {
    if (!open) return;
    if (initialData) {
      const sanitized = Object.fromEntries(
        Object.entries(initialData).filter(([, v]) => v !== null && v !== undefined)
      );
      // Legacy-Typen transparent als 'inhalt' behandeln — alte Datensätze
      // verlieren so im Editor nichts, werden beim nächsten Speichern aber
      // als 'inhalt' abgelegt (Migrationsfunktion existiert zusätzlich).
      const rawTyp = initialData.aufgaben_typ;
      const safeTyp = rawTyp === 'handlung' ? 'handlung' : 'inhalt';
      setFormData({
        ...EMPTY_FORM,
        ...sanitized,
        aufgaben_typ: safeTyp,
      });
    } else {
      const safeDefault = defaultAufgabenTyp === 'handlung' ? 'handlung' : 'inhalt';
      setFormData({ ...EMPTY_FORM, aufgaben_typ: safeDefault });
    }
  }, [open, initialData, defaultAufgabenTyp]);

  const set = (field, val) => setFormData((p) => ({ ...p, [field]: val }));

  const isValid = validateForm(formData);
  const aufgabenTypMeta = getAufgabenTyp(formData.aufgaben_typ);

  // ── Lock-Check ──────────────────────────────────────────────────────────────
  const { data: lockInfo } = useAufgabeLock(initialData?.id);
  const isLocked = !!lockInfo?.locked;
  const isReadOnly = isLocked;

  // ── Mutationen ──────────────────────────────────────────────────────────────
  const createAufgabe = useMutation({
    mutationFn: (data) =>
      createAllgemeineAufgabe(buildPayload(data, einheitId, defaultAnforderungsebene, false)),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('Aufgabe erstellt!');
      onSuccess?.(result);
      onOpenChange(false);
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const updateAufgabe = useMutation({
    mutationFn: (data) =>
      updateAllgemeineAufgabe(
        initialData.id,
        buildPayload(data, einheitId, defaultAnforderungsebene, true)
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('Aufgabe aktualisiert');
      onSuccess?.();
      onOpenChange(false);
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error('Diese Aufgabe ist gesperrt – bitte den Pfad zuerst entsperren.');
      return;
    }
    if (!isValid) {
      toast.error(invalidMessageForType(formData.aufgaben_typ));
      return;
    }
    if (initialData) updateAufgabe.mutate(formData);
    else createAufgabe.mutate(formData);
  };

  const isSaving = createAufgabe.isPending || updateAufgabe.isPending;
  const typ = formData.aufgaben_typ || 'inhalt';

  // ── Dispatcher: typ-spezifische Section rendern ─────────────────────────────
  const renderTypSection = () => {
    if (typ === 'handlung') {
      return (
        <HandlungSection
          formData={formData}
          set={set}
          beschreibung={formData.aufgabenstellung}
          onBeschreibung={(val) => set('aufgabenstellung', val)}
        />
      );
    }
    return (
      <InhaltSection
        formData={formData}
        set={set}
        onBildUploadingChange={setBildUploading}
        onMaterialUploadingChange={setMaterialUploading}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{initialData ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${aufgabenTypMeta.color.bg} ${aufgabenTypMeta.color.text} border ${aufgabenTypMeta.color.border}/40`}
            >
              <aufgabenTypMeta.icon className="w-3 h-3" />
              {aufgabenTypMeta.label}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isLocked && <AufgabeLockBanner byPfade={lockInfo.by_pfade} />}

          <fieldset disabled={isReadOnly} className="space-y-5 disabled:opacity-70">
            {/* Themenfeld – für alle Typen */}
            {themenfelder.length > 0 && (
              <div className="space-y-2">
                <Label>Themenfeld (optional)</Label>
                <select
                  value={formData.themenfeld_id || ''}
                  onChange={(e) => set('themenfeld_id', e.target.value || null)}
                  className="w-full h-9 px-3 border border-border rounded-lg text-sm bg-white"
                >
                  <option value="">-- Kein Themenfeld --</option>
                  {themenfelder.map((tf) => (
                    <option key={tf.id} value={tf.id}>
                      {tf.titel}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Titel – für alle Typen */}
            <div className="space-y-2">
              <Label>Titel (optional)</Label>
              <Input
                value={formData.titel}
                onChange={(e) => set('titel', e.target.value)}
                placeholder="z.B. 'Energieflussdiagramm analysieren'"
              />
            </div>

            {/* Typ-spezifische Section */}
            {renderTypSection()}
          </fieldset>

          <DialogFooter>
            {isUploading && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 mr-auto">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Datei wird hochgeladen – bitte warten…
              </span>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {isReadOnly ? 'Schließen' : 'Abbrechen'}
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !isValid || isUploading || isReadOnly}
              className="gap-2"
            >
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
                  Speichern & Weiter
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}