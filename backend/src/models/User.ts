import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  organizations: { orgId: mongoose.Types.ObjectId; role: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    name: { type: String, required: true, trim: true },
    organizations: [
      {
        orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], default: 'viewer' },
      },
    ],
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ 'organizations.orgId': 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
