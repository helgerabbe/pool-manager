// Ausgeschriebene Bezeichnungen der Modus-Kürzel im MethodenKatalog.
export const MODUS_TEXT = {
  D: 'Nur digital',
  'D(A)': 'Digital, auch analog möglich',
  'A(D)': 'Analog, auch digital möglich',
  'A(+D)': 'Analog mit digitaler Unterstützung',
  A: 'Nur analog',
};

export const modusText = (m) => MODUS_TEXT[m] || m || '';