import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, MonitorPlay } from 'lucide-react';

/**
 * Zeigt die lauffähige HTML-Demo einer Galerie-Aktivität in einem
 * Sandbox-iFrame. Die Demo wird serverseitig aus dem GitHub-Repo geladen.
 */
export default function GalerieDemoDialog({ open, onOpenChange, entry }) {
  const demoPath = entry?.demo_html || null;

  const { data, isLoading, error } = useQuery({
    queryKey: ['galerieDemo', demoPath],
    queryFn: async () => {
      const res = await base44.functions.invoke('getAktivitaetenGalerie', {
        mode: 'demo',
        demo_path: demoPath,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: open && !!demoPath,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorPlay className="w-4 h-4 text-violet-600" />
            Demo: {entry?.name || 'Galerie-Aktivität'}
          </DialogTitle>
        </DialogHeader>

        {!demoPath ? (
          <p className="text-sm text-muted-foreground italic py-8 text-center">
            Für diese Aktivität ist noch keine Demo in der Galerie hinterlegt.
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Demo wird geladen…</span>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-8 text-center">
            Demo konnte nicht geladen werden: {error.message}
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden bg-white">
            <iframe
              srcDoc={data?.html || ''}
              className="w-full border-0"
              style={{ height: '60vh' }}
              sandbox="allow-scripts"
              title={`Demo ${entry?.name || ''}`}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}