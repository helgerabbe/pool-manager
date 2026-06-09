import { CheckCircle2, Loader2, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLeseEinstellungen } from '@/hooks/useLeseEinstellungen';
import { getAktivitaetComicBild } from '@/lib/aktivitaetComicBilder';
import LeseSchriftgroesseToggle from './LeseSchriftgroesseToggle';
import LesetextDarstellung from './LesetextDarstellung';

/**
 * Schüler-Aktivität „Text lesen".
 *
 * Bei dieser Aktivität ist Scrollen ausdrücklich erlaubt – lange Lesetexte
 * sollen vollständig dargestellt werden (vom Nutzer freigegebene Ausnahme von
 * der „eine Seite"-Regel). Das eigentliche Lese-Layout (Absätze, Überschriften,
 * Zeilenlänge, Zeilenhöhe, wählbare Schriftgröße) übernimmt die wiederverwendbare
 * Komponente `LesetextDarstellung` zusammen mit `LeseSchriftgroesseToggle`.
 *
 * Kopfzeile (Phase/Titel/Zurück) wird bewusst NICHT gerendert – diese
 * Informationen liest der Schüler aus dem Menübaum/der Navigation ab. Stattdessen
 * bildet ein kompakter blauer Aufgabenstellungs-Streifen (kleines Comic-Idiom +
 * Aufgabentext) ganz oben den festen Wiedererkennungs-Anker.
 */
export default function TextLesenSeite({ aktivitaet, kat, busy, onErledigt }) {
  const fv = aktivitaet?.field_values || {};
  const { groesse, setGroesse } = useLeseEinstellungen();

  const inhaltTyp = fv.inhalt_typ || 'text';
  const bilder = Array.isArray(fv.bilder) ? fv.bilder : [];
  const istText = inhaltTyp === 'text';
  const comicBild = getAktivitaetComicBild(kat?.name);

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-4">
      {/* Aufgabenstellungs-Streifen: kleines Comic-Idiom + Aufgabentext als eine
          kompakte, blaue Einheit – immer oben, fester Wiedererkennungs-Anker. */}
      {(fv.aufgabentext || comicBild) && (
        <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 mb-3 shrink-0">
          {comicBild && (
            <img src={comicBild} alt="" className="w-10 h-10 object-contain shrink-0" />
          )}
          <p className="text-sm text-blue-900 leading-snug">
            {fv.aufgabentext || 'Lies den folgenden Text aufmerksam durch.'}
          </p>
        </div>
      )}

      {/* Schriftgrößen-Umschalter (kompakt, oben rechts; nur bei direktem Text) */}
      {istText && fv.inhalt && (
        <div className="flex items-center justify-end mb-2 shrink-0">
          <LeseSchriftgroesseToggle groesse={groesse} onChange={setGroesse} />
        </div>
      )}

      {/* Inhalt – Scrollen ausdrücklich erlaubt */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <div className="space-y-5 pb-2">
          {istText && fv.inhalt && (
            <LesetextDarstellung text={fv.inhalt} groesse={groesse} />
          )}

          {bilder.length > 0 && (
            <div className={`grid gap-3 ${bilder.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {bilder.map((bild, idx) => (
                <figure key={`${bild?.url}-${idx}`} className="rounded-xl border border-border overflow-hidden bg-muted/30">
                  <img src={bild?.url} alt={bild?.caption || `Bild ${idx + 1}`} className="w-full h-auto object-contain max-h-80" />
                  {bild?.caption && (
                    <figcaption className="px-3 py-2 text-xs text-muted-foreground border-t border-border bg-card">{bild.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}

          {inhaltTyp === 'url' && fv.url && (
            <a href={fv.url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium">
              <ExternalLink className="w-4 h-4" /> Text öffnen
            </a>
          )}

          {inhaltTyp === 'datei' && fv.dokument_url && (
            <a href={fv.dokument_url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium">
              <FileText className="w-4 h-4" /> Dokument öffnen
            </a>
          )}

          {!fv.aufgabentext && !fv.inhalt && bilder.length === 0 && !fv.url && !fv.dokument_url && (
            <p className="text-sm text-muted-foreground italic text-center py-10">
              Für diese Aktivität sind noch keine Inhalte hinterlegt.
            </p>
          )}
        </div>
      </div>

      {/* Aktion */}
      <div className="pt-5 shrink-0">
        <Button
          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
          disabled={busy}
          onClick={onErledigt}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Gelesen
        </Button>
      </div>
    </div>
  );
}