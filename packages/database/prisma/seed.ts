import { PrismaClient, WorkspacePlan, WorkspaceRole } from '../src';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding standard required rows...');

  // 1. Create a Default System User
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@cipta.local' },
    update: {},
    create: {
      email: 'system@cipta.local',
      passwordHash: 'dummy_hash', // Should be a valid hash in production
      displayName: 'System Admin',
    },
  });

  console.log(`Created system user: ${systemUser.id}`);

  // 2. Create a Default Workspace
  const defaultWorkspace = await prisma.workspace.upsert({
    where: { slug: 'system-workspace' },
    update: {},
    create: {
      name: 'System Workspace',
      slug: 'system-workspace',
      plan: WorkspacePlan.ENTERPRISE,
    },
  });

  console.log(`Created default workspace: ${defaultWorkspace.id}`);

  // 3. Attach User to Workspace
  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: systemUser.id,
        workspaceId: defaultWorkspace.id,
      },
    },
    update: {},
    create: {
      userId: systemUser.id,
      workspaceId: defaultWorkspace.id,
      role: WorkspaceRole.OWNER,
    },
  });

  console.log(`Attached system user to workspace with OWNER role.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed completed successfully.');
  })
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
