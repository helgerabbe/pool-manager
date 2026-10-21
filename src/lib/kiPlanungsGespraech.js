// Planungsgespräch (2026-10-21): Vor der Grobplanung klärt der Assistent in Alltagssprache, was für eine Stunde die Lehrkraft vor Augen hat.
import { kontextText, kiMitMaterial } from '@/lib/kiGrobplanung';

const SCHEMA = {
  type: 'object',
  properties: {
    verstanden: { type: 'string' },
    frage: { type: 'string' },
    optionen: { type: 'array', items: { type: 'object', properties: {
      titel: { type: 'string' }, kurz: { type: 'string' },
      verlauf: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, minuten: { type: 'number' }, extra: { type: 'boolean' } } } },
    } } },
    material_frage: { type: 'string' },
    material_optionen: { type: 'array', items: { type: 'string' } },
  },
  required: ['verstanden', 'frage', 'optionen'],
};

export const kiPlanungsGespraech = ({ wunsch, ...k }) => kiMitMaterial(k.assistent, `Du bist ein erfahrener Kollege im Lehrerzimmer und hilfst beim Planen einer Stunde. Du redest wie im Lehreralltag: einfach, locker, kurz, Du-Form. KEINE Fachbegriffe wie "deduktiv", "induktiv", "integriert", "Sicherungsphase", "Stundenmodell". Lieber: "was Neues einführen", "kurz üben", "zusammen festhalten", "knackig durchziehen".
${kontextText(k)}

Wichtig: In einer Stunde, in der was Neues kommt, darf auch geübt werden. In einer Übungsstunde darf auch kurz was Neues dazukommen. Finde heraus, was die Lehrkraft eigentlich will.

- "verstanden": 1–2 kurze Sätze, was du verstanden hast, z. B. "Ich glaube, du willst hier was Neues einführen." Wenn die Lehrkraft schon klar gesagt hat, was sie will (z. B. "mit Übung"), sag das so: "Ich habe verstanden, dass du … willst. Richtig?"
- "frage": eine kurze Frage, z. B. "Wie soll die Stunde laufen?"
- "optionen": 2–3 echte Möglichkeiten, wie die Stunde laufen kann (z. B. "Knackig durchziehen" = nur das Neue, ohne Übung; "Kleine Schritte" = Neues in Häppchen, dazwischen kurz üben; "Erst erklären, dann üben" = kompakt einführen, danach eine Übung). Passe sie an das Vorhaben an. Je Option: "titel" (2–4 Wörter), "kurz" (ein einfacher Satz, was das bedeutet), "verlauf" = 3–6 Phasen mit ganz einfachem "name" (2–5 Wörter, Alltagssprache), "minuten" (Summe = verfügbare Zeit bzw. 45) und "extra" = true bei Phasen, die gegenüber dem schlichten Weg dazukommen (z. B. eine Übung in einer Stunde mit Neuem).
- "material_frage": NUR wenn die Lehrkraft kein Material genannt hat und es für die Stunde wichtig ist, eine lockere Frage, z. B. "Du hast noch kein Material angegeben. Hast du was, oder machen wir es ohne?" Sonst leerer String.
- "material_optionen": 3–4 kurze Antworten dazu (z. B. "Ich habe was, lade ich noch hoch", "Ich erkläre es selbst", "Ein Erklärvideo wäre gut", "Ganz ohne Material"). Sonst leere Liste.${wunsch ? `\n\nDie Lehrkraft hat gerade dazu gesagt: "${wunsch}". Nimm das auf und passe "verstanden" und die Optionen an.` : ''}`, SCHEMA, k.anker.materialien);