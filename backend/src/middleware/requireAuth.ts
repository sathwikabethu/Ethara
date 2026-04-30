import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No access token' });
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
  }

  req.user = { id: payload.userId };
  next();
};

export const requireProjectMember = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const projectId = (req.params.id || req.params.projectId) as string;

  if (!projectId) {
    return res.status(400).json({ success: false, error: 'Project ID is required in params' });
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId: req.user.id,
        projectId,
      },
    },
  });

  if (!membership) {
    return res.status(403).json({ success: false, error: 'Forbidden: You are not a member of this project' });
  }

  next();
};

export const requireProjectAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const projectId = (req.params.id || req.params.projectId) as string;

  if (!projectId) {
    return res.status(400).json({ success: false, error: 'Project ID is required in params' });
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId: req.user.id,
        projectId,
      },
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
  }

  next();
};
