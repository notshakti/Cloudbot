import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types';
import { KnowledgeBase } from '../models/KnowledgeBase';
import { extractTextFromBuffer, chunkAndProcess, scrapeUrl } from '../services/documentProcessor';
import type { MulterRequest } from '../types';

export async function listKnowledgeBase(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const items = await KnowledgeBase.find({ botId }).sort({ updatedAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    console.error('[KB] List error:', err);
    res.status(500).json({ success: false, message: 'Failed to list knowledge base' });
  }
}

export async function uploadDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const userId = req.user!.userId;
    const file = (req as MulterRequest).file;
    if (!file || !file.buffer) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
    const kb = await KnowledgeBase.create({
      botId,
      type: 'document',
      source: {
        filename: file.originalname,
        fileType: file.mimetype,
        uploadedBy: new mongoose.Types.ObjectId(userId),
        uploadedAt: new Date(),
      },
      content: { rawText: '', processedText: '', chunks: [], language: 'en' },
      metadata: { title: file.originalname, wordCount: 0 },
      processing: { status: 'pending' },
    });
    res.status(201).json({ success: true, data: kb });
    processDocumentAsync(kb._id.toString(), file.buffer, file.mimetype, file.originalname).catch((e) =>
      console.error('[KB] Process error:', e)
    );
  } catch (err) {
    console.error('[KB] Upload error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
}

async function processDocumentAsync(
  kbId: string,
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<void> {
  try {
    await KnowledgeBase.findByIdAndUpdate(kbId, {
      'processing.status': 'processing',
    });
    const { rawText, wordCount } = await extractTextFromBuffer(buffer, mimeType, filename);
    const { processedText, chunks } = chunkAndProcess(rawText);
    await KnowledgeBase.findByIdAndUpdate(kbId, {
      'content.rawText': rawText,
      'content.processedText': processedText,
      'content.chunks': chunks,
      'metadata.wordCount': wordCount,
      'processing.status': 'completed',
      'processing.processedAt': new Date(),
      'processing.errorMessage': undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed';
    await KnowledgeBase.findByIdAndUpdate(kbId, {
      'processing.status': 'failed',
      'processing.processedAt': new Date(),
      'processing.errorMessage': message,
    });
  }
}

export async function addUrl(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const userId = req.user!.userId;
    const { url, title } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, message: 'URL is required' });
      return;
    }
    const kb = await KnowledgeBase.create({
      botId,
      type: 'url',
      source: {
        url,
        originalUrl: url,
        uploadedBy: new mongoose.Types.ObjectId(userId),
        uploadedAt: new Date(),
      },
      content: { rawText: '', processedText: '', chunks: [], language: 'en' },
      metadata: { title: title || url, wordCount: 0 },
      processing: { status: 'pending' },
    });
    res.status(201).json({ success: true, data: kb });
    processUrlAsync(kb._id.toString(), url).catch((e) => console.error('[KB] URL process error:', e));
  } catch (err) {
    console.error('[KB] Add URL error:', err);
    res.status(500).json({ success: false, message: 'Failed to add URL' });
  }
}

async function processUrlAsync(kbId: string, url: string): Promise<void> {
  try {
    await KnowledgeBase.findByIdAndUpdate(kbId, { 'processing.status': 'processing' });
    const { rawText, title } = await scrapeUrl(url);
    const { processedText, chunks } = chunkAndProcess(rawText);
    const wordCount = rawText ? rawText.split(/\s+/).length : 0;
    await KnowledgeBase.findByIdAndUpdate(kbId, {
      'content.rawText': rawText,
      'content.processedText': processedText,
      'content.chunks': chunks,
      'metadata.title': title,
      'metadata.wordCount': wordCount,
      'processing.status': 'completed',
      'processing.processedAt': new Date(),
      'processing.errorMessage': undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scraping failed';
    await KnowledgeBase.findByIdAndUpdate(kbId, {
      'processing.status': 'failed',
      'processing.processedAt': new Date(),
      'processing.errorMessage': message,
    });
  }
}

export async function addFaq(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const userId = req.user!.userId;
    const { question, answer, category } = req.body;
    if (!question || !answer) {
      res.status(400).json({ success: false, message: 'Question and answer are required' });
      return;
    }
    const rawText = `Q: ${question}\nA: ${answer}`;
    const { processedText, chunks } = chunkAndProcess(rawText);
    const kb = await KnowledgeBase.create({
      botId,
      type: 'faq',
      source: {
        uploadedBy: new mongoose.Types.ObjectId(userId),
        uploadedAt: new Date(),
      },
      content: {
        rawText,
        processedText,
        chunks,
        language: 'en',
      },
      metadata: {
        title: question.slice(0, 80),
        category: category || '',
        wordCount: rawText.split(/\s+/).length,
      },
      processing: { status: 'completed', processedAt: new Date() },
    });
    res.status(201).json({ success: true, data: kb });
  } catch (err) {
    console.error('[KB] Add FAQ error:', err);
    res.status(500).json({ success: false, message: 'Failed to add FAQ' });
  }
}

export async function getKnowledgeBaseItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId, kbId } = req.params;
    const item = await KnowledgeBase.findOne({ _id: kbId, botId });
    if (!item) {
      res.status(404).json({ success: false, message: 'Knowledge base item not found' });
      return;
    }
    res.json({ success: true, data: item });
  } catch (err) {
    console.error('[KB] Get error:', err);
    res.status(500).json({ success: false, message: 'Failed to get item' });
  }
}

export async function updateKnowledgeBaseItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId, kbId } = req.params;
    const allowed = ['metadata', 'isActive'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const item = await KnowledgeBase.findOneAndUpdate(
      { _id: kbId, botId },
      { $set: update },
      { new: true }
    );
    if (!item) {
      res.status(404).json({ success: false, message: 'Knowledge base item not found' });
      return;
    }
    res.json({ success: true, data: item });
  } catch (err) {
    console.error('[KB] Update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update item' });
  }
}

export async function deleteKnowledgeBaseItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId, kbId } = req.params;
    const item = await KnowledgeBase.findOneAndDelete({ _id: kbId, botId });
    if (!item) {
      res.status(404).json({ success: false, message: 'Knowledge base item not found' });
      return;
    }
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    console.error('[KB] Delete error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete item' });
  }
}

export async function searchKnowledgeBase(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { q } = req.query;
    const query = typeof q === 'string' ? q.trim() : '';
    if (!query) {
      res.status(400).json({ success: false, message: 'Search query (q) is required' });
      return;
    }
    const items = await KnowledgeBase.find({
      botId,
      isActive: true,
      'processing.status': 'completed',
    }).select('content.chunks content.processedText metadata type');
    const results: { kbId: string; type: string; title: string; matches: { text: string; score: number }[] }[] = [];
    const lowerQuery = query.toLowerCase();
    for (const item of items) {
      const chunks = item.content?.chunks || [];
      const matches: { text: string; score: number }[] = [];
      for (const ch of chunks) {
        const text = ch.text || '';
        if (!text) continue;
        const idx = text.toLowerCase().indexOf(lowerQuery);
        if (idx >= 0) {
          const score = 1 - idx / Math.max(text.length, 1);
          matches.push({ text: text.slice(0, 300), score });
        }
      }
      if (matches.length > 0) {
        results.push({
          kbId: item._id.toString(),
          type: item.type,
          title: item.metadata?.title || 'Untitled',
          matches: matches.slice(0, 5),
        });
      }
    }
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('[KB] Search error:', err);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
}
