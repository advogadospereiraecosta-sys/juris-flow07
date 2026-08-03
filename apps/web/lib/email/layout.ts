/**
 * Layout base para todos os e-mails do Juris-Flow.
 * HTML inline-friendly para compatibilidade máxima com clientes de e-mail.
 */
export function emailLayout({
  title,
  subtitle,
  content,
  actionUrl,
  actionLabel,
  footer,
}: {
  title: string;
  subtitle?: string;
  content: string;
  actionUrl?: string;
  actionLabel?: string;
  footer?: string;
}): string {
  const accent = '#4F46E5'; // vara-600
  const darkBg = '#0F172A'; // ink-950
  const cardBg = '#1E293B'; // ink-900
  const textMain = '#E2E8F0'; // ink-200
  const textMuted = '#94A3B8'; // ink-400

  const actionBtn = actionUrl && actionLabel ? `
    <tr>
      <td style="padding: 24px 0 0;">
        <a href="${actionUrl}" style="background-color: ${accent}; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
          ${actionLabel}
        </a>
      </td>
    </tr>
  ` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${darkBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${darkBg}; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">

          <!-- Logo -->
          <tr>
            <td style="padding: 0 0 24px; text-align: center;">
              <span style="font-size: 20px; font-weight: 700; color: ${textMain}; letter-spacing: -0.5px;">
                ⚖️ Juris<span style="color: ${accent};">Flow</span>
              </span>
            </td>
          </tr>

          <!-- Card principal -->
          <tr>
            <td style="background-color: ${cardBg}; border-radius: 12px; padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    ${subtitle ? `<p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: ${accent}; font-weight: 600;">${subtitle}</p>` : ''}
                    <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: ${textMain}; line-height: 1.3;">${title}</h1>
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: ${textMuted};">${content}</p>
                    ${actionBtn}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 0 0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: ${textMuted}; line-height: 1.6;">
                ${footer ?? `Você recebeu este e-mail porque tem uma conta no Juris-Flow.<br>Para alterar suas preferências, acesse <a href="#" style="color: ${accent};">Configurações de Notificação</a>.`}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
