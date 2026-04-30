import { Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { createTaskSchema, updateTaskSchema, createCommentSchema } from '@ethara/shared';

export class TaskController {
  static async list(req: Request, res: Response) {
    const tasks = await TaskService.listTasks(req.params.id as string, req.query);
    res.json({ success: true, data: tasks });
  }

  static async create(req: Request, res: Response) {
    const data = createTaskSchema.parse(req.body);
    const task = await TaskService.createTask(req.params.id as string, req.user!.id, data);
    res.status(201).json({ success: true, data: task });
  }

  static async update(req: Request, res: Response) {
    const data = updateTaskSchema.parse(req.body);
    try {
      const task = await TaskService.updateTask(req.params.id as string, req.params.taskId as string, req.user!.id, data);
      res.json({ success: true, data: task });
    } catch (error: any) {
      if (error.message === 'Only assignee, creator, or admin can update this task' || error.message === 'Unauthorized') {
        return res.status(403).json({ success: false, error: error.message });
      }
      throw error;
    }
  }

  static async delete(req: Request, res: Response) {
    await TaskService.deleteTask(req.params.id as string, req.params.taskId as string);
    res.json({ success: true, data: null });
  }

  static async addComment(req: Request, res: Response) {
    const data = createCommentSchema.parse(req.body);
    const comment = await TaskService.addComment(req.params.id as string, req.params.taskId as string, req.user!.id, data);
    res.status(201).json({ success: true, data: comment });
  }

  static async listComments(req: Request, res: Response) {
    const comments = await TaskService.listComments(req.params.taskId as string);
    res.json({ success: true, data: comments });
  }
}
