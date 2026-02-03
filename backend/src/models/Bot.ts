import mongoose, { Document, Schema } from 'mongoose';
import type { BotType, BotStatus } from '../types';

export interface IBot extends Document {
  _id: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  name: string;
  type: BotType;
  description: string;
  status: BotStatus;
  version: string;
  config: {
    language: string;
    tone: string;
    avatar?: string;
    welcomeMessage: string;
    confidenceThreshold: number;
    fallbackMessages: string[];
    operatingHours?: {
      enabled: boolean;
      timezone: string;
      schedule: Record<string, unknown>;
    };
    features?: {
      humanHandoff?: boolean;
      leadCapture?: boolean;
      leadCaptureFields?: { name: string; type: 'text' | 'email' | 'phone'; required: boolean; label: string }[];
    };
    languages?: string[];
    /** LLM-first hybrid: 'llm_first' | 'hybrid' | 'intent_only'. Default intent_only for backward compat. */
    aiMode?: 'llm_first' | 'hybrid' | 'intent_only';
    /** OpenAI (or other LLM) config when aiMode is llm_first or hybrid */
    aiConfig?: {
      primaryLLM?: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
      temperature?: number;
      maxTokens?: number;
      ragEnabled?: boolean;
      contextWindowSize?: number;
      fallbackToIntent?: boolean;
    };
  };
  appearance: {
    primaryColor: string;
    secondaryColor: string;
    position: string;
    size: string;
    theme: 'light' | 'dark';
  };
  integrations: {
    website: { enabled: boolean; embedCode?: string; domains: string[] };
    channels: Record<string, { enabled: boolean; [key: string]: unknown }>;
    crm?: { enabled: boolean; type?: string; webhookUrl?: string; [key: string]: unknown };
  };
  analytics: {
    totalConversations: number;
    totalMessages: number;
    averageRating: number;
    activeUsers: number;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  lastDeployedAt?: Date;
}

const BotSchema = new Schema<IBot>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        'customer_service',
        'medical',
        'ecommerce',
        'hr',
        'education',
        'real_estate',
        'financial',
        'restaurant',
        'it_helpdesk',
        'custom',
      ],
      default: 'custom',
    },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'paused', 'training', 'draft'], default: 'draft' },
    version: { type: String, default: '1.0.0' },
    config: {
      language: { type: String, default: 'en' },
      tone: { type: String, default: 'professional' },
      avatar: String,
      welcomeMessage: { type: String, default: 'Hello! How can I help you today?' },
      confidenceThreshold: { type: Number, default: 0.7 },
      fallbackMessages: { type: [String], default: ["I'm not sure I understood. Could you rephrase?"] },
      operatingHours: {
        enabled: { type: Boolean, default: false },
        timezone: { type: String, default: 'UTC' },
        schedule: Schema.Types.Mixed,
      },
      features: {
        humanHandoff: { type: Boolean, default: false },
        leadCapture: { type: Boolean, default: false },
        leadCaptureFields: Schema.Types.Mixed,
      },
      languages: [String],
      aiMode: { type: String, enum: ['llm_first', 'hybrid', 'intent_only'], default: 'intent_only' },
      aiConfig: {
        primaryLLM: { type: String, enum: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'], default: 'gpt-3.5-turbo' },
        temperature: { type: Number, default: 0.7 },
        maxTokens: { type: Number, default: 500 },
        ragEnabled: { type: Boolean, default: true },
        contextWindowSize: { type: Number, default: 10 },
        fallbackToIntent: { type: Boolean, default: true },
      },
    },
    appearance: {
      primaryColor: { type: String, default: '#6366f1' },
      secondaryColor: { type: String, default: '#8b5cf6' },
      position: { type: String, default: 'bottom-right' },
      size: { type: String, default: 'medium' },
      theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
    },
    integrations: {
      website: {
        enabled: { type: Boolean, default: true },
        embedCode: String,
        domains: { type: [String], default: [] },
      },
      channels: { type: Schema.Types.Mixed, default: {} },
      crm: { type: Schema.Types.Mixed },
    },
    analytics: {
      totalConversations: { type: Number, default: 0 },
      totalMessages: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      activeUsers: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastDeployedAt: Date,
  },
  { timestamps: true }
);

BotSchema.index({ orgId: 1, name: 1 });

export const Bot = mongoose.model<IBot>('Bot', BotSchema);
