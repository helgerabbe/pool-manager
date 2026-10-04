import React from 'react';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

/** Ein beschriftetes Freitextfeld (mit Spracheingabe) des Bauplans. */
export default function BauplanFeld({ titel, hilfe, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{titel}</p>
      <FreitextMitSprache value={value} onChange={onChange} placeholder={hilfe} />
    </div>
  );
}