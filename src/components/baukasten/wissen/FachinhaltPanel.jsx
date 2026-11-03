import React from 'react';
import FachinhaltExpose from './FachinhaltExpose';
import FachinhaltEingang from './FachinhaltEingang';
import FachinhaltQuellen from './FachinhaltQuellen';
import PlanungsGrundlage from './PlanungsGrundlage';

/** Fachinhalt der Einheit: Exposé mit Inhaltsverzeichnis, Eingang für Rohmaterial, Quellen. */
export default function FachinhaltPanel({ einheit, planung, quellen, onNeu }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-6">
        <FachinhaltExpose fachinhalt={einheit.fachinhalt} />
        <PlanungsGrundlage planung={planung} />
      </div>
      <div className="space-y-4">
        <FachinhaltEingang einheit={einheit} planung={planung} quellen={quellen} onNeu={onNeu} />
        <FachinhaltQuellen quellen={quellen} onNeu={onNeu} />
      </div>
    </div>
  );
}