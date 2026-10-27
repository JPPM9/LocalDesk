import JSZip from 'jszip';

/**
 * Baut eine kleine, gültige PDF: jede Seite eine Liste von Zeilen (Helvetica,
 * WinAnsi – damit gehen auch Umlaute). Ohne Seiten = PDF ohne Text (wie ein Scan).
 */
export function makePdf(pages: string[][]): Uint8Array {
  const objects: string[] = [];
  const pageIds = pages.map((_, i) => 4 + i * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  pages.forEach((lines, i) => {
    const stream = [
      'BT /F1 12 Tf 72 720 Td 14 TL',
      ...lines.map((line) => `(${escapePdf(line)}) Tj T*`),
      'ET',
    ].join('\n');
    objects[pageIds[i]] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageIds[i] + 1} 0 R >>`;
    objects[pageIds[i] + 1] =
      `<< /Length ${latin1(stream).length} >>\nstream\n${stream}\nendstream`;
  });

  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = latin1(body).length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = latin1(body).length;
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    body += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return latin1(body);
}

function escapePdf(text: string): string {
  return text.replace(/[\\()]/g, (c) => `\\${c}`);
}

/** Text als Latin-1-Bytes (für die WinAnsi-Kodierung der PDF). */
function latin1(text: string): Uint8Array {
  return Uint8Array.from(text, (c) => c.charCodeAt(0) & 0xff);
}

/** Baut eine minimale Word-Datei (.docx); Absätze mit `style` werden Überschriften. */
export async function makeDocx(
  paragraphs: { text: string; style?: 'Heading1' | 'Heading2' }[],
): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  const body = paragraphs
    .map(
      (p) =>
        `<w:p>${p.style ? `<w:pPr><w:pStyle w:val="${p.style}"/></w:pPr>` : ''}<w:r><w:t xml:space="preserve">${escapeXml(p.text)}</w:t></w:r></w:p>`,
    )
    .join('');
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: 'uint8array' });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
