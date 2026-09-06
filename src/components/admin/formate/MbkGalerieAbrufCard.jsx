import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DownloadCloud, Link2 } from 'lucide-react';

/**
 * MbkGalerieAbrufCard
 * ───────────────────
 * Holt die Aufgabenformate aus der Galerie der MBK in die eigene Sammlung —
 * als Vorschläge, die hier erst angesehen und freigegeben werden.
 *
 * Bewusst ein Knopf und kein automatischer Abgleich: Ein Abruf bringt fremde,
 * noch ungeprüfte Mechaniken herein; das soll ein bewusster Schritt der
 * Administration bleiben.
 */
export default function MbkGalerieAbrufCard({ onFertig }) {
  const abruf = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('importMbkAufgabenFormate', {});
      if (res?.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (d) => {
      toast.success(
        `${d.neu} neu, ${d.aktualisiert} aktualisiert, ${d.uebersprungen} übersprungen (${d.geholt} Einträge gefunden).`,
      );
      (d.hinweise || []).slice(0, 5).forEach((h) => toast.warning(h));
      onFertig?.();
    },
    onError: (e) => toast.error('Abruf nicht möglich: ' + e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          Galerie der MBK
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Holt die Formate aus dem Galerie-Verzeichnis des Kursbaus (GitHub-Verbindung) als neue
          Vorschläge herein. Sie erscheinen unten bei den Vorschlägen und werden Lehrkräften erst
          angeboten, wenn Sie sie hier benannt und freigegeben haben. Bereits freigegebene Formate
          bleiben unverändert.
        </p>
        <Button className="gap-1.5" onClick={() => abruf.mutate()} disabled={abruf.isPending}>
          {abruf.isPending
            ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            : <DownloadCloud className="w-3.5 h-3.5" />}
          {abruf.isPending ? 'Ich hole die Formate …' : 'Formate aus der MBK-Galerie holen'}
        </Button>
      </CardContent>
    </Card>
  );
}