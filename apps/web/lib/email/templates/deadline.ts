import { emailLayout } from '../layout';

export interface DeadlineReminderData {
  recipientName: string;
  caseTitle: string;
  deadlineDate: Date;
  daysLeft: number;
  deadlineDescription: string;
  appUrl: string;
}

export function deadlineReminderEmail(data: DeadlineReminderData): { subject: string; html: string } {
  const urgencyColor = data.daysLeft <= 1 ? '#DC2626' : data.daysLeft <= 3 ? '#D97706' : '#4F46E5';
  const urgencyLabel = data.daysLeft <= 1
    ? `🔴 Vence ${data.daysLeft === 0 ? 'hoje' : 'amanhã'}!`
    : `🟡 Vence em ${data.daysLeft} dias`;

  const formattedDate = data.deadlineDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const subject = `⚠️ Prazo fatal: ${data.caseTitle} — ${data.daysLeft === 0 ? 'Vence hoje' : `Vence em ${data.daysLeft}d`}`;

  const content = `
    <p style="margin: 0 0 16px; font-size: 14px; color: #E2E8F0;">
      Olá, <strong>${data.recipientName}</strong>.
    </p>
    <p style="margin: 0 0 16px; font-size: 14px; color: #E2E8F0;">
      Identificamos um prazo importante no seu escritório:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F172A; border-radius: 8px; border-left: 4px solid ${urgencyColor}; padding: 16px; margin: 16px 0;">
      <tr>
        <td style="padding: 12px 16px;">
          <p style="margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: ${urgencyColor}; font-weight: 700;">${urgencyLabel}</p>
          <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #F1F5F9;">${data.caseTitle}</p>
          <p style="margin: 0; font-size: 13px; color: #94A3B8;">${data.deadlineDescription}</p>
          <p style="margin: 8px 0 0; font-size: 13px; color: #94A3B8;">📅 <strong>${formattedDate}</strong></p>
        </td>
      </tr>
    </table>
    <p style="margin: 0; font-size: 13px; color: #64748B;">
      Não deixe para a última hora. Acesse o processo para verificar os detalhes e tomar as providências cabíveis.
    </p>
  `;

  const html = emailLayout({
    title: `Prazo fatal: ${data.caseTitle}`,
    subtitle: 'Lembrete de prazo',
    content,
    actionUrl: data.appUrl,
    actionLabel: 'Ver processo',
    footer: 'JurisFlow — Gestão Jurídica Inteligente · Você está recebendo este e-mail porque atendeu os lembretes de prazo nas suas configurações.',
  });

  return { subject, html };
}
