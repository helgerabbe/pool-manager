import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAufgabenFormate } from '@/hooks/useAufgabenFormate';
import AufgabenFormatZeile from './AufgabenFormatZeile';
import FormatVorschauDialog from '@/components/formate/FormatVorschauDialog';
import AufgabenFormatBearbeitenDialog from './AufgabenFormatBearbeitenDialog';
import MbkGalerieAbrufCard from './MbkGalerieAbrufCard';

/**
 * Verwaltung der internen Aufgabengalerie.
 *
 * Zwei Listen, bewusst getrennt: oben die Vorschläge, die noch niemand
 * angesehen hat, unten die offizielle Galerie. Freigegeben wird nur, was
 * einen Namen UND eine Beschreibung hat — ohne Beschreibung wäre ein Format
 * in der Sammlung, würde aber nie gefunden.
 */
export default function AufgabenFormateTab() {
  const { vorschlaege, galerie, isLoading, speichern, loeschen, refetch } = useAufgabenFormate();
  const [vorschau, setVorschau] = useState(null);
  const [bearbeiten, setBearbeiten] = useState(null);

  const platzhalter = useMutation({
    mutationFn: async (id) => {
      const res = await base44.functions.invoke('aufgabenFormatPlatzhalter', { id });
      return res.data;
    },
    onSuccess: () => {
      refetch?.();
      toast.success('Die Inhalte wurden durch Platzhalter ersetzt. Bitte in der Vorschau prüfen.');
    },
    onError: (e) => toast.error('Hat nicht geklappt: ' + e.message),
  });

  const statusWechseln = (format) => {
    const freigeben = format.status !== 'freigegeben';
    speichern.mutate(
      {
        id: format.id,
        status: freigeben ? 'freigegeben' : 'vorschlag',
        ...(freigeben ? { freigegeben_am: new Date().toISOString() } : {}),
      },
      {
        onSuccess: () => toast.success(freigeben
          ? `„${format.name}" ist jetzt in der Galerie.`
          : `„${format.name}" wurde zurückgezogen.`),
        onError: (e) => toast.error('Konnte nicht gespeichert werden: ' + e.message),
      },
    );
  };

  const zeile = (format) => (
    <AufgabenFormatZeile
      key={format.id}
      format={format}
      isPending={speichern.isPending || loeschen.isPending}
      onVorschau={() => setVorschau(format)}
      onBearbeiten={() => setBearbeiten(format)}
      onStatusWechsel={() => statusWechseln(format)}
      onLoeschen={() => {
        if (!window.confirm(`„${format.name || 'Dieses Format'}" wirklich löschen?`)) return;
        loeschen.mutate(format.id, {
          onSuccess: () => toast.success('Format gelöscht.'),
          onError: (e) => toast.error('Konnte nicht gelöscht werden: ' + e.message),
        });
      }}
    />
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MbkGalerieAbrufCard onFertig={() => refetch?.()} />

      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Neue Vorschläge ({vorschlaege.length})</CardTitle>
          <CardDescription>
            Formate, die beim Bauen von Aufgaben entstanden sind. Sehen Sie sich an, ob die Mechanik
            trägt, geben Sie dem Format einen Namen und eine Beschreibung der Funktionsweise — erst
            dann wird es Lehrkräften vorgeschlagen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {vorschlaege.length === 0
            ? <p className="text-sm text-muted-foreground py-2">Derzeit liegt kein Vorschlag vor.</p>
            : vorschlaege.map(zeile)}
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Offizielle Galerie ({galerie.length})</CardTitle>
          <CardDescription>
            Diese Formate werden Lehrkräften angeboten, wenn ihr Vorhaben dazu passt. Die KI setzt
            dann nur noch die Inhalte ein, statt die Aufgabe neu zu bauen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {galerie.length === 0
            ? <p className="text-sm text-muted-foreground py-2">Die Galerie ist noch leer.</p>
            : galerie.map(zeile)}
        </CardContent>
      </Card>

      <FormatVorschauDialog
        format={vorschau}
        open={!!vorschau}
        onOpenChange={(o) => !o && setVorschau(null)}
      />
      <AufgabenFormatBearbeitenDialog
        format={bearbeiten}
        open={!!bearbeiten}
        isPending={speichern.isPending}
        platzhalterLaeuft={platzhalter.isPending}
        onPlatzhalter={() => platzhalter.mutate(bearbeiten.id)}
        onOpenChange={(o) => !o && setBearbeiten(null)}
        onSpeichern={(felder) => speichern.mutate(
          { id: bearbeiten.id, ...felder },
          {
            onSuccess: () => { setBearbeiten(null); toast.success('Gespeichert.'); },
            onError: (e) => toast.error('Konnte nicht gespeichert werden: ' + e.message),
          },
        )}
      />
    </div>
  );
}