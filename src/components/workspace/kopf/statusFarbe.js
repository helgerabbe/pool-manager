/**
 * Der Stand eines Lernpakets oder Elements steht in der Farbe seines Titels –
 * wie im Menübaum: Grün = vollständig, Orange = unvollständig, Dunkelgrün = freigegeben.
 */
const FARBE = {
  green: { klasse: 'text-green-600', hinweis: 'Vollständig' },
  red: { klasse: 'text-orange-600', hinweis: 'Noch unvollständig' },
  yellow: { klasse: 'text-orange-600', hinweis: 'In Bearbeitung, noch unvollständig' },
  released: { klasse: 'text-green-800', hinweis: 'Freigegeben' },
};

export function statusFarbe(status) {
  return FARBE[status] || { klasse: '', hinweis: '' };
}