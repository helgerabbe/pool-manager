import React from 'react';
import { PLAN_INFO } from '@/lib/eNiveauPlan';

/** Erklärt einen gemeinsamen Plan: was beide Stufen teilen und worin sie sich unterscheiden. */
export default function PlanErklaerung({ plan }) {
  const info = PLAN_INFO[plan];
  if (!info) return null;
  return (
    <div className="space-y-1.5">
      <p>{info.gemeinsam}</p>
      {info.stufen.map((s) => (
        <p key={s.name}>
          <span className="font-semibold">{s.name}:</span> {s.text}
        </p>
      ))}
    </div>
  );
}