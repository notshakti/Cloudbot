import mongoose, { Document, Schema } from 'mongoose';

export type KBType = 'document' | 'url' | 'faq' | 'manual_entry';

export interface IKnowledgeBase extends Document {
  _id: mongoose.Types.ObjectId;
  botId: mongoose.Types.ObjectId;
  type: KBType;
  source: {
    filename?: string;
    url?: string;
    originalUrl?: string;
    fileType?: string;
    uploadedBy: mongoose.Types.ObjectId;
    uploadedAt: Date;
  };
  content: {
    rawText: string;
    processedText: string;
    chunks: { text: string; metadata?: Record<string, unknown> }[];
    language: string;
  };
  metadata: {
    title: string;
    description: string;
    category: string;
    tags: string[];
    version: string;
    wordCount: number;
  };
  processing: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    processedAt?: Date;
    errorMessage?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeBaseSchema = new Schema<IKnowledgeBase>(
  {
    botId: { type: Schema.Types.ObjectId, ref: 'Bot', required: true, index: true },
    type: { type: String, enum: ['document', 'url', 'faq', 'manual_entry'], required: true },
    source: {
      filename: String,
      url: String,
      originalUrl: String,
      fileType: String,
      uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      uploadedAt: { type: Date, default: Date.now },
    },
    content: {
      rawText: { type: String, default: '' },
      processedText: { type: String, default: '' },
      chunks: [
        {
          text: String,
          metadata: Schema.Types.Mixed,
        },
      ],
      language: { type: String, default: 'en' },
    },
    metadata: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      category: { type: String, default: '' },
      tags: { type: [String], default: [] },
      version: { type: String, default: '1.0' },
      wordCount: { type: Number, default: 0 },
    },
    processing: {
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
      processedAt: Date,
      errorMessage: String,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

KnowledgeBaseSchema.index({ botId: 1 });

export const KnowledgeBase = mongoose.model<IKnowledgeBase>('KnowledgeBase', KnowledgeBaseSchema);
