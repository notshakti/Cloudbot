import mongoose, { Document, Schema } from 'mongoose';

export interface ILead extends Document {
  _id: mongoose.Types.ObjectId;
  botId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  sessionId: string;
  channel: string;
  name?: string;
  email?: string;
  phone?: string;
  customFields: Record<string, string>;
  capturedAt: Date;
  crmSynced?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    botId: { type: Schema.Types.ObjectId, ref: 'Bot', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sessionId: { type: String, required: true, index: true },
    channel: { type: String, default: 'web' },
    name: String,
    email: String,
    phone: String,
    customFields: { type: Schema.Types.Mixed, default: {} },
    capturedAt: { type: Date, default: Date.now },
    crmSynced: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LeadSchema.index({ botId: 1, capturedAt: -1 });

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);
