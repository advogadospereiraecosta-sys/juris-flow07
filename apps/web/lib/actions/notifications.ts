'use server';

import { prisma } from '@juris-flow/db';
import { sendEmail, saveNotification } from '@/lib/email/sender';
import { deadlineReminderEmail } from '@/lib/email/templates/deadline';
import { taskAssignedEmail } from '@/lib/email/templates/task';
import { processStatusChangeEmail } from '@/lib/email/templates/process';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function runDeadlineReminders(): Promise<{
  sent: number;
  errors: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);

  let sent = 0;
  let errors = 0;

  // Busca movimentos fatais entre hoje e D+3
  const movements = await prisma.caseMovement.findMany({
    where: {
      tenantId: { not: '' }, // todos tenants
      isFatal: true,
      deadlineEndsAt: {
        gte: today,
        lte: in3Days,
      },
    },
    select: {
      id: true,
      tenantId: true,
      caseId: true,
      title: true,
      deadlineDays: true,
      deadlineEndsAt: true,
      deadlineKind: true,
      case: {
        select: {
          id: true,
          title: true,
          cnjNumber: true,
          tenantId: true,
        },
      },
    },
  });

  // Agrupa por tenant
  const byTenant = new Map<string, typeof movements>();
  for (const m of movements) {
    if (!m.deadlineEndsAt) continue;
    const list = byTenant.get(m.case.tenantId) ?? [];
    list.push(m);
    byTenant.set(m.case.tenantId, list);
  }

  for (const [tenantId, tenantMovements] of byTenant) {
    // Usuários do tenant com lembretes ativos
    const users = await prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        emailNotificationsEnabled: true,
        deadlineReminders: true,
      },
      select: { id: true, fullName: true, email: true },
    });
    if (users.length === 0) continue;

    for (const movement of tenantMovements) {
      if (!movement.deadlineEndsAt) continue;
      const dlDate = new Date(movement.deadlineEndsAt);
      const daysLeft = Math.round((dlDate.getTime() - today.getTime()) / 86400000);

      if (daysLeft < 0 || daysLeft > 3) continue;

      const notifType =
        daysLeft === 3 ? 'DEADLINE_3_DAYS' :
        daysLeft === 1 ? 'DEADLINE_1_DAY' : 'DEADLINE_TODAY';

      // Evitar duplicação
      const alreadySent = await prisma.notification.findFirst({
        where: {
          tenantId,
          type: notifType as any,
          resourceType: 'case_movement',
          resourceId: movement.id,
          sentAt: { gte: today },
        },
      });
      if (alreadySent) continue;

      const caseLabel = movement.case.cnjNumber
        ? `Processo ${movement.case.cnjNumber}`
        : movement.case.title;

      for (const user of users) {
        const { subject, html } = deadlineReminderEmail({
          recipientName: user.fullName,
          caseTitle: movement.case.title,
          deadlineDate: dlDate,
          daysLeft,
          deadlineDescription: `${caseLabel} — ${movement.title}`,
          appUrl: `${APP_URL}/processos/${movement.case.id}`,
        });

        const result = await sendEmail({ to: user.email, subject, html });
        await saveNotification({
          tenantId,
          userId: user.id,
          type: notifType,
          title: subject,
          body: movement.title,
          resourceType: 'case_movement',
          resourceId: movement.id,
          error: result.error,
          sentAt: result.success ? new Date() : undefined,
        });

        if (result.success) sent++;
        else errors++;
      }
    }
  }

  return { sent, errors };
}

export async function runTaskNotifications(): Promise<{ sent: number; errors: number }> {
  let sent = 0;
  let errors = 0;

  const yesterday = new Date(Date.now() - 86400000);
  yesterday.setHours(0, 0, 0, 0);

  const tasks = await prisma.task.findMany({
    where: {
      createdAt: { gte: yesterday },
      assignedToId: { not: null },
      status: 'TODO',
    },
    select: {
      id: true,
      tenantId: true,
      title: true,
      description: true,
      dueDate: true,
      createdById: true,
      assignedToId: true,
    },
  });

  const alreadySent = new Set(
    (
      await prisma.notification.findMany({
        where: {
          type: 'TASK_ASSIGNED',
          sentAt: { gte: yesterday },
          resourceType: 'task',
        },
        select: { resourceId: true },
      })
    ).map((n) => n.resourceId),
  );

  const tasksToNotify = tasks.filter((t) => !alreadySent.has(t.id));

  for (const task of tasksToNotify) {
    const [assignedUser, creator] = await Promise.all([
      prisma.user.findUnique({
        where: { id: task.assignedToId! },
        select: {
          id: true,
          fullName: true,
          email: true,
          emailNotificationsEnabled: true,
          taskNotifications: true,
        },
      }),
      task.createdById
        ? prisma.user.findUnique({ where: { id: task.createdById }, select: { fullName: true } })
        : null,
    ]);

    if (
      !assignedUser ||
      !assignedUser.emailNotificationsEnabled ||
      !assignedUser.taskNotifications
    ) {
      continue;
    }

    const { subject, html } = taskAssignedEmail({
      recipientName: assignedUser.fullName,
      taskTitle: task.title,
      taskDescription: task.description ?? undefined,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      assignedByName: creator?.fullName ?? undefined,
      appUrl: `${APP_URL}/tarefas`,
    });

    const result = await sendEmail({ to: assignedUser.email, subject, html });
    await saveNotification({
      tenantId: task.tenantId,
      userId: assignedUser.id,
      type: 'TASK_ASSIGNED',
      title: subject,
      body: task.title,
      resourceType: 'task',
      resourceId: task.id,
      error: result.error,
      sentAt: result.success ? new Date() : undefined,
    });

    if (result.success) sent++;
    else errors++;
  }

  return { sent, errors };
}

export async function getNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { sentAt: 'desc' },
    take: limit,
  });
}

export async function markNotificationRead(id: string, userId: string) {
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
}

export async function updateNotificationPreferences(
  userId: string,
  prefs: {
    emailNotificationsEnabled?: boolean;
    deadlineReminders?: boolean;
    taskNotifications?: boolean;
    processStatusChanges?: boolean;
  },
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailNotificationsEnabled: prefs.emailNotificationsEnabled,
      deadlineReminders: prefs.deadlineReminders,
      taskNotifications: prefs.taskNotifications,
      processStatusChanges: prefs.processStatusChanges,
    },
  });
}
