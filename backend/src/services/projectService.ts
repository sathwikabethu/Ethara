import { PrismaClient, Role } from '@prisma/client';
import { CreateProjectInput, UpdateProjectInput } from '@ethara/shared';

const prisma = new PrismaClient();

export class ProjectService {
  static async listProjects(userId: string) {
    return prisma.project.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        _count: {
          select: { tasks: true, members: true },
        },
        members: {
          take: 5,
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createProject(userId: string, data: CreateProjectInput) {
    return prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: data.name,
          description: data.description,
          createdById: userId,
          members: {
            create: {
              userId,
              role: Role.ADMIN,
            },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          action: 'PROJECT_CREATED',
          entityType: 'PROJECT',
          entityId: project.id,
          userId,
          projectId: project.id,
          meta: { name: project.name },
        },
      });

      return project;
    });
  }

  static async getProjectDetails(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!project) throw new Error('Project not found');
    return project;
  }

  static async updateProject(projectId: string, userId: string, data: UpdateProjectInput) {
    const project = await prisma.project.update({
      where: { id: projectId },
      data,
    });

    await prisma.activityLog.create({
      data: {
        action: 'PROJECT_UPDATED',
        entityType: 'PROJECT',
        entityId: project.id,
        userId,
        projectId,
        meta: { fields: Object.keys(data) },
      },
    });

    return project;
  }

  static async deleteProject(projectId: string) {
    await prisma.project.delete({
      where: { id: projectId },
    });
    // Cascade deletes handle the rest
    return true;
  }

  static async addMember(projectId: string, adminId: string, email: string) {
    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) throw new Error('User not found');

    const existingMember = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: userToAdd.id, projectId } },
    });

    if (existingMember) throw new Error('User is already a member');

    const member = await prisma.projectMember.create({
      data: {
        userId: userToAdd.id,
        projectId,
        role: Role.MEMBER,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'MEMBER_ADDED',
        entityType: 'MEMBER',
        entityId: member.id,
        userId: adminId,
        projectId,
        meta: { addedUserId: userToAdd.id, addedUserEmail: userToAdd.email },
      },
    });

    return member;
  }

  static async removeMember(projectId: string, adminId: string, userIdToRemove: string) {
    if (adminId === userIdToRemove) {
      throw new Error('Cannot remove yourself');
    }

    const member = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: userIdToRemove, projectId } },
    });

    if (!member) throw new Error('Member not found');

    await prisma.projectMember.delete({
      where: { id: member.id },
    });

    await prisma.activityLog.create({
      data: {
        action: 'MEMBER_REMOVED',
        entityType: 'MEMBER',
        entityId: member.id,
        userId: adminId,
        projectId,
        meta: { removedUserId: userIdToRemove },
      },
    });

    return true;
  }
}
