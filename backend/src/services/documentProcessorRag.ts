/**
 * RAG document processor – extract text from PDF, DOCX, TXT, CSV, URL and chunk for vector indexing.
 * Uses existing documentProcessor for file extraction; adds semantic chunking and URL→Markdown.
 */

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { extractTextFromBuffer } from './documentProcessor';

export interface RagChunk {
  text: string;
  metadata: {
    documentId: string;
    botId: string;
    source: string;
    title: string;
    chunkIndex: number;
    totalChunks: number;
    wordCount: number;
    createdAt: string;
  };
}

export interface ProcessDocumentResult {
  chunks: RagChunk[];
  totalChunks: number;
  totalCharacters: number;
  documentTitle: string;
}

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ', ''],
});

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatCsvToText(csv: string): string {
  const lines = csv.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return '';
  const headers = lines[0].split(',').map((h) => h.trim());
  let out = `CSV with columns: ${headers.join(', ')}\n\n`;
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    if (values.length >= headers.length) {
      out += `Row ${i}: `;
      headers.forEach((h, idx) => {
        out += `${h}=${values[idx] || ''}; `;
      });
      out += '\n';
    }
  }
  return out;
}

/**
 * Process document from file or URL for RAG: extract text, chunk, attach metadata.
 */
export async function processDocumentForRag(
  botId: string,
  documentId: string,
  file: (Express.Multer.File & { buffer: Buffer }) | null,
  url: string | null
): Promise<ProcessDocumentResult> {
  let rawText = '';
  let documentTitle = '';
  let source = '';

  if (file) {
    const ext = file.originalname ? file.originalname.toLowerCase().slice(-4) : '';
    const { rawText: text, wordCount: _wc } = await extractTextFromBuffer(
      file.buffer,
      file.mimetype,
      file.originalname
    );
    rawText = text;
    documentTitle = (file.originalname || 'document').replace(/\.(pdf|docx|doc|txt|csv)$/i, '');
    source = file.originalname || 'file';
    if (file.mimetype === 'text/csv' || ext === '.csv') {
      rawText = formatCsvToText(rawText);
    }
  } else if (url) {
    const { rawText: scraped, title } = await scrapeUrlToMarkdown(url);
    rawText = scraped;
    documentTitle = title || url;
    source = url;
  } else {
    throw new Error('Either file or URL must be provided');
  }

  const cleaned = cleanText(rawText);
  const textChunks = await textSplitter.splitText(cleaned);

  const chunks: RagChunk[] = textChunks.map((text, index) => ({
    text,
    metadata: {
      documentId,
      botId,
      source,
      title: documentTitle,
      chunkIndex: index,
      totalChunks: textChunks.length,
      wordCount: text.split(/\s+/).length,
      createdAt: new Date().toISOString(),
    },
  }));

  return {
    chunks,
    totalChunks: chunks.length,
    totalCharacters: cleaned.length,
    documentTitle,
  };
}

/**
 * Scrape URL and convert main content HTML to Markdown for better structure.
 * Uses browser-like headers to reduce 403 blocks from strict sites.
 */
async function scrapeUrlToMarkdown(url: string): Promise<{ rawText: string; title: string }> {
  let response: Awaited<ReturnType<typeof axios.get>>;
  try {
    response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });
  } catch (err: unknown) {
    const ax = err as { response?: { status: number }; message?: string };
    if (ax?.response?.status === 403) {
      throw new Error(
        'The website blocked our request (403 Forbidden). Try a different URL, or save the page as PDF and upload it here.'
      );
    }
    if (ax?.response?.status === 401) {
      throw new Error('The website requires login (401). Use a public URL or upload the content as a file.');
    }
    if (ax?.response?.status === 404) {
      throw new Error('The URL was not found (404). Check the link or try another page.');
    }
    throw err;
  }
  const html = response.data as string;
  const $ = cheerio.load(html);
  const title = $('title').text().trim() || $('h1').first().text().trim() || url;

  $('script, style, nav, header, footer, aside, form, .advertisement, .cookie-banner').remove();
  let mainHtml = '';
  if ($('main').length) mainHtml = $('main').html() || '';
  else if ($('article').length) mainHtml = $('article').html() || '';
  else if ($('.content').length) mainHtml = $('.content').html() || '';
  else mainHtml = $('body').html() || '';

  const markdown = turndownService.turndown(mainHtml);
  const rawText = markdown.replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return { rawText, title };
}
