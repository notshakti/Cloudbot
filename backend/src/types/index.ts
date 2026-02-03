import { Request } from 'express';

export type Plan = 'free' | 'starter' | 'professional' | 'enterprise';

export type BotType =
  | 'customer_service'
  | 'medical'
  | 'ecommerce'
  | 'hr'
  | 'education'
  | 'real_estate'
  | 'financial'
  | 'restaurant'
  | 'it_helpdesk'
  | 'custom';

export type BotStatus = 'active' | 'paused' | 'training' | 'draft';

export type OrgMemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface JwtPayload {
  userId: string;
  orgId: string;
  email: string;
  role: OrgMemberRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export type MulterRequest = Request & {
  file?: { buffer: Buffer; originalname: string; mimetype: string; fieldname: string; size: number };
};
