import { describe, expect, it } from 'vitest';
import { extractWebText } from '../../src/main/web/extract';

const BASE = 'https://beispiel.de/artikel/start';
const para = (text: string, times = 12) =>
  `<p>${Array.from({ length: times }, () => text).join(' ')}</p>`;

const ARTICLE = `<!doctype html>
<html lang="de"><head>
  <meta charset="utf-8"><title>Der Elektron-Artikel – Beispiel-Lexikon</title>
  <style>.menu { color: red } body { margin: 0 }</style>
  <script>window.tracking = function () { return 'GEHEIMES-SKRIPT'; }</script>
</head><body>
  <header><nav><a href="/">Startseite</a> <a href="/ueber">Über uns</a> <a href="/kontakt">Kontakt-Menü</a></nav></header>
  <main><article>
    <h1>Das Elektron</h1>
    <p>Das Elektron ist ein Elementarteilchen mit negativer Ladung. ${'Es spielt in der Chemie und Elektrotechnik eine zentrale Rolle. '.repeat(6)}</p>
    <h2>Eigenschaften</h2>
    ${para('Die Masse beträgt etwa 9,109 · 10⁻³¹ Kilogramm und die Ladung minus eine Elementarladung.')}
    <ul><li>Ladung: negativ</li><li>Spin: 1/2</li><li>Typ: <strong>Lepton</strong></li></ul>
    <table><tr><th>Größe</th><th>Wert</th></tr><tr><td>Masse</td><td>9,109</td></tr><tr><td>Ladung</td><td>-1</td></tr></table>
    <p>Weiterführend: <a href="/wiki/Positron">Positron</a>, <a href="https://extern.example/seite#abschnitt">Extern</a> und <a href="javascript:alert(1)">kaputter Link</a>.</p>
    <blockquote>Ein Zitat über Teilchen, das lang genug ist, um erhalten zu bleiben.</blockquote>
    <pre><code>E = m * c^2</code></pre>
    <img src="/bild.png" alt="Ein Bild">
  </article></main>
  <aside>Werbung: Jetzt kaufen!</aside>
  <footer>Impressum · Datenschutz · © 2026 Beispiel</footer>
</body></html>`;

