import React from 'react';
import { Input } from '@/components/ui/input';
import Umschalter from './Umschalter';
import DateiFeld from './DateiFeld';

const Feld = ({ titel, ...p }) => <div className="space-y-1.5"><p className="text-xs font-medium text-muted-foreground">{titel}</p><Input {...p} /></div>;

/** Pflichtangaben für Bild, Video, Audio und Link. */
export default function MedienEinstellungen({ el, setze }) {
  if (el.typ === 'bild') return (
    <>
      <Feld titel="Bildadresse (Pflicht)" value={el.quelle || ''} placeholder="https://…" onChange={(e) => setze({ quelle: e.target.value })} />
      <DateiFeld accept="image/*" label="Oder Bild hochladen" setze={(uri) => setze({ quelle: uri })} />
      <Feld titel="Bildnachweis" value={el.nachweis || ''} placeholder="z. B. Foto: Wikimedia" onChange={(e) => setze({ nachweis: e.target.value })} />
    </>
  );
  if (el.typ === 'video') return (
    <>
      <Feld titel="Videoadresse oder Einbett-Code (Pflicht)" value={el.quelle || ''} placeholder="YouTube, Studyflix-Einbettcode …" onChange={(e) => setze({ quelle: e.target.value })} />
      <Umschalter titel="Darstellung" wert={el.darstellung} setze={(v) => setze({ darstellung: v })} optionen={[['einbetten', 'Einbetten'], ['link', 'Als Link']]} />
    </>
  );
  if (el.typ === 'audio') return (
    <>
      <DateiFeld accept="audio/*" label={el.dateiname || 'Audiodatei hochladen (Pflicht)'} setze={(uri, name) => setze({ quelle: uri, dateiname: name })} />
    </>
  );
  return (
    <>
      <Feld titel="Adresse (Pflicht)" value={el.quelle || ''} placeholder="https://…" onChange={(e) => setze({ quelle: e.target.value })} />
      <Umschalter titel="Anzeige" wert={el.anzeige || 'text'} setze={(v) => setze({ anzeige: v })} optionen={[['text', 'Text mit Link'], ['adresse', 'Adresse zeigen']]} />
      {(el.anzeige || 'text') === 'text' && <Feld titel="Angezeigter Text" value={el.inhalt || ''} placeholder="Zur Webseite" onChange={(e) => setze({ inhalt: e.target.value })} />}
    </>
  );
}