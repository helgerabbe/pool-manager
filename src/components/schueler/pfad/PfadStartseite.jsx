import { BookOpen, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Einstiegspunkt der Einheit in der Schüleransicht. Zeigt den Namen der
 * Einheit + ein paar Eckdaten. Der Schüler steuert anschließend SELBST über
 * das Menü die Aktivität an, die er bearbeiten möchte (kein Auto-Resume).
 */
export default function PfadStartseite({ einheit, lerntyp, erledigtAnzahl, gesamtAnzahl, onOpenMenu }) {
  return (
    <div className="h-full flex items-center justify-center px-5">
      <div className="max-w-lg w-full text-center">
        <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-5">
          <BookOpen className="w-8 h-8" />
        </span>
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {einheit?.fach}
          {einheit?.jahrgangsstufe ? ` · Klasse ${einheit.jahrgangsstufe}` : ''}
          {lerntyp?.name ? ` · ${lerntyp.name}` : ''}
        </p>
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-3">
          {einheit?.titel_der_einheit || 'Einheit'}
        </h1>

        {gesamtAnzahl > 0 && (
          <p className="text-sm text-muted-foreground mb-6">
            Du hast bisher <span className="font-semibold text-foreground">{erledigtAnzahl}</span> von{' '}
            <span className="font-semibold text-foreground">{gesamtAnzahl}</span> Aktivitäten erledigt.
          </p>
        )}

        {gesamtAnzahl === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
            Diese Einheit wird gerade noch erstellt – es gibt hier noch keine Inhalte.
            Schau später wieder vorbei.
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Öffne das Menü, um deinen Lernpfad zu sehen und selbst auszuwählen, womit du weitermachen möchtest.
            </p>

            <Button onClick={onOpenMenu} className="gap-2">
              <Menu className="w-4 h-4" /> Lernpfad öffnen
            </Button>
          </>
        )}
      </div>
    </div>
  );
}