describe('extractWebText: Artikel', () => {
  const result = extractWebText(ARTICLE, 'text/html', BASE);

  it('findet Titel und Haupttext ohne Menü, Werbung, Fußzeile, Skripte und Stile', () => {
    expect(result.title).toContain('Elektron');
    expect(result.text).toContain(
      'Das Elektron ist ein Elementarteilchen mit negativer Ladung.',
    );
    expect(result.text).toContain('Die Masse beträgt etwa 9,109');
    for (const noise of [
      'Startseite',
      'Kontakt-Menü',
      'Werbung',
      'Impressum',
      'GEHEIMES-SKRIPT',
      'color: red',
      'window.tracking',
    ]) {
      expect(result.text, noise).not.toContain(noise);
    }
    expect(result.thin).toBe(false);
  });

  it('behält Überschriften, Listen, Tabellen, Hervorhebung, Zitate und Code als Markdown', () => {
    expect(result.text).toMatch(/^#{1,3} Eigenschaften$/m);
    expect(result.text).toMatch(/^- Ladung: negativ$/m);
    expect(result.text).toMatch(/^- Typ: \*\*Lepton\*\*$/m);
    expect(result.text).toContain('| Größe | Wert |');
    expect(result.text).toContain('| --- | --- |');
    expect(result.text).toContain('| Masse | 9,109 |');
    expect(result.text).toMatch(/^> Ein Zitat/m);
    expect(result.text).toContain('```\nE = m * c^2\n```');
  });

  it('Links werden vollständig, Anker und „javascript:“ fallen weg, Bilder auch', () => {
    expect(result.text).toContain(
      '[Positron](https://beispiel.de/wiki/Positron)',
    );
    expect(result.text).toContain(
      '[Extern](https://extern.example/seite#abschnitt)',
    );
    expect(result.text).toContain('kaputter Link');
    expect(result.text).not.toContain('javascript');
    expect(result.text).not.toContain('bild.png');
    expect(result.text).not.toContain('Ein Bild');
  });

  it('kein Absatz hängt mehr als eine Leerzeile entfernt, kein Rest-HTML', () => {
    expect(result.text).not.toMatch(/\n{3,}/);
    expect(result.text).not.toMatch(
      /<\/?(p|div|span|a|li|ul|table|strong)[ >]/,
    );
  });
});

describe('extractWebText: kurze und schlichte Seiten', () => {
  it('eine winzige Seite (wie example.com) liefert ihren Text über den Rückfall', () => {
    const html = `<!doctype html><html><head><title>Example Domain</title></head><body><div>
      <h1>Example Domain</h1>
      <p>This domain is for use in illustrative examples in documents.</p>
      <p><a href="https://www.iana.org/domains/example">More information...</a></p></div></body></html>`;
    const result = extractWebText(
      html,
      'text/html; charset=utf-8',
      'https://example.com/',
    );
    expect(result.title).toBe('Example Domain');
    expect(result.text).toContain(
      'This domain is for use in illustrative examples in documents.',
    );
    expect(result.text).toContain(
      '[More information...](https://www.iana.org/domains/example)',
    );
    expect(result.thin).toBe(false);
  });

  it('Seiten ohne <article> und ohne Struktur geben trotzdem ihren Text', () => {
    const html =
      '<html><body>Nur ein Satz, ganz ohne Tags drumherum.</body></html>';
    expect(extractWebText(html, 'text/html', BASE).text).toBe(
      'Nur ein Satz, ganz ohne Tags drumherum.',
    );
  });

  it('eine Seite, die ihren Inhalt erst mit JavaScript lädt, wird als „dünn“ erkannt', () => {
    const html = `<!doctype html><html><head><title>App</title></head><body>
      <div id="root"></div><noscript>Bitte aktiviere JavaScript.</noscript>
      <script>${'var x = 1;'.repeat(600)}</script></body></html>`;
    const result = extractWebText(html, 'text/html', BASE);
    expect(result.thin).toBe(true);
    expect(result.text).not.toContain('var x');
  });

  it('eine kurze Seite ist nicht „dünn“, nur weil sie kurz ist', () => {
    expect(
      extractWebText(
        '<html><body><p>Kurz.</p></body></html>',
        'text/html',
        BASE,
      ).thin,
    ).toBe(false);
  });

  it('Rahmen der Seite fallen im Rückfall weg, der Hauptteil bleibt', () => {
    const html = `<html><head><title>T</title></head><body>
      <nav>Menü Menü</nav><header>Kopf</header>
      <main><p>Der eigentliche Inhalt.</p></main>
      <footer>Fuß</footer></body></html>`;
    const { text } = extractWebText(html, 'text/html', BASE);
    expect(text).toBe('Der eigentliche Inhalt.');
  });
});

describe('extractWebText: Sonderfälle', () => {
  it('Text, Markdown, JSON und XML bleiben, wie sie sind', () => {
    expect(
      extractWebText('  Zeile 1\r\n\r\n\r\n\r\nZeile 2  ', 'text/plain', BASE),
    ).toEqual({
      title: '',
      text: 'Zeile 1\n\nZeile 2',
      thin: false,
    });
    expect(
      extractWebText('# Titel\n\n- a\n- b', 'text/markdown', BASE).text,
    ).toBe('# Titel\n\n- a\n- b');
    expect(extractWebText('{"a": 1}', 'application/json', BASE).text).toBe(
      '{"a": 1}',
    );
  });

  it('ohne Typ wird HTML am Anfang erkannt', () => {
    expect(
      extractWebText(
        '<!DOCTYPE html><html><body><p>Hallo Welt, das ist HTML.</p></body></html>',
        '',
        BASE,
      ).text,
    ).toBe('Hallo Welt, das ist HTML.');
    expect(
      extractWebText('einfach Text <b>nicht fett</b>', '', BASE).text,
    ).toBe('einfach Text <b>nicht fett</b>');
  });

  it('kaputtes HTML wirft nicht', () => {
    const broken =
      '<html><body><div><p>Offen <b>fett <i>kursiv<ul><li>Punkt<li>Noch einer</div></p>';
    const result = extractWebText(broken, 'text/html', BASE);
    expect(result.text).toContain('Offen');
    expect(result.text).toContain('Punkt');
    expect(extractWebText('', 'text/html', BASE)).toEqual({
      title: '',
      text: '',
      thin: false,
    });
    expect(extractWebText('<', 'text/html', BASE).text).toBeDefined();
  });

  it('Zeichen-Entitäten und Umlaute werden richtig gelesen', () => {
    const html =
      '<html><body><p>Caf&eacute; &amp; M&uuml;ller &lt;ok&gt; &#8364;5 &nbsp;x</p></body></html>';
    expect(extractWebText(html, 'text/html', BASE).text).toBe(
      'Café & Müller <ok> €5 x',
    );
  });

  it('verschachtelte Listen behalten ihre Ebenen, nummerierte ihre Zählung', () => {
    const html = `<html><body><ul><li>Eins<ul><li>Eins-a</li><li>Eins-b</li></ul></li><li>Zwei</li></ul>
      <ol><li>Erst</li><li>Dann</li></ol></body></html>`;
    const { text } = extractWebText(html, 'text/html', BASE);
    expect(text).toContain('- Eins\n  - Eins-a\n  - Eins-b\n- Zwei');
    expect(text).toContain('1. Erst\n2. Dann');
  });

  it('führt nichts aus: Skript, Ereignis-Attribute und iframe bleiben wirkungslos und stehen nicht im Text', () => {
    const html = `<html><body onload="window.__ausgefuehrt = true">
      <p>Normaler Text der Seite.</p><img src="x" onerror="window.__ausgefuehrt = true">
      <iframe src="https://boese.example/"></iframe>
      <script>window.__ausgefuehrt = true</script></body></html>`;
    const result = extractWebText(html, 'text/html', BASE);
    expect(result.text).toBe('Normaler Text der Seite.');
    expect(
      (globalThis as { __ausgefuehrt?: boolean }).__ausgefuehrt,
    ).toBeUndefined();
  });

  it('eine große Seite wird in vertretbarer Zeit gelesen', () => {
    const big = `<html><body><article>${Array.from({ length: 4000 }, (_, i) => `<p>Absatz ${i} mit etwas Text, damit er nicht leer ist und Readability ihn mag.</p>`).join('')}</article></body></html>`;
    const started = Date.now();
    const result = extractWebText(big, 'text/html', BASE);
    expect(result.text).toContain('Absatz 3999');
    expect(Date.now() - started).toBeLessThan(15_000);
  });
});
