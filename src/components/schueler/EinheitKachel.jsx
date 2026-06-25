import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, CheckCircle2, Clock, NotebookPen } from 'lucide-react';
import { getLerntyp } from '@/lib/lerntypen';
import { cn } from '@/lib/utils';
import EinheitZeitDialog from '@/components/schueler/EinheitZeitDialog';
import MerkheftDialog from '@/components/schueler/MerkheftDialog';

/**
 * Kachel für eine einzelne Einheit auf der Fachseite. Zeigt Jahrgang,
 * gewählten/abgeschlossenen Lerntyp, Abgeschlossen-Haken, die insgesamt
 * gelernte Zeit (klickbar → Tagesliste) und die Merkheft-Notizen
 * (klickbar → Merkheft). Klick auf die Kachel selbst führt zur Einheit.
 */
export default function EinheitKachel({ einheit, fachFarbe, fortschritt, nummer, zeitLogs = [], notizen = [], userEmail }) {
  const navigate = useNavigate();
  const [zeitOpen, setZeitOpen] = useState(false);
  const [merkheftOpen, setMerkheftOpen] = useState(false);

  const farbe = fachFarbe || '#64748b';
  const abgeschlossen = fortschritt?.abgeschlossen === true;
  const lerntypKey = abgeschlossen
    ? fortschritt?.abgeschlossen_lerntyp || fortschritt?.gewaehlter_lerntyp
    : fortschritt?.gewaehlter_lerntyp;
  const lerntyp = lerntypKey ? getLerntyp(lerntypKey) : null;
  const gesamtMinuten = zeitLogs.reduce((s, l) => s + (l.minuten || 0), 0);

  const hasCover = !!einheit.cover_image_url;

  return (
    <div
      className={cn(
        'group flex flex-col rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden',
        abgeschlossen ? 'border-emerald-300' : 'border-border hover:border-primary/40'
      )}
    >
      {/* Cover-Bild oben */}
      {hasCover && (
        <div
          className="w-full shrink-0"
          style={{ aspectRatio: '16/9' }}
        >
          <img
            src={einheit.cover_image_url}
            alt={einheit.titel_der_einheit}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className={cn(
        'flex flex-col flex-1 p-5',
        abgeschlossen ? 'bg-emerald-50/40' : 'bg-card'
      )}>

      {/* Klickbarer Kopf → Einheit öffnen */}
      <button
        onClick={() => navigate(`/lernen/einheit?id=${einheit.id}`)}
        className="text-left"
      >
        <div className="flex items-start justify-between gap-3">
          {!hasCover && (
          <span
            className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
            style={{ backgroundColor: `${farbe}1a`, color: farbe }}
          >
            <BookOpen className="w-5 h-5" />
          </span>
          )}
          {abgeschlossen ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-300 rounded-full px-2.5 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Abgeschlossen
            </span>
          ) : (
            <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2.5 py-1">
              {nummer}
            </span>
          )}
        </div>

        <h3 className="mt-4 text-lg font-bold text-foreground leading-snug flex items-center gap-2">
          {einheit.titel_der_einheit}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {einheit.jahrgangsstufe ? `Klasse ${einheit.jahrgangsstufe}` : 'Einheit'}
        </p>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          {lerntyp ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: lerntyp.farbe }}>
              <CheckCircle2 className="w-4 h-4" />
              {abgeschlossen ? `Beendet als ${lerntyp.name}` : lerntyp.name}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Noch nicht begonnen</span>
          )}
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </button>

      {/* Lernzeit + Merkheft (eigene Klickziele, nicht Teil der Navigation) */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setZeitOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/70 rounded-full px-2.5 py-1.5 transition-colors"
          title="Wann hast du an dieser Einheit gearbeitet?"
        >
          <Clock className="w-3.5 h-3.5" />
          {gesamtMinuten > 0 ? `${gesamtMinuten} Min. gelernt` : 'Noch keine Lernzeit'}
        </button>
        <button
          onClick={() => setMerkheftOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200/70 rounded-full px-2.5 py-1.5 transition-colors"
          title="Dein Merkheft zu dieser Einheit"
        >
          <NotebookPen className="w-3.5 h-3.5" />
          {notizen.length > 0 ? `${notizen.length} ${notizen.length === 1 ? 'Notiz' : 'Notizen'}` : 'Merkheft'}
        </button>
      </div>

      </div>{/* Ende innerer padding-div */}

      <EinheitZeitDialog
        open={zeitOpen}
        onOpenChange={setZeitOpen}
        einheitTitel={einheit.titel_der_einheit}
        logs={zeitLogs}
      />
      <MerkheftDialog
        open={merkheftOpen}
        onOpenChange={setMerkheftOpen}
        einheitId={einheit.id}
        einheitTitel={einheit.titel_der_einheit}
        userEmail={userEmail}
      />
    </div>
  );
}