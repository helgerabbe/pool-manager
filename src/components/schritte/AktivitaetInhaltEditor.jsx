import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, CheckCircle2 } from 'lucide-react';
import LueckentextWysiwygModal from '@/components/workspace/LueckentextWysiwygModal';
import SortingListModal from '@/components/workspace/SortingListModal';
import MatchTermsModal from '@/components/workspace/MatchTermsModal';
import MiniQuizModalDetail from '@/components/workspace/MiniQuizModalDetail';
import MultipleChoiceModalDetail from '@/components/workspace/MultipleChoiceModalDetail';
import TestModal from '@/components/workspace/TestModal';
import KITutorModalDetail from '@/components/workspace/KITutorModalDetail';
import ImageLabelingModalDetail from '@/components/workspace/ImageLabelingModalDetail';
import OffeneAufgabeModal from '@/components/workspace/OffeneAufgabeModal';
import ActivityContentForm from '@/components/workspace/ActivityContentForm';
import GalerieAktivitaetModal from '@/components/workspace/galerie/GalerieAktivitaetModal';
import { editorTyp, editorKnopfText } from '@/lib/aktivitaetEditorMap';
import { FreigabeAusblenden } from '@/components/workspace/ReleaseStatusToggle';

/**
 * AktivitaetInhaltEditor
 * ──────────────────────
 * „Miniquiz jetzt erstellen" — öffnet den Editor, den es für dieses
 * Aufgabenformat ohnehin schon gibt, und schreibt das Ergebnis zurück.
 *
 * Der Sinn: Ein Miniquiz wird überall gleich gebaut, egal ob es in einem
 * Lernpaket, im Regieblatt einer Stunde oder als Schritt einer allgemeinen
 * Aufgabe landet. Der Editor gehört zum FORMAT, nicht zum Ort. Diese
 * Komponente ist der Adapter dazwischen: Sie kennt die Editoren, der Aufrufer
 * kennt nur `fieldValues` und `onChange`.
 *
 * Alle Editoren haben denselben Vertrag: `initialData` hinein,
 * `onSave(fieldValues)` heraus.
 *
 * Keine Freigabe hier: Die Editoren bringen einen Schalter „Entwurf / für
 * Export freigegeben" mit. Der gehoert in die Welt der Lernpakete, wo eine
 * einzelne Aktivitaet freigegeben wird. Eine allgemeine Aufgabe wird dagegen
 * ALS GANZES freigegeben — die einzelnen Schritte darin einzeln freizugeben
 * waere umstaendlich und ergaebe keinen Sinn. Der Schalter wird deshalb
 * ausgeblendet (siehe FreigabeAusblenden).
 *
 * Verschachtelung: Diese Editoren sind selbst Dialoge. Werden sie aus einem
 * Dialog heraus geöffnet (Schritt-Fenster der Werkstatt), rechnen sie ihre
 * Ebene automatisch aus — siehe ui/dialog.jsx. Nichts zu übergeben.
 */
export default function AktivitaetInhaltEditor({
  katalogEntry,
  fieldValues = {},
  onChange,
  kontext = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const typ = editorTyp(katalogEntry?.name);
  const hatInhalt = Object.keys(fieldValues || {}).length > 0;

  const schliessen = (istOffen) => { if (!istOffen) setOpen(false); };

  // Die Editoren geben teils mehr zurück als reine Feldwerte (content_status);
  // das gehört zur Aktivität, nicht in die Feldwerte des Schritts.
  const speichern = (neueDaten) => {
    const { content_status, ...fv } = neueDaten || {};
    onChange({ ...fieldValues, ...fv });
    setOpen(false);
  };

  const gemeinsam = {
    open,
    onOpenChange: schliessen,
    initialData: fieldValues,
    isSaving: false,
    onSave: speichern,
    onCancel: () => setOpen(false),
  };

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
        <p className="text-sm font-semibold text-blue-900">
          Inhalt für „{katalogEntry?.name}"
        </p>
        <p className="mt-0.5 text-xs text-blue-800/80 inline-flex items-center gap-1">
          {hatInhalt
            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Ausgearbeitet — jederzeit änderbar.</>
            : 'Noch kein Inhalt hinterlegt.'}
        </p>
        <Button
          size="sm"
          className="mt-2 w-full gap-2"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          <Pencil className="w-3.5 h-3.5" />
          {editorKnopfText(katalogEntry?.name, hatInhalt)}
        </Button>
      </div>

      <FreigabeAusblenden>
      {typ === 'lueckentext' && <LueckentextWysiwygModal {...gemeinsam} />}
      {typ === 'sortierung' && <SortingListModal {...gemeinsam} />}
      {typ === 'match' && <MatchTermsModal {...gemeinsam} />}
      {typ === 'quiz' && <MiniQuizModalDetail {...gemeinsam} />}
      {typ === 'mc' && <MultipleChoiceModalDetail {...gemeinsam} />}
      {typ === 'test' && <TestModal {...gemeinsam} />}
      {typ === 'kitutor' && <KITutorModalDetail {...gemeinsam} />}
      {typ === 'bild' && <ImageLabelingModalDetail {...gemeinsam} />}
      {typ === 'offen' && <OffeneAufgabeModal {...gemeinsam} />}
      {typ === 'galerie' && (
        <GalerieAktivitaetModal
          open={open}
          onOpenChange={schliessen}
          initialFieldValues={fieldValues}
          kontext={kontext}
          onCancel={() => setOpen(false)}
          onSave={speichern}
        />
      )}
      {typ === 'generisch' && (
        <ActivityContentForm
          open={open}
          onOpenChange={schliessen}
          aktivitaet={katalogEntry}
          initialData={fieldValues}
          onSave={({ content_data }) => speichern(content_data)}
        />
      )}
      </FreigabeAusblenden>
    </div>
  );
}
