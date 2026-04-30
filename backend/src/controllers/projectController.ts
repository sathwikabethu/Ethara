import { Request, Response } from 'express';
import { ProjectService } from '../services/projectService';
import { createProjectSchema, updateProjectSchema, inviteMemberSchema } from '@ethara/shared';

export class ProjectController {
  static async list(req: Request, res: Response) {
    const projects = await ProjectService.listProjects(req.user!.id);
    res.json({ success: true, data: projects });
  }

  static async create(req: Request, res: Response) {
    const data = createProjectSchema.parse(req.body);
    const project = await ProjectService.createProject(req.user!.id, data);
    res.status(201).json({ success: true, data: project });
  }

  static async getDetails(req: Request, res: Response) {
    const project = await ProjectService.getProjectDetails(req.params.id as string);
    res.json({ success: true, data: project });
  }

  static async update(req: Request, res: Response) {
    const data = updateProjectSchema.parse(req.body);
    const project = await ProjectService.updateProject(req.params.id as string, req.user!.id, data);
    res.json({ success: true, data: project });
  }

  static async delete(req: Request, res: Response) {
    await ProjectService.deleteProject(req.params.id as string);
    res.json({ success: true, data: null });
  }

  static async addMember(req: Request, res: Response) {
    const data = inviteMemberSchema.parse(req.body);
    try {
      const member = await ProjectService.addMember(req.params.id as string, req.user!.id, data.email);
      res.status(201).json({ success: true, data: member });
    } catch (error: any) {
      if (error.message === 'User not found' || error.message === 'User is already a member') {
        return res.status(400).json({ success: false, error: error.message });
      }
      throw error;
    }
  }

  static async removeMember(req: Request, res: Response) {
    try {
      await ProjectService.removeMember(req.params.id as string, req.user!.id, req.params.userId as string);
      res.json({ success: true, data: null });
    } catch (error: any) {
      if (error.message === 'Cannot remove yourself' || error.message === 'Member not found') {
        return res.status(400).json({ success: false, error: error.message });
      }
      throw error;
    }
  }
}
