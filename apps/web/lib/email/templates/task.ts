import { emailLayout } from '../layout';

export interface TaskAssignedData {
  recipientName: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate?: Date;
  assignedByName?: string;
  caseTitle?: string;
  appUrl: string;
}

export function taskAssignedEmail(data: TaskAssignedData): { subject: string; html: string } {
  const formattedDue = data.dueDate
    ? data.dueDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const caseSection = data.caseTitle
    ? `<p style="margin: 8px 0 0; font-size: 13px; color: #94A3B8;">📂 Processo: <strong>${data.caseTitle}</strong></p>`
    : '';

  const assignedBy = data.assignedByName
    ? `<p style="margin: 0 0 16px; font-size: 13px; color: #64748B;">Atribuída por <strong>${data.assignedByName}</strong></p>`
    : '';

  const subject = `📋 Nova tarefa atribuída: ${data.taskTitle}`;

  const content = `
    <p style="margin: 0 0 16px; font-size: 14px; color: #E2E8F0;">
      Olá, <strong>${data.recipientName}</strong>.
    </p>
    <p style="margin: 0 0 16px; font-size: 14px; color: #E2E8F0;">
      Uma nova tarefa foi atribuída a você:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F172A; border-radius: 8px; border-left: 4px solid #4F46E5; padding: 16px; margin: 16px 0;">
      <tr>
        <td style="padding: 12px 16px;">
          <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #F1F5F9;">${data.taskTitle}</p>
          ${data.taskDescription ? `<p style="margin: 0 0 8px; font-size: 13px; color: #94A3B8;">${data.taskDescription}</p>` : ''}
          ${assignedBy}
          ${formattedDue ? `<p style="margin: 0; font-size: 13px; color: #94A3B8;">📅 Vencimento: <strong>${formattedDue}</strong></p>` : ''}
          ${caseSection}
        </td>
      </tr>
    </table>
  `;

  const html = emailLayout({
    title: `Nova tarefa: ${data.taskTitle}`,
    subtitle: 'Tarefa atribuída',
    content,
    actionUrl: data.appUrl,
    actionLabel: 'Ver tarefa',
    footer: 'JurisFlow — Gestão Jurídica Inteligente · Você está recebendo este e-mail porque as notificações de tarefas estão ativas nas suas configurações.',
  });

  return { subject, html };
}
