import { Request, Response } from 'express';
import Joi from 'joi';
import bcrypt from 'bcrypt';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import type { JwtPayload } from '../types';

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(1).trim().required(),
  organizationName: Joi.string().min(1).trim().required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, message: error.details[0].message });
      return;
    }

    const existingUser = await User.findOne({ email: value.email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(value.password, 12);

    const org = await Organization.create({
      name: value.organizationName,
      email: value.email.toLowerCase(),
      plan: 'free',
      billing: { usage: { botsCreated: 0, messagesSent: 0, storageUsed: 0 } },
      members: [], // will add user below
      apiKeys: [],
      settings: { timezone: 'UTC', language: 'en', whiteLabel: false },
    });

    const user = await User.create({
      email: value.email.toLowerCase(),
      password: hashedPassword,
      name: value.name,
      organizations: [{ orgId: org._id, role: 'owner' }],
    });

    await Organization.findByIdAndUpdate(org._id, {
      $push: { members: { userId: user._id, role: 'owner', permissions: ['*'] } },
    });

    const tokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user._id.toString(),
      orgId: org._id.toString(),
      email: user.email,
      role: 'owner',
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          organizationId: org._id,
          organizationName: org.name,
          role: 'owner',
        },
        accessToken,
        refreshToken,
        expiresIn: '7d',
      },
    });
  } catch (err) {
    console.error('[Auth] Signup error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, message: error.details[0].message });
      return;
    }

    const user = await User.findOne({ email: value.email.toLowerCase() })
      .select('+password')
      .populate('organizations.orgId', 'name');
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const match = await bcrypt.compare(value.password, user.password);
    if (!match) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const firstOrg = user.organizations[0];
    if (!firstOrg?.orgId) {
      res.status(400).json({ success: false, message: 'No organization found' });
      return;
    }

    const orgId = typeof firstOrg.orgId === 'object' ? (firstOrg.orgId as { _id: unknown })._id : firstOrg.orgId;
    const orgIdStr = typeof orgId === 'object' && orgId !== null && '_id' in orgId ? String((orgId as { _id: unknown })._id) : String(orgId);

    const tokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user._id.toString(),
      orgId: orgIdStr,
      email: user.email,
      role: firstOrg.role as 'owner' | 'admin' | 'editor' | 'viewer',
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          organizationId: orgIdStr,
          organizationName: typeof firstOrg.orgId === 'object' && firstOrg.orgId !== null && 'name' in firstOrg.orgId ? (firstOrg.orgId as { name: string }).name : 'Organization',
          role: firstOrg.role,
        },
        accessToken,
        refreshToken,
        expiresIn: '7d',
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      res.status(400).json({ success: false, message: 'Refresh token required' });
      return;
    }

    const { userId } = verifyRefreshToken(token);
    const user = await User.findById(userId).populate('organizations.orgId', 'name');
    if (!user || !user.organizations?.length) {
      res.status(401).json({ success: false, message: 'Invalid refresh token' });
      return;
    }

    const firstOrg = user.organizations[0];
    const orgId = typeof firstOrg.orgId === 'object' ? (firstOrg.orgId as { _id: unknown })._id : firstOrg.orgId;
    const orgIdStr = typeof orgId === 'object' && orgId !== null && '_id' in orgId ? String((orgId as { _id: unknown })._id) : String(orgId);

    const tokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user._id.toString(),
      orgId: orgIdStr,
      email: user.email,
      role: firstOrg.role as 'owner' | 'admin' | 'editor' | 'viewer',
    };

    const accessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken({ userId: user._id.toString() });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: '7d',
      },
    });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
}
