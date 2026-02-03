import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  botId: mongoose.Types.ObjectId;
  sessionId: string;
  channel: string;
  user?: {
    userId?: string;
    name?: string;
    email?: string;
  };
  messages: {
    sender: 'user' | 'bot';
    text: string;
    timestamp: Date;
    nlp?: {
      intent: string | null;
      confidence: number;
      source: string;
    };
  }[];
  status: 'active' | 'resolved' | 'abandoned' | 'ended' | 'escalated';
  startedAt: Date;
  lastActivityAt: Date;
  endedAt?: Date;
  escalation?: {
    wasEscalated: boolean;
    reason?: string;
    escalatedAt?: Date;
    resolvedAt?: Date;
    resolvedBy?: string;
  };
  feedback?: {
    rating?: number;
    comment?: string;
    submittedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    botId: { type: Schema.Types.ObjectId, ref: 'Bot', required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    channel: { type: String, default: 'web', index: true },
    user: {
      userId: String,
      name: String,
      email: String,
    },
    messages: [
      {
        sender: { type: String, enum: ['user', 'bot'], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        nlp: {
          intent: String,
          confidence: Number,
          source: String,
        },
      },
    ],
    status: { type: String, enum: ['active', 'resolved', 'abandoned', 'ended', 'escalated'], default: 'active' },
    startedAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
    endedAt: Date,
    escalation: {
      wasEscalated: { type: Boolean, default: false },
      reason: String,
      escalatedAt: Date,
      resolvedAt: Date,
      resolvedBy: String,
    },
    feedback: {
      rating: Number,
      comment: String,
      submittedAt: Date,
    },
  },
  { timestamps: true }
);

ConversationSchema.index({ botId: 1, sessionId: 1 }, { unique: true });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
