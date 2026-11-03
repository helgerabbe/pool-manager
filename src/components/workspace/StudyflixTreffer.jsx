import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Clock } from 'lucide-react';

/** Ein Treffer der Studyflix-Videosuche. */
export default function StudyflixTreffer({ video, onWahl, disabled }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-white border border-violet-100">
      {video.thumbnail_url && <img src={video.thumbnail_url} alt="" className="h-12 w-20 shrink-0 rounded object-cover" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{video.titel}</p>
        <p className="text-[11px] text-muted-foreground truncate">{[video.fachbereiche, video.themen].filter(Boolean).join(' · ')}</p>
        {video.dauer && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{video.dauer}</p>}
      </div>
      <Button type="button" size="sm" onClick={onWahl} disabled={disabled} className="h-7 text-[11px] gap-1 bg-violet-600 hover:bg-violet-700 shrink-0">
        <Check className="w-3 h-3" /> Übernehmen
      </Button>
    </div>
  );
}