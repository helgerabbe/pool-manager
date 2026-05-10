/**
 * plugin_static_media.js
 *
 * Statische "Konsumieren-und-bestätigen"-Plugins ohne echte Interaktivität.
 * Alle bekommen am Ende einen "Erledigt"-Button, der SCORM-Completion meldet
 * (= einheitliche UX, einheitliche Pass-Bedingung für Moodle).
 *
 * Typen (alle teilen sich dasselbe CSS):
 *
 *   - "media_link"    Externer Link/URL
 *       { "instruction": "…", "url": "…", "label": "Titel" }
 *
 *   - "media_video"   Video-Embed (YouTube/Vimeo/iframe-fähige URL)
 *       { "instruction": "…", "url": "…", "title": "…" }
 *
 *   - "media_audio"   Audio-Player (mp3/ogg)
 *       { "instruction": "…", "url": "…", "title": "…" }
 *
 *   - "text_read"     Reiner Lesetext (HTML wird NICHT akzeptiert — pure
 *                     Strings, der Bauer escaped HTML beim Generieren)
 *       { "instruction": "…", "text": "…" }
 *
 *   - "textbook"      Lehrwerk-Verweis (Seite / Kapitel / Buch)
 *       { "instruction": "…", "book": "…", "pages": "12-15", "task": "…" }
 *
 *   - "confirm"       Reiner Bestätigungs-Schritt ("Hast du das gemacht?")
 *       { "instruction": "…", "hint": "…" }
 *
 *   - "ki_tutor"      KI-Tutor (Platzhalter — die echte LLM-Anbindung
 *                     passiert später extern; hier nur Hinweis-UI mit
 *                     Aufgabenstellung + Erledigt-Button)
 *       { "instruction": "…", "system_prompt_preview": "…" }
 *
 *   - "ki_check"      KI-Selbst-Check (Platzhalter — analog)
 *       { "instruction": "…", "kriterien": "…" }
 *
 *   - "open_task"     Offene Aufgabe ohne automatische Korrektur
 *       { "instruction": "…", "description": "…" }
 */

export const PLUGIN_STATIC_MEDIA_CSS = `/* ── Statische Medien-/Bestätigungs-Aktivitäten ────────────── */
.mbk-sm__instruction {
  margin: 0 0 0.75rem 0;
  font-weight: 500;
}
.mbk-sm__body {
  background: var(--mbk-bg);
  border: 1px solid var(--mbk-border);
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
}
.mbk-sm__title {
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}
.mbk-sm__text {
  white-space: pre-wrap;
  line-height: 1.6;
}
.mbk-sm__link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  background: var(--mbk-accent);
  color: #fff;
  border-radius: 0.4rem;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
}
.mbk-sm__link:hover { background: #1d4ed8; }
.mbk-sm__media-wrap {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: 0.4rem;
  overflow: hidden;
  margin: 0.5rem 0;
  aspect-ratio: 16 / 9;
}
.mbk-sm__media-wrap iframe,
.mbk-sm__media-wrap video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.mbk-sm__audio { width: 100%; margin: 0.5rem 0; }
.mbk-sm__hint {
  font-size: 0.85rem;
  color: var(--mbk-muted);
  margin: 0.5rem 0 0 0;
  font-style: italic;
}
.mbk-sm__pages {
  display: inline-block;
  margin-left: 0.4rem;
  padding: 0.05rem 0.45rem;
  background: #fff;
  border: 1px solid var(--mbk-border);
  border-radius: 0.3rem;
  font-size: 0.85rem;
  color: var(--mbk-muted);
}
.mbk-sm__footer {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.mbk-sm__status { color: var(--mbk-muted); font-size: 0.875rem; }
.mbk-sm__status.is-done { color: var(--mbk-success); font-weight: 600; }
.mbk-sm__done-banner {
  margin-top: 0.75rem;
  padding: 0.6rem 0.9rem;
  background: var(--mbk-success-soft);
  border: 1px solid var(--mbk-success);
  color: var(--mbk-success);
  border-radius: 0.5rem;
  font-weight: 600;
}
`;

