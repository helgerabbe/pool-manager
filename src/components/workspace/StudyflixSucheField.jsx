/**
 * StudyflixSucheField.jsx
 *
 * Studyflix-Videosuche für die Video/Audio-Aktivität.
 * Zwei Wege:
 *  1. Themensuche: sucht auf Basis von Fach + Jahrgangsstufe + Lernpaket-Thema
 *     passende Studyflix-Videos (KI-Websuche).
 *  2. Stichwortsuche: freie Suche nach einem Begriff.
 * Gefundene Videos können per Klick als Video-URL übernommen werden.
 * Zusätzlich: Direktlink „Selbst bei Studyflix suchen".
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, ExternalLink, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function StudyflixSucheField({ fach, jahrgangsstufe, thema, onSelectUrl, disabled = false }) {
  const [keyword, setKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null); // null = noch nicht gesucht

  const runSearch = async (suchauftrag) => {
    setIsSearching(true);
    setResults(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Du suchst Lernvideos auf der Plattform Studyflix (studyflix.de) für den Schulunterricht.

Kontext: Fach ${fach || 'unbekannt'}, Jahrgangsstufe ${jahrgangsstufe || 'unbekannt'}.
Suchauftrag: ${suchauftrag}

Finde bis zu 6 passende Studyflix-Videoseiten. WICHTIG:
- Gib AUSSCHLIESSLICH echte, existierende URLs von studyflix.de zurück (Format https://studyflix.de/...).
- Erfinde keine URLs. Wenn du dir bei einer URL nicht sicher bist, lasse sie weg.
- Gib zu jedem Video den Titel und eine kurze Beschreibung (1 Satz), worum es geht.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            videos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  titel: { type: 'string' },
                  url: { type: 'string' },
                  beschreibung: { type: 'string' },
                },
              },
            },
          },
        },
      });
      const videos = (res?.videos || []).filter(v => (v.url || '').includes('studyflix.de'));
      setResults(videos);
      if (videos.length === 0) toast.info('Keine passenden Studyflix-Videos gefunden.');
    } catch (err) {
      toast.error('Studyflix-Suche fehlgeschlagen: ' + (err?.message || 'unbekannt'));
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleThemenSuche = () => {
    const teile = [thema, fach].filter(Boolean).join(' – ');
    runSearch(`Passende Lernvideos zum Thema „${teile || 'aktuelles Unterrichtsthema'}".`);
  };

  const handleStichwortSuche = () => {
    if (!keyword.trim()) return;
    runSearch(`Lernvideos zum Suchbegriff „${keyword.trim()}".`);
  };

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold text-violet-900 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Studyflix-Videosuche
        </p>
        <a
          href="https://studyflix.de"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-violet-700 hover:underline inline-flex items-center gap-1"
        >
          Selbst bei Studyflix suchen <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleThemenSuche}
          disabled={disabled || isSearching}
          className="gap-1.5 text-xs border-violet-300 text-violet-800 hover:bg-violet-100 hover:text-violet-900 bg-white"
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Videos zum Thema{thema ? ` „${thema}"` : ''} suchen
        </Button>
        <div className="flex gap-2 flex-1">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleStichwortSuche(); } }}
            placeholder="Oder Stichwort eingeben…"
            disabled={disabled || isSearching}
            className="h-8 text-xs bg-white"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleStichwortSuche}
            disabled={disabled || isSearching || !keyword.trim()}
            className="gap-1.5 text-xs shrink-0 bg-white"
          >
            <Search className="w-3.5 h-3.5" /> Suchen
          </Button>
        </div>
      </div>

      {isSearching && (
        <p className="text-xs text-violet-700 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Studyflix wird durchsucht — das kann einige Sekunden dauern…
        </p>
      )}

      {Array.isArray(results) && results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((video, idx) => (
            <div key={`${video.url}-${idx}`} className="flex items-start gap-2 p-2 rounded-md bg-white border border-violet-100">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{video.titel || 'Studyflix-Video'}</p>
                {video.beschreibung && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{video.beschreibung}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded hover:bg-violet-50 text-violet-700"
                  title="Video bei Studyflix ansehen"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onSelectUrl(video.url);
                    toast.success('Video-Link übernommen.');
                  }}
                  disabled={disabled}
                  className="h-7 text-[11px] gap-1 bg-violet-600 hover:bg-violet-700"
                >
                  <Check className="w-3 h-3" /> Übernehmen
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}