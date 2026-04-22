/**
 * rbacEvaluator.js - Zentrale RBAC (Role-Based Access Control) Evaluierung
 * 
 * Definiert alle Berechtigungsregeln und prüft, ob ein User eine Operation durchführen darf.
 * Wird von allen Backend-Endpoints aufgerufen BEVOR die Haupt-Operation ausgeführt wird.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { RBAC_MATRIX, ROLLEN } from './rbacConfig';

/**
 * Evaluiert, ob ein User eine Operation durchführen darf
 * 
 * @param {Request} req - HTTP Request mit Auth Context
 * @param {string} resource - Entity Type (z.B. "Einheiten")
 * @param {string} operation - Operation (CREATE, UPDATE, DELETE, PUBLISH)
 * @param {object} targetEntity - Die Entity auf die die Operation angewendet wird
 * 
 * @returns {object} { allowed: boolean, reason?: string }
 */
export async function evaluateRBAC(req, resource, operation, targetEntity = null) {
  try {
    // 1. Authentifizierung prüfen
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return { allowed: false, reason: 'Unauthenticated' };
    }

    // 2. User in Benutzer Entity suchen
    const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });

    if (!benutzerList || benutzerList.length === 0) {
      return { allowed: false, reason: 'User not registered in system' };
    }

    const benutzer = benutzerList[0];
    const role = benutzer.rolle;
    const subjects = benutzer.fachbereich_zustaendigkeit || [];

    // 3. Rolle prüfen
    const roleConfig = RBAC_MATRIX[role];
    if (!roleConfig) {
      return { allowed: false, reason: `Unknown role: ${role}` };
    }

    // Administrator: Alles erlaubt
    if (roleConfig.allowAll) {
      return { allowed: true };
    }

    // Betrachter: Nur Read
    if (roleConfig.allowedReadOnly && (operation !== 'VIEW' && operation !== 'READ')) {
      return { allowed: false, reason: `${role} cannot ${operation}` };
    }

    // 4. Operation für diese Rolle erlaubt?
    const allowedResources = roleConfig.operations?.[operation] || [];
    if (!allowedResources.includes(resource)) {
      return { allowed: false, reason: `${role} cannot ${operation} ${resource}` };
    }

    // 5. Conditional Checks
    if (roleConfig.condition === 'mustOwnSubject') {
      return checkMustOwnSubject(targetEntity, subjects);
    }

    if (roleConfig.condition === 'mustBeUnitLead') {
      return await checkMustBeUnitLead(base44, user.email, targetEntity);
    }

    return { allowed: true };
  } catch (error) {
    console.error('[RBAC_ERROR]', error.message);
    return { allowed: false, reason: 'RBAC evaluation failed' };
  }
}

/**
 * Hilfs-Funktion: Prüft ob User für das Fach zuständig ist
 */
function checkMustOwnSubject(targetEntity, subjects) {
  if (!targetEntity) {
    return { allowed: false, reason: 'Target entity required' };
  }

  const fach = targetEntity.fach;
  if (!fach) {
    return { allowed: false, reason: 'Entity missing fach field' };
  }

  if (!subjects.includes(fach)) {
    return {
      allowed: false,
      reason: `Not responsible for subject: ${fach}. Your subjects: ${subjects.join(', ')}`,
    };
  }

  return { allowed: true };
}

/**
 * Hilfs-Funktion: Prüft ob User Leitung der Einheit ist
 */
async function checkMustBeUnitLead(base44, userEmail, targetEntity) {
  if (!targetEntity) {
    return { allowed: false, reason: 'Target entity required' };
  }

  let einheitId = targetEntity.einheit_id;

  // Wenn Entity selbst eine Einheit ist, nutze ihre ID
  if (targetEntity.id && !einheitId) {
    // Entity ist wahrscheinlich selbst eine Einheit
    einheitId = targetEntity.id;
  }

  if (!einheitId) {
    return { allowed: false, reason: 'Cannot determine unit for access check' };
  }

  try {
    const membership = await base44.asServiceRole.entities.EinheitMembers.filter({
      einheit_id: einheitId,
      user_email: userEmail,
    });

    if (!membership || membership.length === 0) {
      return { allowed: false, reason: 'Not a member of this unit' };
    }

    const member = membership[0];
    if (member.unit_role !== 'LEITUNG') {
      return { allowed: false, reason: `Must be unit lead. Your role: ${member.unit_role}` };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Unit lead check error:', error);
    return { allowed: false, reason: 'Unit lead check failed' };
  }
}

/**
 * Helper: Findet Parent Einheit einer Entity
 * Nützlich um zu prüfen, ob User für parent Einheit zuständig ist
 */
export async function findParentEinheit(base44, entityName, entity) {
  try {
    let einheitId = null;

    if (entityName === 'Einheiten') {
      return entity; // Ist selbst die Einheit
    }

    if (entityName === 'Themenfeld') {
      einheitId = entity.einheit_id;
    } else if (entityName === 'Lernpakete') {
      einheitId = entity.einheit_id;
    } else if (entityName === 'Lernziele') {
      const paket = await base44.asServiceRole.entities.Lernpakete.get(entity.lernpaket_id);
      einheitId = paket?.einheit_id;
    } else if (entityName === 'Aufgabenbausteine') {
      const paket = await base44.asServiceRole.entities.Lernpakete.get(entity.lernpaket_id);
      einheitId = paket?.einheit_id;
    } else if (entityName === 'AllgemeineAufgabe') {
      einheitId = entity.einheit_id;
    }

    if (!einheitId) {
      return null;
    }

    return await base44.asServiceRole.entities.Einheiten.get(einheitId);
  } catch (error) {
    console.error('Find parent unit error:', error);
    return null;
  }
}

/**
 * Helper: Prüft RBAC mit Parent-Unit fallback
 * Wenn die Entity einen Parent hat, prüfe ob User für den Parent zuständig ist
 */
export async function evaluateRBACWithParent(req, entityName, operation, targetEntity) {
  // Erst normal RBAC prüfen
  const result = await evaluateRBAC(req, entityName, operation, targetEntity);
  if (result.allowed) {
    return result;
  }

  // Fallback: Prüfe Parent Unit für Fachschaftsleitung
  const base44 = createClientFromRequest(req);
  const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
    user_id: (await base44.auth.me())?.email,
  });

  const benutzer = benutzerList?.[0];
  if (benutzer?.rolle === 'Fachschaftsleitung') {
    const parent = await findParentEinheit(base44, entityName, targetEntity);
    if (parent) {
      return checkMustOwnSubject(parent, benutzer.fachbereich_zustaendigkeit || []);
    }
  }

  return result;
}