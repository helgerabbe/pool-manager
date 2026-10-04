import React from 'react';
import { Download, Eye, Loader2, Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dateiArt, materialUrl, officeLink } from '@/lib/materialOeffnen';

/** Materialien der aktuellen Phase: in Office öffnen, Vorschau, Download. */
export default function MaterialLeiste({ materialien = [], onVorschau }) {
  const [laedt, setLaedt] = React.useState(null);
  if (!materialien.length) return null;
  const mit = async (m, i, tun) => { setLaedt(i); try { tun(await materialUrl(m.url)); } finally { setLaedt(null); } };
  const knopf = 'h-7 gap-1 bg-white/10 px-2 text-xs text-white hover:bg-white/20';
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-black/30 px-4 py-2">
      {materialien.map((m, i) => {
        const art = dateiArt(m.name);
        const office = art === 'powerpoint' || art === 'word';
        return (
          <div key={i} className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1">
            {laedt === i && <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />}
            <span className="max-w-[200px] truncate text-xs text-white/80">{m.name}</span>
            {office && (
              <Button size="sm" variant="ghost" className={knopf} onClick={() => mit(m, i, (u) => { window.location.href = officeLink(art, u); })}>
                <Presentation className="h-3.5 w-3.5" /> In {art === 'powerpoint' ? 'PowerPoint' : 'Word'} öffnen
              </Button>
            )}
            {art !== 'sonstig' && (
              <Button size="sm" variant="ghost" className={knopf} onClick={() => mit(m, i, (u) => onVorschau({ art, url: u, name: m.name }))}>
                <Eye className="h-3.5 w-3.5" /> Vorschau
              </Button>
            )}
            <Button size="sm" variant="ghost" className={knopf} onClick={() => mit(m, i, (u) => window.open(u, '_blank'))}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}