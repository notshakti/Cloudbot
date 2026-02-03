import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User';
import { Organization } from '../models/Organization';

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('email name organizations');
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    const orgMember = user.organizations.find(
      (o) => o.orgId?.toString() === decoded.orgId
    );
    if (!orgMember) {
      res.status(403).json({ success: false, message: 'Access denied to this organization' });
      return;
    }

    req.user = {
      userId: user._id.toString(),
      orgId: decoded.orgId,
      email: user.email,
      role: orgMember.role as 'owner' | 'admin' | 'editor' | 'viewer',
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
