import mongoose, { Document, Schema } from 'mongoose';

export interface IIntent extends Document {
  _id: mongoose.Types.ObjectId;
  botId: mongoose.Types.ObjectId;
  name: string;
  displayName: string;
  category: string;
  trainingPhrases: { text: string; language: string; parameters?: { name: string; entity: string; value: string }[] }[];
  responses: {
    text: string;
    language: string;
    variations?: string[];
    richContent?: { type: string; content: Record<string, unknown> };
  }[];
  parameters: {
    name: string;
    entityType: string;
    required: boolean;
    prompts: string[];
    defaultValue?: unknown;
  }[];
  contexts: { input: string[]; output: string[]; lifespan: number };
  priority: number;
  isActive: boolean;
  metadata: { usageCount: number; averageConfidence: number; lastUsed?: Date };
  createdAt: Date;
  updatedAt: Date;
}

const IntentSchema = new Schema<IIntent>(
  {
    botId: { type: Schema.Types.ObjectId, ref: 'Bot', required: true, index: true },
    name: { type: String, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    category: { type: String, default: '', trim: true },
    trainingPhrases: [
      {
        text: { type: String, required: true },
        language: { type: String, default: 'en' },
        parameters: [{ name: String, entity: String, value: String }],
      },
    ],
    responses: [
      {
        text: { type: String, required: true },
        language: { type: String, default: 'en' },
        variations: [String],
        richContent: { type: Schema.Types.Mixed },
      },
    ],
    parameters: [
      {
        name: String,
        entityType: String,
        required: { type: Boolean, default: false },
        prompts: [String],
        defaultValue: Schema.Types.Mixed,
      },
    ],
    contexts: {
      input: { type: [String], default: [] },
      output: { type: [String], default: [] },
      lifespan: { type: Number, default: 5 },
    },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    metadata: {
      usageCount: { type: Number, default: 0 },
      averageConfidence: { type: Number, default: 0 },
      lastUsed: Date,
    },
  },
  { timestamps: true }
);

IntentSchema.index({ botId: 1, name: 1 }, { unique: true });

export const Intent = mongoose.model<IIntent>('Intent', IntentSchema);
