import { emailLayout } from '../layout';

export interface ProcessStatusChangeData {
  recipientName: string;
  caseTitle: string;
  oldStatus: string;
  newStatus: string;
  changedByName?: string;
  appUrl: string;
}

export function processStatusChangeEmail(data: ProcessStatusChangeData): { subject: string; html: string } {
  const subject = `⚖️ Processo atualizado: ${data.caseTitle}`;

  const content = `
    <p style="margin: 0 0 16px; font-size: 14px; color: #E2E8F0;">
      Olá, <strong>${data.recipientName}</strong>.
    </p>
    <p style="margin: 0 0 16px; font-size: 14px; color: #E2E8F0;">
      O status de um processo do seu escritório foi atualizado:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F172A; border-radius: 8px; border-left: 4px solid #4F46E5; padding: 16px; margin: 16px 0;">
      <tr>
        <td style="padding: 12px 16px;">
          <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #F1F5F9;">${data.caseTitle}</p>
          <p style="margin: 0; font-size: 13px; color: #94A3B8;">
            Status: <strong style="color: #94A3B8; text-decoration: line-through;">${data.oldStatus}</strong>
            &nbsp;→&nbsp;
            <strong style="color: #4F46E5;">${data.newStatus}</strong>
          </p>
          ${data.changedByName ? `<p style="margin: 8px 0 0; font-size: 12px; color: #64748B;">Atualizado por ${data.changedByName}</p>` : ''}
        </td>
      </tr>
    </table>
  `;

  const html = emailLayout({
    title: `Processo atualizado: ${data.caseTitle}`,
    subtitle: 'Atualização de processo',
    content,
    actionUrl: data.appUrl,
    actionLabel: 'Ver processo',
    footer: 'JurisFlow — Gestão Jurídica Inteligente · Você está recebendo este e-mail porque as notificações de processos estão ativas nas suas configurações.',
  });

  return { subject, html };
}
