/**
 * shared/githubRead.js
 *
 * Lesender Zugriff auf das Schul-Repository (IGS-Seevetal/Poolzeit).
 * Gegenstück zu shared/githubPush.js, das ausschließlich schreibt.
 *
 * Verwendet die Contents-API, weil sie für private Repositories mit dem
 * hinterlegten Token funktioniert (raw.githubusercontent.com tut das nicht).
 */

const API = 'https://api.github.com';

export const REPO_OWNER = 'IGS-Seevetal';
export const REPO_NAME = 'Poolzeit';
export const REPO_BRANCH = 'main';

async function gh(token, path) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'poolmanager-rueckmeldung',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub GET ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Listet die Dateien eines Verzeichnisses.
 * @returns {Promise<Array<{name: string, path: string}>>} leer, wenn es den Ordner nicht gibt
 */
export async function listDirectory(token, dirPath) {
  const data = await gh(
    token,
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${dirPath}?ref=${encodeURIComponent(REPO_BRANCH)}`
  );
  if (!Array.isArray(data)) return [];
  return data
    .filter((e) => e?.type === 'file')
    .map((e) => ({ name: e.name, path: e.path }));
}

/** Liest eine Textdatei aus dem Repository. Gibt null zurück, wenn sie fehlt. */
export async function readTextFile(token, filePath) {
  const data = await gh(
    token,
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}?ref=${encodeURIComponent(REPO_BRANCH)}`
  );
  if (!data?.content) return null;
  const binary = atob(String(data.content).replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}