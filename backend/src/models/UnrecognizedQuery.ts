import mongoose, { Document, Schema } from 'mongoose';

export interface IUnrecognizedQuery extends Document {
  _id: mongoose.Types.ObjectId;
  botId: mongoose.Types.ObjectId;
  text: string;
  sessionId?: string;
  count: number;
  lastSeenAt: Date;
  status: 'pending' | 'converted' | 'dismissed';
  convertedToIntentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UnrecognizedQuerySchema = new Schema<IUnrecognizedQuery>(
  {
    botId: { type: Schema.Types.ObjectId, ref: 'Bot', required: true, index: true },
    text: { type: String, required: true, trim: true },
    sessionId: String,
    count: { type: Number, default: 1 },
    lastSeenAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'converted', 'dismissed'], default: 'pending' },
    convertedToIntentId: { type: Schema.Types.ObjectId, ref: 'Intent' },
  },
  { timestamps: true }
);

UnrecognizedQuerySchema.index({ botId: 1, status: 1 });

export const UnrecognizedQuery = mongoose.model<IUnrecognizedQuery>('UnrecognizedQuery', UnrecognizedQuerySchema);
