import { Resend } from 'resend';
import { prisma, type NotificationChannel } from '@juris-flow/db';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? 'Juris-Flow <noreply@juris-flow.com.br>';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  // Sem API key configurada — loga e sai (dev/staging)
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY não configurado. Email ignorado para ${to}: "${subject}"`);
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[email] Erro ao enviar:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    console.error('[email] Exceção ao enviar:', e);
    return { success: false, error: 'Erro interno ao enviar e-mail' };
  }
}

export async function saveNotification(params: {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  channel?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  error?: string;
  sentAt?: Date;
}) {
  try {
    await prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        type: params.type as Parameters<typeof prisma.notification.create>[0]['data']['type'],
        channel: (params.channel ?? 'EMAIL') as NotificationChannel,
        title: params.title,
        body: params.body,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        metadata: (params.metadata ?? null) as Parameters<typeof prisma.notification.create>[0]['data']['metadata'],
        error: params.error,
        sentAt: params.sentAt,
        readAt: undefined,
      },
    });
  } catch (e) {
    console.error('[saveNotification] Erro ao salvar:', e);
  }
}
