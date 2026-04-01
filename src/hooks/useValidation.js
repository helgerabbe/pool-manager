/**
 * Hook für Validierung von Pflichtfeldern und Datenkonsistenz
 */
export function useValidation() {
  // Validiere Einheit
  const validateEinheit = (data) => {
    const errors = [];
    if (!data.fach?.trim()) errors.push('Fach ist erforderlich');
    if (!data.titel_der_einheit?.trim()) errors.push('Titel ist erforderlich');
    if (!data.jahrgangsstufe?.toString().trim()) errors.push('Jahrgangsstufe ist erforderlich');
    return errors;
  };

  // Validiere Basismodul
  const validateBasismodul = (data) => {
    const errors = [];
    if (!data.fach?.trim()) errors.push('Fach ist erforderlich');
    if (!data.titel?.trim()) errors.push('Titel ist erforderlich');
    return errors;
  };

  // Validiere Lernpaket
  const validateLernpaket = (data) => {
    const errors = [];
    if (!data.titel_des_pakets?.trim()) errors.push('Titel ist erforderlich');
    if (!data.einheit_id?.trim()) errors.push('Einheit ist erforderlich');
    if (!data.reihenfolge_nummer || data.reihenfolge_nummer < 1) {
      errors.push('Reihenfolge muss eine positive Zahl sein');
    }
    return errors;
  };

  // Validiere Lernziel
  const validateLernziel = (data) => {
    const errors = [];
    if (!data.formulierung_fachsprache?.trim()) errors.push('Formulierung ist erforderlich');
    if (!data.lernpaket_id?.trim()) errors.push('Lernpaket ist erforderlich');
    return errors;
  };

  // Validiere Themenfeld
  const validateThemenfeld = (data) => {
    const errors = [];
    if (!data.titel?.trim()) errors.push('Titel ist erforderlich');
    if (!data.einheit_id?.trim()) errors.push('Einheit ist erforderlich');
    return errors;
  };

  return {
    validateEinheit,
    validateBasismodul,
    validateLernpaket,
    validateLernziel,
    validateThemenfeld,
    isValid: (errors) => errors.length === 0,
  };
}