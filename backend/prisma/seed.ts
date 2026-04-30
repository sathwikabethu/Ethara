import { PrismaClient, TaskStatus, TaskPriority, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Clean up existing data if needed (cascade will handle relations)
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('Demo@1234', 12);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@demo.com',
      passwordHash,
    },
  });

  const member = await prisma.user.create({
    data: {
      name: 'Member User',
      email: 'member@demo.com',
      passwordHash,
    },
  });

  // 2. Create Project
  const project = await prisma.project.create({
    data: {
      name: 'Acme Onboarding',
      description: 'Onboarding process for new Acme Corp employees.',
      createdById: admin.id,
      members: {
        create: [
          { userId: admin.id, role: Role.ADMIN },
          { userId: member.id, role: Role.MEMBER },
        ],
      },
    },
  });

  // 3. Create Tasks
  const tasksData = [
    {
      title: 'Set up corporate email',
      description: 'Create email account and setup forwarding.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      projectId: project.id,
      createdById: admin.id,
      assignedToId: admin.id,
      dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
    {
      title: 'Sign NDA',
      description: 'Please review and sign the non-disclosure agreement.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.URGENT,
      projectId: project.id,
      createdById: admin.id,
      assignedToId: member.id,
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (overdue)
    },
    {
      title: 'Order laptop',
      description: 'Order standard issue MacBook Pro 14".',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      projectId: project.id,
      createdById: admin.id,
      assignedToId: admin.id,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    },
    {
      title: 'Complete security training',
      description: 'Watch the mandatory security awareness video.',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      projectId: project.id,
      createdById: admin.id,
      assignedToId: member.id,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    },
    {
      title: 'Introduce to team',
      description: 'Schedule a brief intro meeting with the engineering team.',
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      projectId: project.id,
      createdById: admin.id,
      assignedToId: admin.id,
      dueDate: null,
    },
    {
      title: 'Set up development environment',
      description: 'Install Node, Docker, and IDE extensions.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      projectId: project.id,
      createdById: admin.id,
      assignedToId: member.id,
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
    },
    {
      title: 'Review architecture docs',
      description: 'Read the system design document.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      projectId: project.id,
      createdById: admin.id,
      assignedToId: member.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
    {
      title: 'First PR review',
      description: 'Review a simple PR to get familiar with the process.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      projectId: project.id,
      createdById: admin.id,
      assignedToId: member.id,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    },
  ];

  await prisma.task.createMany({
    data: tasksData,
  });

  console.log('Seeding complete!');
  console.log(`Admin user: ${admin.email}`);
  console.log(`Member user: ${member.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
