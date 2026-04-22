import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  getEinheitFortschritt,
  getLernpaketStatus,
} from '@/lib/statusLogic';
import { TrendingUp, Clock, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SyncWarningBanner from '@/components/sync/SyncWarningBanner';
import { StatusBadge, AmpelBanner } from './SharedUI';

export default function EinheitPanel({
  einheit,
  lernpakete,
  lernziele,
  aufgaben,
  themenfelder = [],
  kannBearbeiten,
  userEmail,
  onNavigate,
  onEdit,
}) {
  const { data: lernpaketPhaseAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
  });

  const { prozent, gruen, gesamt } = getEinheitFortschritt(
    lernpakete,
    lernziele,
    aufgaben,
    userEmail,
    [],
    lernpaketPhaseAktivitaeten
  );
  const barColor =
    prozent === 100
      ? 'bg-green-500'
      : prozent > 50
      ? 'bg-amber-400'
      : 'bg-red-400';

  return (
    <div className="space-y-6">
      {/* Warn-Banner: Nach Export erneut geändert */}
      <SyncWarningBanner item={einheit} isBasismodul={false} />

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{einheit.titel_der_einheit}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {einheit.fach} · Jahrgang {einheit.jahrgangsstufe}
          </p>
        </div>
        {kannBearbeiten && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="gap-2"
          >
            <Edit className="w-4 h-4" /> Bearbeiten
          </Button>
        )}
      </div>

      {/* Fortschrittsbalken */}
      <div className="p-5 rounded-xl border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Gesamtfortschritt</span>
          </div>
          <StatusBadge
            status={
              prozent === 100 ? 'green' : prozent > 0 ? 'yellow' : 'red'
            }
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${prozent}%` }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums w-10 text-right">
            {prozent} %
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {gruen} von {gesamt} Lernpaketen vollständig ausgearbeitet
        </p>
      </div>

      {lernpakete.length === 0 && (
        <AmpelBanner
          status="red"
          message="Legen Sie zunächst ein Lernpaket an, um mit der Planung zu beginnen."
        />
      )}

      {/* Pakete-Liste mit Themenfeldern */}
      <div className="space-y-3">
        {themenfelder.length > 0
          ? themenfelder.map((tf) => {
              const paketeFuerThemenfeld = lernpakete
                .filter((p) => p.themenfeld_id === tf.id)
                .sort(
                  (a, b) =>
                    (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0)
                );
              if (paketeFuerThemenfeld.length === 0) return null;
              const isSequenziellThemenfeld =
                tf.bearbeitungsmodus === 'sequenziell';
              return (
                <div
                  key={tf.id}
                  className="space-y-2 p-3 rounded-lg bg-amber-50 border border-amber-200"
                >
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                    {tf.titel}
                  </p>
                  <div className="space-y-2">
                    {paketeFuerThemenfeld.map((paket) => {
                      const pStatus = getLernpaketStatus(
                        paket,
                        lernziele,
                        aufgaben,
                        userEmail,
                        [],
                        lernpaketPhaseAktivitaeten
                      );
                      const dotColor =
                        pStatus === 'green'
                          ? 'bg-green-500'
                          : pStatus === 'yellow'
                          ? 'bg-amber-400'
                          : 'bg-red-500';
                      return (
                        <button
                          key={paket.id}
                          onClick={() =>
                            onNavigate({
                              type: 'lernpaket',
                              id: paket.id,
                              data: paket,
                            })
                          }
                          className="w-full flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-muted transition-colors text-left"
                        >
                          {isSequenziellThemenfeld ? (
                            <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {paket.reihenfolge_nummer}
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-sm text-slate-500">
                              ◉
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {paket.titel_des_pakets}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {paket.geschaetzte_dauer_minuten} Min.
                            </p>
                          </div>
                          <span
                            className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 shrink-0 ${dotColor}`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          : lernpakete.map((paket) => {
              const pStatus = getLernpaketStatus(
                paket,
                lernziele,
                aufgaben,
                userEmail,
                [],
                lernpaketPhaseAktivitaeten
              );
              const dotColor =
                pStatus === 'green'
                  ? 'bg-green-500'
                  : pStatus === 'yellow'
                  ? 'bg-amber-400'
                  : 'bg-red-500';
              return (
                <button
                  key={paket.id}
                  onClick={() =>
                    onNavigate({
                      type: 'lernpaket',
                      id: paket.id,
                      data: paket,
                    })
                  }
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {paket.reihenfolge_nummer}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {paket.titel_des_pakets}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {paket.geschaetzte_dauer_minuten} Min.
                    </p>
                  </div>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 shrink-0 ${dotColor}`}
                  />
                </button>
              );
            })}
      </div>
    </div>
  );
}