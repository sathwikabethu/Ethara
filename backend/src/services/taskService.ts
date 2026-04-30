import { PrismaClient, TaskStatus, TaskPriority, Role } from '@prisma/client';
import { CreateTaskInput, UpdateTaskInput, CreateCommentInput } from '@ethara/shared';

const prisma = new PrismaClient();

export class TaskService {
  static async listTasks(projectId: string, filters: any) {
    const where: any = { projectId };

    if (filters.status) where.status = filters.status;
    if (filters.assigneeId) where.assignedToId = filters.assigneeId;
    if (filters.priority) where.priority = filters.priority;
    if (filters.overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { not: TaskStatus.DONE };
    }

    return prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createTask(projectId: string, userId: string, data: CreateTaskInput) {
    return prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: data.title,
          description: data.description,
          status: data.status as TaskStatus || TaskStatus.TODO,
          priority: data.priority as TaskPriority || TaskPriority.MEDIUM,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          assignedToId: data.assignedToId,
          projectId,
          createdById: userId,
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          action: 'TASK_CREATED',
          entityType: 'TASK',
          entityId: task.id,
          userId,
          projectId,
          meta: { title: task.title, assignedToId: data.assignedToId },
        },
      });

      return task;
    });
  }

  static async updateTask(projectId: string, taskId: string, userId: string, data: UpdateTaskInput) {
    // Need to verify if user is assignee or ADMIN
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Task not found');

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });

    if (!membership) throw new Error('Unauthorized');
    if (membership.role !== Role.ADMIN && task.assignedToId !== userId && task.createdById !== userId) {
      throw new Error('Only assignee, creator, or admin can update this task');
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    if (data.status && data.status !== task.status) {
      await prisma.activityLog.create({
        data: {
          action: 'TASK_STATUS_CHANGED',
          entityType: 'TASK',
          entityId: task.id,
          userId,
          projectId,
          meta: { oldStatus: task.status, newStatus: data.status },
        },
      });
    }

    return updatedTask;
  }

  static async deleteTask(projectId: string, taskId: string) {
    await prisma.task.delete({ where: { id: taskId } });
    return true;
  }

  static async addComment(projectId: string, taskId: string, userId: string, data: CreateCommentInput) {
    return prisma.comment.create({
      data: {
        content: data.content,
        taskId,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  static async listComments(taskId: string) {
    return prisma.comment.findMany({
      where: { taskId },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
