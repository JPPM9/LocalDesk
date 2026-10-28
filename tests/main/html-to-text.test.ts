import { describe, expect, it } from 'vitest';
import { decodeEntities, htmlToText } from '../../src/main/mail/html-to-text';

describe('htmlToText', () => {
  it('trennt Blöcke ohne Leerzeile', () => {
    expect(htmlToText('<div>a</div><div>b</div>')).toBe('a\nb');
  });

  it('macht aus Absätzen, Listen und Umbrüchen Zeilen', () => {
    expect(
      htmlToText(
        '<html><head><title>X</title><style>p{color:red}</style></head><body>' +
          '<h1>Hallo</h1><p>Zeile&nbsp;eins<br>Zeile zwei</p>' +
          '<ul><li>Äpfel</li><li>Birnen</li></ul></body></html>',
      ),
    ).toBe('Hallo\n\nZeile eins\nZeile zwei\n\n• Äpfel\n• Birnen');
  });

  it('entfernt Skripte, Kommentare und Bilder (auch Tracking-Pixel)', () => {
    const text = htmlToText(
      '<p>Text</p><!-- geheim --><script>alert(1)</script>' +
        '<img src="https://tracker.example/pixel.gif" width="1">',
    );
    expect(text).toBe('Text');
  });

  it('zeigt bei Links die Adresse, wenn sie vom Text abweicht', () => {
    expect(
      htmlToText(
        '<a href="https://bank.example/login?a=1&amp;b=2">Jetzt anmelden</a> ' +
          '<a href="https://x.de">https://x.de</a> <a href="mailto:a@b.c">Mail</a>',
      ),
    ).toBe(
      'Jetzt anmelden (https://bank.example/login?a=1&b=2) https://x.de Mail',
    );
  });

  it('löst Tags nicht aus Zeichen-Codes heraus auf', () => {
    // &lt;script&gt; ist Text, kein Tag – und wird nie als HTML angezeigt.
    expect(htmlToText('<p>&lt;b&gt;fett&lt;/b&gt;</p>')).toBe('<b>fett</b>');
  });

  it('macht Tabellenzellen zu Tabs', () => {
    expect(
      htmlToText(
        '<table><tr><td>A</td><td>B</td></tr><tr><td>C</td></tr></table>',
      ),
    ).toBe('A B\nC');
  });
});

describe('decodeEntities', () => {
  it('kennt Namen und Zahlen', () => {
    expect(
      decodeEntities('It&#39;s &quot;gut&quot; &euro; &#x2019; &auml;'),
    ).toBe('It\'s "gut" € ’ ä');
    expect(decodeEntities('Weiter &rarr; 5&times;')).toBe('Weiter → 5×');
    expect(decodeEntities('&unbekannt; &#xD800; &#0;')).toBe(
      '&unbekannt; &#xD800; &#0;',
    );
  });
});
