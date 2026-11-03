/**
 * StudyflixSucheField.jsx
 * Videosuche im lizenzierten Studyflix-Katalog (StudyflixVideo, über studyflixSuche).
 * Übernommen wird die offizielle Einbett-Adresse des Videos.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import StudyflixTreffer from './StudyflixTreffer';

export default function StudyflixSucheField({ thema, onSelectUrl, disabled = false }) {
  const [keyword, setKeyword] = useState(thema || '');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);

  const suchen = async () => {
    if (!keyword.trim()) return;
    setIsSearching(true);
    try {
      const res = await base44.functions.invoke('studyflixSuche', { suche: keyword.trim() });
      setResults(res.data.videos || []);
      if (!res.data.videos?.length) toast.info('Keine passenden Studyflix-Videos gefunden.');
    } catch {
      toast.error('Studyflix-Suche fehlgeschlagen.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-3">
      <p className="text-xs font-semibold text-violet-900 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" /> Studyflix-Videosuche (Schullizenz)
      </p>
      <div className="flex gap-2">
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); suchen(); } }}
          placeholder="Thema oder Stichwort, z. B. Bruchrechnung" disabled={disabled || isSearching} className="h-8 text-xs bg-white" />
        <Button type="button" size="sm" variant="outline" onClick={suchen} disabled={disabled || isSearching || !keyword.trim()} className="gap-1.5 text-xs shrink-0 bg-white">
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Suchen
        </Button>
      </div>
      {results?.length > 0 && (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {results.map((v) => (
            <StudyflixTreffer key={v.video_id} video={v} disabled={disabled}
              onWahl={() => { onSelectUrl(v.video_embed); toast.success('Video übernommen.'); }} />
          ))}
        </div>
      )}
    </div>
  );
}