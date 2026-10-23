// Standardfolie „Partner finden“ (2026-10-23): Die Lehrkraft wählt vor der Stunde (oder spontan) die Art der Partnersuche.
// Bildstil für Organisationsfolien: ruhiges Aquarell (kein Comic), gedeckte Blau-, Lavendel- und Ockertöne.
const B = 'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/';

export const PARTNER_ARTEN = {
  frei: { name: 'Freie Partnersuche', bild: `${B}ad291c1f2_generated_image.png`,
    satz: 'Such dir jetzt einen Partner oder eine Partnerin, mit dem oder der du die nächste Arbeitsphase gestalten möchtest.' },
  nachbar: { name: 'Sitznachbar', bild: `${B}4b507435c_generated_image.png`,
    satz: 'Arbeite jetzt mit deinem Sitznachbarn oder deiner Sitznachbarin zusammen.' },
  los: { name: 'Losen', bild: `${B}f18febc18_generated_image.png`,
    satz: 'Jetzt entscheidet das Los: Zieh einen Zettel und finde die Person mit der gleichen Zahl.' },
  duett: { name: 'Lerntempo-Duett', bild: `${B}cd1dc468d_generated_image.png`,
    satz: 'Wenn du fertig bist, geh zum Treffpunkt. Wer als Nächstes kommt, ist dein Partner oder deine Partnerin.' },
};