export const PLUGIN_STATIC_MEDIA_JS = `
  // ── Helfer: rendert das Outro mit "Erledigt"-Button ──────
  function mbkRenderConfirmFooter(host, label) {
    var footer = el('div', { className: 'mbk-sm__footer' });
    var status = el('span', { className: 'mbk-sm__status', text: '' });
    var btn = el('button', {
      className: 'mbk-btn mbk-btn--primary',
      text: label || 'Erledigt — weiter',
      type: 'button',
    });
    footer.appendChild(status);
    footer.appendChild(btn);
    host.appendChild(footer);
    var doneBanner = null;
    btn.addEventListener('click', function () {
      btn.disabled = true;
      status.classList.add('is-done');
      status.textContent = '\\u2713 Als bearbeitet markiert.';
      if (!doneBanner) {
        doneBanner = el('div', { className: 'mbk-sm__done-banner', text: '\\u2705 Aufgabe abgeschlossen.' });
        host.appendChild(doneBanner);
        scorm.setScore(1);
        scorm.setCompleted();
      }
    });
  }

  function mbkRenderInstruction(host, text) {
    if (text) host.appendChild(el('p', { className: 'mbk-sm__instruction', text: text }));
  }

  function mbkVideoEmbedUrl(url) {
    if (!url) return null;
    // YouTube → embed
    var m = url.match(/youtube\\.com\\/watch\\?v=([\\w-]+)/);
    if (m) return 'https://www.youtube.com/embed/' + m[1];
    m = url.match(/youtu\\.be\\/([\\w-]+)/);
    if (m) return 'https://www.youtube.com/embed/' + m[1];
    // Vimeo → embed
    m = url.match(/vimeo\\.com\\/(\\d+)/);
    if (m) return 'https://player.vimeo.com/video/' + m[1];
    // alles andere: 1:1 als iframe-Src übernehmen (z.B. studyflix-Embed).
    return url;
  }

  // ── Plugin: Link / URL ───────────────────────────────────
  registerPlugin('media_link', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');
    mbkRenderInstruction(host, config.instruction);
    var body = el('div', { className: 'mbk-sm__body' });
    if (config.label || config.title) {
      body.appendChild(el('h3', { className: 'mbk-sm__title', text: config.label || config.title }));
    }
    if (config.url) {
      var link = el('a', {
        className: 'mbk-sm__link',
        href: config.url,
        target: '_blank',
        rel: 'noopener noreferrer',
      });
      link.appendChild(document.createTextNode('\\u2197 Webseite \\u00f6ffnen'));
      body.appendChild(link);
    } else {
      body.appendChild(el('div', { className: 'mbk-activity__error', text: 'Keine URL hinterlegt.' }));
    }
    host.appendChild(body);
    mbkRenderConfirmFooter(host, 'Gelesen — weiter');
  });

  // ── Plugin: Video ────────────────────────────────────────
  registerPlugin('media_video', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');
    mbkRenderInstruction(host, config.instruction);
    var body = el('div', { className: 'mbk-sm__body' });
    if (config.title) body.appendChild(el('h3', { className: 'mbk-sm__title', text: config.title }));
    var embed = mbkVideoEmbedUrl(config.url);
    if (embed) {
      var wrap = el('div', { className: 'mbk-sm__media-wrap' });
      var ifr = el('iframe', {
        src: embed,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        allowfullscreen: 'true',
        title: config.title || 'Video',
      });
      wrap.appendChild(ifr);
      body.appendChild(wrap);
    } else {
      body.appendChild(el('div', { className: 'mbk-activity__error', text: 'Keine Video-URL hinterlegt.' }));
    }
    host.appendChild(body);
    mbkRenderConfirmFooter(host, 'Gesehen — weiter');
  });

  // ── Plugin: Audio ────────────────────────────────────────
  registerPlugin('media_audio', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');
    mbkRenderInstruction(host, config.instruction);
    var body = el('div', { className: 'mbk-sm__body' });
    if (config.title) body.appendChild(el('h3', { className: 'mbk-sm__title', text: config.title }));
    if (config.url) {
      var audio = el('audio', {
        className: 'mbk-sm__audio',
        controls: 'controls',
        src: config.url,
      });
      body.appendChild(audio);
    } else {
      body.appendChild(el('div', { className: 'mbk-activity__error', text: 'Keine Audio-URL hinterlegt.' }));
    }
    host.appendChild(body);
    mbkRenderConfirmFooter(host, 'Geh\\u00f6rt — weiter');
  });

  // ── Plugin: Text lesen ───────────────────────────────────
  registerPlugin('text_read', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');
    mbkRenderInstruction(host, config.instruction);
    var body = el('div', { className: 'mbk-sm__body' });
    if (config.title) body.appendChild(el('h3', { className: 'mbk-sm__title', text: config.title }));
    body.appendChild(el('div', { className: 'mbk-sm__text', text: config.text || '' }));
    host.appendChild(body);
    mbkRenderConfirmFooter(host, 'Gelesen — weiter');
  });

  // ── Plugin: Lehrwerk ─────────────────────────────────────
  registerPlugin('textbook', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');
    mbkRenderInstruction(host, config.instruction);
    var body = el('div', { className: 'mbk-sm__body' });
    var title = (config.book || 'Lehrwerk');
    var h = el('h3', { className: 'mbk-sm__title', text: title });
    if (config.pages) h.appendChild(el('span', { className: 'mbk-sm__pages', text: 'S. ' + config.pages }));
    body.appendChild(h);
    if (config.task) body.appendChild(el('div', { className: 'mbk-sm__text', text: config.task }));
    host.appendChild(body);
    mbkRenderConfirmFooter(host, 'Bearbeitet — weiter');
  });

  // ── Plugin: Bearbeitung bestätigen ───────────────────────
  registerPlugin('confirm', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');
    mbkRenderInstruction(host, config.instruction);
    var body = el('div', { className: 'mbk-sm__body' });
    if (config.hint) body.appendChild(el('div', { className: 'mbk-sm__text', text: config.hint }));
    host.appendChild(body);
    mbkRenderConfirmFooter(host, 'Best\\u00e4tigen');
  });

  // ── Plugin: KI-Tutor (Platzhalter, ohne echte LLM-Anbindung) ──
  registerPlugin('ki_tutor', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');
    mbkRenderInstruction(host, config.instruction);
    var body = el('div', { className: 'mbk-sm__body' });
    body.appendChild(el('h3', { className: 'mbk-sm__title', text: 'KI-Tutor' }));
    body.appendChild(el('div', { className: 'mbk-sm__text', text: 'Sprich mit dem KI-Tutor \\u00fcber diese Aufgabe und arbeite sie gemeinsam durch. Best\\u00e4tige unten, wenn du fertig bist.' }));
    body.appendChild(el('p', { className: 'mbk-sm__hint', text: 'Hinweis: Die KI-Anbindung wird im Moodle-Kontext bereitgestellt.' }));
    host.appendChild(body);
    mbkRenderConfirmFooter(host, 'Mit KI bearbeitet — weiter');
  });

  // ── Plugin: KI-Check (Platzhalter) ───────────────────────
  registerPlugin('ki_check', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');
    mbkRenderInstruction(host, config.instruction);
    var body = el('div', { className: 'mbk-sm__body' });
    body.appendChild(el('h3', { className: 'mbk-sm__title', text: 'KI-Check' }));
    body.appendChild(el('div', { className: 'mbk-sm__text', text: 'Lass deine L\\u00f6sung vom KI-Check pr\\u00fcfen und nutze das Feedback zur \\u00dcberarbeitung.' }));
    body.appendChild(el('p', { className: 'mbk-sm__hint', text: 'Hinweis: Die KI-Anbindung wird im Moodle-Kontext bereitgestellt.' }));
    host.appendChild(body);
    mbkRenderConfirmFooter(host, 'Gepr\\u00fcft — weiter');
  });

  // ── Plugin: Offene Aufgabe ───────────────────────────────
  registerPlugin('open_task', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');
    mbkRenderInstruction(host, config.instruction);
    var body = el('div', { className: 'mbk-sm__body' });
    if (config.description) body.appendChild(el('div', { className: 'mbk-sm__text', text: config.description }));
    host.appendChild(body);
    mbkRenderConfirmFooter(host, 'Aufgabe erledigt — weiter');
  });
`;