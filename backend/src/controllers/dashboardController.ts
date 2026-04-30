import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboardService';

export class DashboardController {
  static async getDashboard(req: Request, res: Response) {
    const stats = await DashboardService.getDashboardStats(req.user!.id);
    res.json({ success: true, data: stats });
  }
}
