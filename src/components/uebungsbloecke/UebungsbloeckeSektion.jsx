import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Boxes, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UebungsblockErstellenModal from './UebungsblockErstellenModal';
import { istUebungsblock } from '@/lib/einheitFormat';

/**
 * UebungsbloeckeSektion
 * ─────────────────────
 * Der Bereich „Meine Übungsblöcke" in der privaten Bibliothek — getrennt von
 * Einheiten und Unterrichtsstunden, weil es ein eigenes Arbeitsformat ist.
 *
 * Technisch sind Übungsblöcke private Einheiten mit `format: 'uebungsblock'`.
 * Sie kommen deshalb aus derselben Abfrage wie die Einheiten und werden hier
 * nur herausgefiltert — eine zweite Abfrage wäre unnötig.
 *
 * Aus demselben Grund muss die Einheiten-Liste sie AUSSCHLIESSEN, sonst
 * stünden sie doppelt da. Das erledigt der Aufrufer.
 */
export default function UebungsbloeckeSektion({ einheiten = [], besitzerEmail }) {
  const [erstellenOffen, setErstellenOffen] = useState(false);

  const bloecke = useMemo(
    () => einheiten.filter(istUebungsblock),
    [einheiten],
  );

  // Nach Fach gruppiert — bei kleinen Formaten sammeln sich schnell viele an.
  const nachFach = useMemo(() => {
    const map = {};
    bloecke.forEach((b) => {
      const fach = b.fach || 'Ohne Fach';
      (map[fach] = map[fach] || []).push(b);
    });
    return map;
  }, [bloecke]);
  const faecher = Object.keys(nachFach).sort((a, b) => a.localeCompare(b, 'de'));

  return (
    <div className="rounded-xl border-2 border-violet-300 bg-violet-50/60 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Boxes className="w-4 h-4 text-violet-600" />
            Meine Übungsblöcke
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kleines Format für die Poolzeit: ein Thema, ein paar Lernpakete und Aufgaben — schnell
            gebaut und direkt für die Schüler:innen freischaltbar.
          </p>
        </div>
        <Button size="sm" onClick={() => setErstellenOffen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Neuer Übungsblock
        </Button>
      </div>

      {bloecke.length === 0 ? (
        <p className="text-sm text-muted-foreground italic px-1 py-3">
          Noch keine Übungsblöcke. Legen Sie den ersten an — das dauert keine zwei Minuten.
        </p>
      ) : (
        <div className="space-y-4">
          {faecher.map((fach) => (
            <div key={fach} className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {fach}
              </p>
              {nachFach[fach].map((b) => (
                <Link
                  key={b.id}
                  to={`/workspace?einheit=${b.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {b.titel_der_einheit || 'Ohne Titel'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Jahrgang {b.jahrgangsstufe || '—'}
                    </p>
                  </div>
                  {b.last_exported_at ? (
                    <Badge variant="secondary" className="text-[10px] shrink-0">In Moodle</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] shrink-0">Entwurf</Badge>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}

      <UebungsblockErstellenModal
        open={erstellenOffen}
        onOpenChange={setErstellenOffen}
        besitzerEmail={besitzerEmail}
      />
    </div>
  );
}
