import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SchnellAnlegenDialog from './SchnellAnlegenDialog';
import AnlegenMitWizardDialog from './AnlegenMitWizardDialog';
import FachStundenListe from './FachStundenListe';
import FachBloeckeListe from './FachBloeckeListe';
import FachEinheitLoeschenButton from './FachEinheitLoeschenButton';
import {
  useStundeAnlegen, useUebungsblockAnlegen, useUnterrichtseinheitUmbenennen,
} from '@/hooks/useFachEinheitInhalte';

/**
 * EINE Unterrichtseinheit als Mappe: darin liegen ihre Unterrichtsstunden und
 * ihre Übungsblöcke. Lehrkräfte arbeiten thematisch — „Deutsch 9,
 * Rechtschreibung" — und legen von hier aus alles Weitere an, ohne Fach,
 * Jahrgang oder Mappe noch einmal auswählen zu müssen.
 *
 * Eine Unterrichtseinheit ist NICHT eine „Einheit" im Sinne des vollständigen
 * Lernszenarios (Dashboards, Freigabe, Moodle-Kurs) — sie ist reine Ordnung.
 */
export default function FachEinheitKarte({ unterrichtseinheit, stunden = [], bloecke = [], besitzerEmail }) {
  const [stundeOffen, setStundeOffen] = useState(false);
  const [blockOffen, setBlockOffen] = useState(false);
  const [umbenennenOffen, setUmbenennenOffen] = useState(false);
  const navigate = useNavigate();

  const stundeAnlegen = useStundeAnlegen(unterrichtseinheit, besitzerEmail);
  const blockAnlegen = useUebungsblockAnlegen(unterrichtseinheit, besitzerEmail);
  const umbenennen = useUnterrichtseinheitUmbenennen();

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            <h2 className="text-base font-bold text-foreground truncate">
              {unterrichtseinheit.titel || 'Ohne Titel'}
            </h2>
            <button
              type="button"
              onClick={() => setUmbenennenOffen(true)}
              title="Unterrichtseinheit umbenennen"
              className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {stunden.length === 0 && bloecke.length === 0 && (
              <FachEinheitLoeschenButton unterrichtseinheit={unterrichtseinheit} />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stunden.length} Stunde{stunden.length !== 1 ? 'n' : ''} ·{' '}
            {bloecke.length} {bloecke.length !== 1 ? 'Übungsblöcke' : 'Übungsblock'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setStundeOffen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Neue Stunde
          </Button>
          <Button size="sm" onClick={() => setBlockOffen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Neuer Übungsblock
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Unterrichtsstunden
        </p>
        <FachStundenListe stunden={stunden} />
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Übungsblöcke
        </p>
        <FachBloeckeListe bloecke={bloecke} />
      </div>

      <AnlegenMitWizardDialog
        open={stundeOffen}
        onOpenChange={setStundeOffen}
        titel={`Neue Stunde in „${unterrichtseinheit.titel}"`}
        label="Arbeitstitel der Stunde *"
        platzhalter="z. B. Einstieg Groß- und Kleinschreibung"
        hinweis="Fach, Jahrgang und Unterrichtseinheit stehen schon fest."
        wizardText="Mit KI-Generator planen"
        selbstText="Phasen selbst anlegen"
        laeuft={stundeAnlegen.isPending}
        onSubmit={(name, weg, reset) => stundeAnlegen.mutate(name, {
          onSuccess: (stunde) => {
            reset();
            setStundeOffen(false);
            navigate(`/unterrichtsstunde/${stunde.id}${weg === 'selbst' ? '?tab=regieblatt' : ''}`);
          },
        })}
      />

      {/* Übungsblock: bewusst OHNE KI-Assistenten. Die Lehrkraft weiß beim
          Anlegen meist schon, welche Übung sie will — die Assistenten
          (Lernpaket bzw. Aufgabe) folgen erst im Workspace, gezielt. */}
      <SchnellAnlegenDialog
        open={blockOffen}
        onOpenChange={setBlockOffen}
        titel={`Neuer Übungsblock in „${unterrichtseinheit.titel}"`}
        label="Titel des Übungsblocks *"
        platzhalter="z. B. Wortstämme erkennen"
        hinweis="Fach, Jahrgang und Unterrichtseinheit stehen schon fest."
        aktionText="Übungsblock anlegen"
        laeuft={blockAnlegen.isPending}
        onSubmit={(name, reset) => blockAnlegen.mutate(name, {
          onSuccess: (block) => {
            reset();
            setBlockOffen(false);
            navigate(`/workspace?einheit=${block.id}`);
          },
        })}
      />

      <SchnellAnlegenDialog
        open={umbenennenOffen}
        onOpenChange={setUmbenennenOffen}
        titel="Unterrichtseinheit umbenennen"
        label="Neuer Name *"
        platzhalter={unterrichtseinheit.titel}
        aktionText="Speichern"
        laeuft={umbenennen.isPending}
        onSubmit={(name, reset) => umbenennen.mutate({ id: unterrichtseinheit.id, titel: name }, {
          onSuccess: () => { reset(); setUmbenennenOffen(false); },
        })}
      />
    </div>
  );
}