import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { registerSchema, loginSchema } from '@ethara/shared';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

export class AuthController {
  static async register(req: Request, res: Response) {
    const data = registerSchema.parse(req.body);
    
    try {
      const user = await AuthService.register(data);
      
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 }); // 15m
      res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7d

      res.status(201).json({ success: true, data: user });
    } catch (error: any) {
      if (error.message === 'Email is already registered') {
        return res.status(409).json({ success: false, error: error.message });
      }
      throw error;
    }
  }

  static async login(req: Request, res: Response) {
    const data = loginSchema.parse(req.body);
    
    try {
      const user = await AuthService.login(data);

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
      res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });

      res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      if (error.message === 'Invalid email or password') {
        return res.status(401).json({ success: false, error: error.message });
      }
      throw error;
    }
  }

  static async refresh(req: Request, res: Response) {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No refresh token' });
    }

    const payload = verifyRefreshToken(token);

    if (!payload) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid refresh token' });
    }

    const user = await AuthService.getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
    }

    const newAccessToken = generateAccessToken(user.id);
    res.cookie('accessToken', newAccessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });

    res.status(200).json({ success: true, data: user });
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(200).json({ success: true, data: null });
  }

  static async me(req: Request, res: Response) {
    // Requires requireAuth middleware
    const user = await AuthService.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  }
}
