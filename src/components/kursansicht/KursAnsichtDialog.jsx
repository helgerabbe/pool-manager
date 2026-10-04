import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

/** Zeigt das von der MBK gelieferte HTML der Kurs-Ansicht in einem eigenen Fenster. */
export default function KursAnsichtDialog({ open, onOpenChange, ansicht }) {
  const { data: html, isLoading } = useQuery({
    queryKey: ['kursAnsichtHtml', ansicht?.id, ansicht?.uebernommen_am],
    queryFn: async () => {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: ansicht.file_uri, expires_in: 300 });
      const res = await fetch(signed_url);
      return res.text();
    },
    enabled: open && !!ansicht?.file_uri,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Kurs-Ansicht{ansicht?.darstellung ? ` · ${ansicht.darstellung}` : ''}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <iframe title="Kurs-Ansicht" srcDoc={html || ''} sandbox="allow-scripts" className="flex-1 w-full rounded-md border bg-card" />
        )}
      </DialogContent>
    </Dialog>
  );
}