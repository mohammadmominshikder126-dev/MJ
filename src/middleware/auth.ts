import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { ADMIN_EMAIL, getOrCreateUser } from '../db/users.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbRole?: string;
}

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing authentication token.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Empty authentication token.' });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email || !decoded.email_verified) {
      res.status(403).json({ error: 'Forbidden: Verified Google email is required.' });
      return;
    }

    const dbUser = await getOrCreateUser(decoded.uid, decoded.email);
    const isPrimaryAdmin =
      decoded.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || dbUser?.role === 'admin';

    if (!isPrimaryAdmin) {
      res.status(403).json({
        error: `Access denied for ${decoded.email}. Only ${ADMIN_EMAIL} is authorized.`,
      });
      return;
    }

    req.user = decoded;
    req.dbRole = dbUser?.role || 'admin';
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token.' });
  }
};
