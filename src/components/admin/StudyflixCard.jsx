import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, Video } from 'lucide-react';

/** Status der Studyflix-Anbindung: Partner-Key vorhanden? Wie viele Videos im Katalog? */
export default function StudyflixCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['studyflixStatus'],
    queryFn: async () => (await base44.functions.invoke('studyflixStatus', {})).data,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" /> Studyflix</CardTitle>
        <CardDescription>Lizenzierter Videokatalog der Schule. Der Partner-Key liegt geschützt unter „Secrets“ im App-Dashboard (STUDYFLIX_PARTNER_KEY).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <>
            <p className="flex items-center gap-2">
              {data?.key_hinterlegt ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
              {data?.key_hinterlegt ? 'Partner-Key hinterlegt' : 'Kein Partner-Key hinterlegt'}
            </p>
            <p className="text-muted-foreground">{(data?.anzahl ?? 0).toLocaleString('de-DE')} Videos im Katalog</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}