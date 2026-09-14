import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Layers, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SchnellAnlegenDialog from './SchnellAnlegenDialog';
import FachStundenListe from './FachStundenListe';
import FachBloeckeListe from './FachBloeckeListe';
import {
  useStundeAnlegen, useUebungsblockAnlegen, useEinheitUmbenennen,
} from '@/hooks/useFachEinheitInhalte';

/**
 * EINE Einheit als Container: darin liegen ihre Unterrichtsstunden und ihre
 * Übungsblöcke. Lehrkräfte arbeiten thematisch — „Deutsch 9, Rechtschreibung" —
 * und legen von hier aus alles Weitere an, ohne Fach, Jahrgang oder Einheit
 * noch einmal auswählen zu müssen.
 */
export default function FachEinheitKarte({ einheit, stunden = [], bloecke = [], besitzerEmail }) {
  const [stundeOffen, setStundeOffen] = useState(false);
  const [blockOffen, setBlockOffen] = useState(false);
  const [umbenennenOffen, setUmbenennenOffen] = useState(false);

  const stundeAnlegen = useStundeAnlegen(einheit, besitzerEmail);
  const blockAnlegen = useUebungsblockAnlegen(einheit, besitzerEmail);
  const umbenennen = useEinheitUmbenennen();

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            <h2 className="text-base font-bold text-foreground truncate">
              {einheit.titel_der_einheit || 'Ohne Titel'}
            </h2>
            <button
              type="button"
              onClick={() => setUmbenennenOffen(true)}
              title="Einheit umbenennen"
              className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stunden.length} Stunde{stunden.length !== 1 ? 'n' : ''} ·{' '}
            {bloecke.length} {bloecke.length !== 1 ? 'Übungsblöcke' : 'Übungsblock'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to={`/workspace?einheit=${einheit.id}`}>
              <ExternalLink className="w-4 h-4" /> Einheit öffnen
            </Link>
          </Button>
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

      <SchnellAnlegenDialog
        open={stundeOffen}
        onOpenChange={setStundeOffen}
        titel={`Neue Stunde in „${einheit.titel_der_einheit}"`}
        label="Arbeitstitel der Stunde *"
        platzhalter="z. B. Einstieg Groß- und Kleinschreibung"
        hinweis="Fach, Jahrgang und Einheit stehen schon fest."
        aktionText="Stunde anlegen"
        laeuft={stundeAnlegen.isPending}
        onSubmit={(name, reset) => stundeAnlegen.mutate(name, {
          onSuccess: () => { reset(); setStundeOffen(false); },
        })}
      />

      <SchnellAnlegenDialog
        open={blockOffen}
        onOpenChange={setBlockOffen}
        titel={`Neuer Übungsblock in „${einheit.titel_der_einheit}"`}
        label="Titel des Übungsblocks *"
        platzhalter="z. B. Wortstämme erkennen"
        hinweis="Fach, Jahrgang und Einheit stehen schon fest."
        aktionText="Übungsblock anlegen"
        laeuft={blockAnlegen.isPending}
        onSubmit={(name, reset) => blockAnlegen.mutate(name, {
          onSuccess: () => { reset(); setBlockOffen(false); },
        })}
      />

      <SchnellAnlegenDialog
        open={umbenennenOffen}
        onOpenChange={setUmbenennenOffen}
        titel="Einheit umbenennen"
        label="Neuer Name der Einheit *"
        platzhalter={einheit.titel_der_einheit}
        aktionText="Speichern"
        laeuft={umbenennen.isPending}
        onSubmit={(name, reset) => umbenennen.mutate({ id: einheit.id, titel: name }, {
          onSuccess: () => { reset(); setUmbenennenOffen(false); },
        })}
      />
    </div>
  );
}