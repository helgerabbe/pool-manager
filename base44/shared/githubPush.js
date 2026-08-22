/**
 * githubPush.js
 *
 * Minimaler GitHub-Schreib-Client auf Basis der Git-Data-API.
 * Erzeugt EINEN Commit mit allen geänderten Dateien (Delta):
 * Dateien, deren Inhalt sich gegenüber dem Repo nicht unterscheidet,
 * werden übersprungen.
 *
 * Ablauf:
 *   ref → commit → tree (recursive)  ⇒ Ist-Zustand (Pfad → Blob-SHA)
 *   Soll-SHAs lokal berechnen (git blob sha1)
 *   nur Unterschiede als Blobs hochladen → neuer Tree → Commit → Ref
 */

const API = 'https://api.github.com';

async function gh(token, path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'poolmanager-export',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub ${options.method || 'GET'} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** SHA-1 wie Git sie für Blobs bildet: sha1("blob <len>\0" + inhalt). */
export async function gitBlobSha(bytes) {
  const header = new TextEncoder().encode(`blob ${bytes.length}\u0000`);
  const buf = new Uint8Array(header.length + bytes.length);
  buf.set(header, 0);
  buf.set(bytes, header.length);
  const digest = await crypto.subtle.digest('SHA-1', buf);
  return toHex(digest);
}

export function bytesToBase64(bytes) {
  let out = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(out);
}

/**
 * @param {object} p
 * @param {string} p.token
 * @param {string} p.owner
 * @param {string} p.repo
 * @param {string} p.branch
 * @param {Array<{path: string, bytes: Uint8Array}>} p.files
 * @param {string} p.message
 * @returns {Promise<{commit_url: string|null, geschrieben: string[], unveraendert: string[]}>}
 */
export async function pushFiles({ token, owner, repo, branch, files, message }) {
  const base = `/repos/${owner}/${repo}`;

  let ref;
  try {
    ref = await gh(token, `${base}/git/ref/heads/${encodeURIComponent(branch)}`);
  } catch (err) {
    throw new Error(
      `Branch "${branch}" in ${owner}/${repo} nicht erreichbar. Prüfe Repository-Name, Branch `
      + `und ob der Token Schreibrecht (Contents: Read and write) auf dieses Repository hat. `
      + `Details: ${err.message}`
    );
  }

  const commitSha = ref.object.sha;
  const commit = await gh(token, `${base}/git/commits/${commitSha}`);
  const baseTreeSha = commit.tree.sha;

  const tree = await gh(token, `${base}/git/trees/${baseTreeSha}?recursive=1`);
  const vorhanden = new Map();
  for (const entry of tree.tree || []) {
    if (entry.type === 'blob') vorhanden.set(entry.path, entry.sha);
  }

  const geaendert = [];
  const unveraendert = [];
  for (const file of files) {
    const sha = await gitBlobSha(file.bytes);
    if (vorhanden.get(file.path) === sha) unveraendert.push(file.path);
    else geaendert.push(file);
  }

  if (geaendert.length === 0) {
    return { commit_url: null, geschrieben: [], unveraendert: unveraendert.map((p) => p) };
  }

  const treeEntries = [];
  for (const file of geaendert) {
    const blob = await gh(token, `${base}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: bytesToBase64(file.bytes), encoding: 'base64' }),
    });
    treeEntries.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const neuerTree = await gh(token, `${base}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
  });

  const neuerCommit = await gh(token, `${base}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: neuerTree.sha, parents: [commitSha] }),
  });

  await gh(token, `${base}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: neuerCommit.sha }),
  });

  return {
    commit_url: neuerCommit.html_url || `https://github.com/${owner}/${repo}/commit/${neuerCommit.sha}`,
    geschrieben: geaendert.map((f) => f.path),
    unveraendert,
  };
}