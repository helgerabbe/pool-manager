/**
 * MonitorPanel.jsx
 *
 * Schlanke Detail-Anzeige oberhalb des Material-Pools (Tab 7).
 *
 * Anzeige je nach Selektion:
 *   - System-Baustein → Titel, Icon, Beschreibung, Export-Instruktion.
 *   - Lernpaket (aufgaben_typ === 'buendel' aus Lernpakete-Collection,
 *     erkennbar an _source === 'lernpaket') → Titel + Liste der enthaltenen
 *     Übungsformate (Aktivitätstypen aus dem AktivitaetenKatalog).
 *   - Aufgabe / Projekt → Titel + Aufgabenstellung als reiner Text.
 *   - Nichts selektiert → Hinweistext.
 *
 * UX-Regeln:
 *   - Kein „MONITOR"-Header, kein Vorschau-Button, keine Anforderungsebene-Badges.
 *   - Maximalhöhe + internes Scrolling, damit der Material-Pool nicht
 *     herausgedrückt wird.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MousePointerClick } from 'lucide-react';
import { getAufgabenTyp } from '@/lib/aufgabenTypen';
import { getSystemBausteinIcon } from '@/lib/systemBausteinIcons';
import { getAktivitaetenByLernpaket, getAktivitaetenKatalog } from '@/services/AktivitaetService';

// Gemeinsamer Container: FESTE Höhe + internes Scrolling. Verhindert
// Layout-Shifts darunter, wenn der Inhalt unterschiedlich lang ist.
function MonitorContainer({ children, className = '' }) {
  return (
    <div className={`h-48 overflow-y-auto rounded-xl ${className}`}>
      {children}
    </div>
  );
}

function SystemBausteinView({ baustein }) {
  const Icon = getSystemBausteinIcon(baustein.icon);
  return (
    <MonitorContainer className="border-2 border-slate-300 bg-slate-50">
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
            <Icon strokeWidth={2.5} className="w-4 h-4 text-slate-700" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-block text-[10px] font-semibold uppercase text-slate-600 tracking-wide">
              Standard-Element
            </span>
            <p className="text-xs font-semibold text-slate-900 truncate">{baustein.titel}</p>
          </div>
        </div>

        {baustein.admin_beschreibung && (
          <p className="text-[11px] text-slate-700 leading-relaxed">{baustein.admin_beschreibung}</p>
        )}
      </div>
    </MonitorContainer>
  );
}

/**
 * Lernpaket-Ansicht: zeigt Titel + enthaltene Übungsformate.
 * Lädt die Aktivitäten lazy nur bei Selektion (eigener Query-Key).
 */
function LernpaketView({ lernpaket, typMeta }) {
  const Icon = typMeta.icon;

  const { data: aktivitaeten = [], isLoading } = useQuery({
    queryKey: ['lernpaket-aktivitaeten-monitor', lernpaket.id],
    queryFn: () => getAktivitaetenByLernpaket(lernpaket.id),
    enabled: !!lernpaket.id,
  });

  // Katalog ist global + selten geändert → einmal cachen, daraus den
  // menschenlesbaren Namen ziehen.
  const { data: katalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog-monitor'],
    queryFn: getAktivitaetenKatalog,
    staleTime: 5 * 60 * 1000,
  });

  const namesById = React.useMemo(() => {
    const m = new Map();
    katalog.forEach((k) => m.set(k.id, k.name));
    return m;
  }, [katalog]);

  const formate = React.useMemo(() => {
    return aktivitaeten
      .map((a) => namesById.get(a.aktivitaet_id))
      .filter(Boolean);
  }, [aktivitaeten, namesById]);

  return (
    <MonitorContainer className={`border-2 ${typMeta.color.border}/30 ${typMeta.color.bg}/40`}>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${typMeta.color.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-3.5 h-3.5 ${typMeta.color.iconText}`} />
          </div>
          <div className="min-w-0 flex-1">
            <span className={`inline-block text-[10px] font-semibold uppercase ${typMeta.color.text} tracking-wide`}>
              Lernpaket
            </span>
            <p className="text-xs font-semibold text-foreground truncate">
              {lernpaket.titel || 'Ohne Titel'}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide mb-1">
            Übungsformate
          </p>
          {isLoading ? (
            <p className="text-[11px] text-muted-foreground italic">Lade…</p>
          ) : formate.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">Noch keine Formate hinterlegt.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {formate.map((name, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/70 border border-border/40 text-foreground/80"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </MonitorContainer>
  );
}

/**
 * Aufgaben-/Projekt-Ansicht: nur Titel + Aufgabenstellung als reiner Text.
 */
function AufgabeView({ aufgabe, typMeta }) {
  const Icon = typMeta.icon;
  const text = aufgabe.aufgabenstellung || aufgabe.beschreibung;

  return (
    <MonitorContainer className={`border-2 ${typMeta.color.border}/30 ${typMeta.color.bg}/40`}>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${typMeta.color.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-3.5 h-3.5 ${typMeta.color.iconText}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">
              {aufgabe.titel || 'Ohne Titel'}
            </p>
          </div>
        </div>

        {text ? (
          <p className="text-[11px] text-foreground/75 leading-relaxed whitespace-pre-wrap">
            {text}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">Keine Aufgabenstellung hinterlegt.</p>
        )}
      </div>
    </MonitorContainer>
  );
}

export default function MonitorPanel({ aufgabe, systemBaustein }) {
  if (systemBaustein) {
    return <SystemBausteinView baustein={systemBaustein} />;
  }

  if (!aufgabe) {
    return (
      <MonitorContainer className="border border-dashed border-border bg-muted/20">
        <div className="p-4 text-center">
          <MousePointerClick className="w-5 h-5 mx-auto text-muted-foreground/60 mb-1.5" />
          <p className="text-xs text-muted-foreground">
            Klicke auf eine Aufgabe oder ein Standard-Element, um Details zu sehen.
          </p>
        </div>
      </MonitorContainer>
    );
  }

  const typMeta = getAufgabenTyp(aufgabe.aufgaben_typ);

  // Lernpakete kommen aus der Lernpakete-Collection und werden vom Adapter
  // mit `_source === 'lernpaket'` markiert. Diese bekommen die Aktivitäts-
  // formate-Liste statt der Aufgabenstellung.
  if (aufgabe._source === 'lernpaket' || aufgabe.aufgaben_typ === 'buendel') {
    return <LernpaketView lernpaket={aufgabe} typMeta={typMeta} />;
  }

  return <AufgabeView aufgabe={aufgabe} typMeta={typMeta} />;
}