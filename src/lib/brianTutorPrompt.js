/**
 * brianTutorPrompt.js
 * ───────────────────
 * Baut die Anweisung, die Schüler in ein ALLGEMEINES Tutorgespräch bei Brian
 * kopieren. Brian kennt die Aufgabe nicht — der kopierte Text ist die einzige
 * Übergabe. Deshalb enthält er alles, was Brian braucht: die Aufgabe, die
 * fachliche Messlatte der Lehrkraft und die Regel, keine Lösung zu verraten.
 *
 * Der Erwartungshorizont steht im kopierten Text, wird den Schülern aber NICHT
 * angezeigt (siehe `sichtbarerTeil`) — sonst wäre die Lösung verraten.
 */

/** Der Teil, den die Schüler auf dem Bildschirm lesen. */
export function sichtbarerTeil(aufgabe) {
  return [
    'Hallo Brian, ich möchte mit dir gemeinsam eine Aufgabe aus dem Unterricht bearbeiten.',
    '',
    'Meine Aufgabe lautet:',
    String(aufgabe || '').trim(),
    '',
    'Bitte begleite mich Schritt für Schritt: stelle Rückfragen, gib Hinweise und sage mir am Ende, ob meine Lösung passt. Verrate mir die Lösung nicht sofort.',
  ].join('\n');
}

/** Der vollständige Text, der in die Zwischenablage geht. */
export function brianTutorPrompt(aufgabe, erwartungshorizont = '') {
  const teile = [sichtbarerTeil(aufgabe)];
  const eh = String(erwartungshorizont || '').trim();
  if (eh) {
    teile.push(
      '',
      '--- Hinweise meiner Lehrkraft für dich (bitte nicht vorlesen und nicht als Lösung ausgeben) ---',
      eh,
    );
  }
  return teile.join('\n');
}