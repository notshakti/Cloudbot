import * as path from 'path';

// Dynamic imports for optional deps (pdf-parse has no types, mammoth/cheerio have)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mammoth = require('mammoth');

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

function chunkText(text: string): { text: string; metadata?: Record<string, unknown> }[] {
  const chunks: { text: string; metadata?: Record<string, unknown> }[] = [];
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return chunks;
  let start = 0;
  let index = 0;
  while (start < normalized.length) {
    let end = Math.min(start + CHUNK_SIZE, normalized.length);
    if (end < normalized.length) {
      const lastSpace = normalized.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace;
    }
    const slice = normalized.slice(start, end).trim();
    if (slice) chunks.push({ text: slice, metadata: { index, start, end } });
    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
    index++;
  }
  return chunks;
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename?: string
): Promise<{ rawText: string; wordCount: number }> {
  const ext = filename ? path.extname(filename).toLowerCase() : '';
  let rawText = '';

  if (mimeType === 'application/pdf' || ext === '.pdf') {
    const data = await pdfParse(buffer);
    rawText = (data?.text || '').trim();
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    rawText = (result?.value || '').trim();
  } else if (
    mimeType === 'text/plain' ||
    mimeType === 'text/csv' ||
    ext === '.txt' ||
    ext === '.csv'
  ) {
    rawText = buffer.toString('utf-8').trim();
  } else {
    rawText = buffer.toString('utf-8').replace(/\s+/g, ' ').trim();
  }

  const wordCount = rawText ? rawText.split(/\s+/).length : 0;
  return { rawText, wordCount };
}

export function chunkAndProcess(rawText: string): {
  processedText: string;
  chunks: { text: string; metadata?: Record<string, unknown> }[];
} {
  const processedText = rawText.replace(/\s+/g, ' ').trim();
  const chunks = chunkText(processedText);
  return { processedText, chunks };
}

export async function scrapeUrl(url: string): Promise<{ rawText: string; title: string }> {
  const cheerio = await import('cheerio');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CloudBot/1.0 (Knowledge Base Scraper)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, aside, form').remove();
  const title = $('title').text().trim() || url;
  const body = $('body').text().replace(/\s+/g, ' ').trim();
  return { rawText: body, title };
}
