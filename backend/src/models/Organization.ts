import mongoose, { Document, Schema } from 'mongoose';
import type { Plan } from '../types';

export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  plan: Plan;
  billing: {
    subscriptionId?: string;
    status?: string;
    currentPeriodEnd?: Date;
    usage: {
      botsCreated: number;
      messagesSent: number;
      storageUsed: number;
    };
  };
  members: {
    userId: mongoose.Types.ObjectId;
    role: string;
    permissions: string[];
  }[];
  apiKeys: {
    key: string;
    name: string;
    createdAt: Date;
    lastUsed?: Date;
  }[];
  settings: {
    timezone: string;
    language: string;
    whiteLabel: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    plan: { type: String, enum: ['free', 'starter', 'professional', 'enterprise'], default: 'free' },
    billing: {
      subscriptionId: String,
      status: String,
      currentPeriodEnd: Date,
      usage: {
        botsCreated: { type: Number, default: 0 },
        messagesSent: { type: Number, default: 0 },
        storageUsed: { type: Number, default: 0 },
      },
    },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], default: 'viewer' },
        permissions: [String],
      },
    ],
    apiKeys: [
      {
        key: String,
        name: String,
        createdAt: { type: Date, default: Date.now },
        lastUsed: Date,
      },
    ],
    settings: {
      timezone: { type: String, default: 'UTC' },
      language: { type: String, default: 'en' },
      whiteLabel: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

OrganizationSchema.index({ email: 1 });

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
