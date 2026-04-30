import { PrismaClient, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class DashboardService {
  static async getDashboardStats(userId: string) {
    const projectIds = (await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    })).map(p => p.projectId);

    // My tasks by status
    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      where: { assignedToId: userId, projectId: { in: projectIds } },
      _count: { id: true },
    });

    const statusCounts = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    tasksByStatus.forEach(t => {
      statusCounts[t.status] = t._count.id;
    });

    const now = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(now.getDate() + 7);

    // Overdue count
    const overdueCount = await prisma.task.count({
      where: {
        assignedToId: userId,
        projectId: { in: projectIds },
        status: { not: TaskStatus.DONE },
        dueDate: { lt: now },
      },
    });

    // Tasks due this week
    const tasksDueThisWeek = await prisma.task.findMany({
      where: {
        assignedToId: userId,
        projectId: { in: projectIds },
        status: { not: TaskStatus.DONE },
        dueDate: {
          gte: now,
          lte: oneWeekFromNow,
        },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Done this week (for stats)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    const doneThisWeekCount = await prisma.task.count({
      where: {
        assignedToId: userId,
        projectId: { in: projectIds },
        status: TaskStatus.DONE,
        updatedAt: { gte: oneWeekAgo },
      },
    });

    // Recent activity in projects the user is a part of
    const recentActivity = await prisma.activityLog.findMany({
      where: {
        projectId: { in: projectIds },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      statusCounts,
      overdueCount,
      doneThisWeekCount,
      tasksDueThisWeek,
      recentActivity,
    };
  }
}
